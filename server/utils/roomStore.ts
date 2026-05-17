import type { GameState, Player } from "#shared/types/GameState";
import { GameStatus } from "#shared/types/GameState";
import { type Message, MessageType } from "#shared/types/Message";
import { Peer } from "crossws";
import { sendMessage, publishMessage } from "./message";
import { generateRandomId } from "#shared/utils/randomId";

const ID_SIZE = 6;

// How long an abandoned room (all peers disconnected) sticks around so players
// who closed their tab / refreshed can still reconnect with the same clientId
// and keep their score.
const ABANDONED_ROOM_GRACE_MS = 60_000;

const rooms = new Map<string, GameState>(); // roomId -> gameState
const clientsInRooms = new Map<string, string>(); // clientId -> roomId
const peersToClients = new Map<string, string>(); // peer.id -> clientId
const peers = new Map<string, Peer>(); // peer.id -> Peer
const abandonedRoomTimers = new Map<string, NodeJS.Timeout>(); // roomId -> cleanup timer

// Registered by roundStore to avoid a circular import. Called whenever a room
// is hard-deleted so any pending round timers are cancelled.
let onRoomDeleted: ((roomId: string) => void) | null = null;
export function registerRoomDeletedCallback(cb: (roomId: string) => void) {
    onRoomDeleted = cb;
}

export function generateRoomId(): string {
    // Keep generating until we find one not in the Map
    while (true) {
        const result = generateRandomId(ID_SIZE);
        if (!rooms.has(result)) {
            return result;
        }
    }
}

function countConnectedPlayersInRoom(roomId: string): number {
    const gameState = rooms.get(roomId);
    if (!gameState) return 0;
    const onlineClientIds = new Set(peersToClients.values());
    let count = 0;
    for (const player of gameState.players) {
        if (onlineClientIds.has(player.id)) count++;
    }
    return count;
}

function cancelAbandonedRoomCleanup(roomId: string) {
    const timer = abandonedRoomTimers.get(roomId);
    if (!timer) return;
    clearTimeout(timer);
    abandonedRoomTimers.delete(roomId);
}

function deleteRoom(roomId: string) {
    const gameState = rooms.get(roomId);
    if (gameState) {
        // Drop any lingering clientId -> roomId mappings for players in this room
        // (they are all offline at this point; their peers were already cleared).
        for (const player of gameState.players) {
            if (clientsInRooms.get(player.id) === roomId) {
                clientsInRooms.delete(player.id);
            }
        }
    }
    onRoomDeleted?.(roomId);
    rooms.delete(roomId);
    cancelAbandonedRoomCleanup(roomId);
}

function scheduleAbandonedRoomCleanupIfEmpty(roomId: string) {
    if (!rooms.has(roomId)) return;
    if (abandonedRoomTimers.has(roomId)) return;
    if (countConnectedPlayersInRoom(roomId) > 0) return;

    const timer = setTimeout(() => {
        abandonedRoomTimers.delete(roomId);
        // Re-check on fire in case someone reconnected just before the timer ran.
        if (countConnectedPlayersInRoom(roomId) > 0) return;
        if (!rooms.has(roomId)) return;
        console.log(`[rooms] Cleaning up abandoned room: ${roomId}`);
        deleteRoom(roomId);
    }, ABANDONED_ROOM_GRACE_MS);
    // Don't keep the Node process alive solely because of pending room cleanups.
    timer.unref?.();
    abandonedRoomTimers.set(roomId, timer);
}

function attachPeer(peer: Peer, clientId: string, roomId: string) {
    peersToClients.set(peer.id, clientId);
    peers.set(peer.id, peer);
    clientsInRooms.set(clientId, roomId);
    peer.subscribe(roomId);
    // Someone is live in this room again — abort any pending cleanup.
    cancelAbandonedRoomCleanup(roomId);
}

function removeClientFromRoom(clientId: string, peer: Peer) {
    const roomId = clientsInRooms.get(clientId);
    if (!roomId) return;

    const gameState = getRoomGameState(roomId);
    if (!gameState) {
        clientsInRooms.delete(clientId);
        return;
    }

    gameState.players = gameState.players.filter((player) => player.id !== clientId);

    // If the host left, hand the role to whoever is next in the player list.
    // If the room is now empty it will be torn down below, so no host needed.
    const nextHost = gameState.players[0];
    if (gameState.hostId === clientId && nextHost) {
        gameState.hostId = nextHost.id;
    }

    peer.unsubscribe(roomId);

    publishMessage(peer, roomId, {
        type: MessageType.leftRoom,
        userId: clientId,
        roomId,
        hostId: gameState.hostId,
    });

    clientsInRooms.delete(clientId);

    if (gameState.players.length === 0) {
        deleteRoom(roomId);
    } else {
        // Players remain on the roster, but if none of them currently have a
        // live peer, start the abandoned-room cleanup grace timer.
        scheduleAbandonedRoomCleanupIfEmpty(roomId);
    }
}

export function initNewRoom(peer: Peer, playerName: string, clientId: string) {
    // If this client was already in another room, remove them from it first
    removeClientFromRoom(clientId, peer);

    const player: Player = {
        id: clientId,
        name: playerName,
        score: 0,
    };

    const roomId = generateRoomId();
    const gameState: GameState = {
        id: roomId,
        hostId: clientId,
        players: [player],
        status: GameStatus.lobby,
        roundCount: 5,
        roundDuration: 60000,
        rounds: [],
    };
    rooms.set(roomId, gameState);
    attachPeer(peer, clientId, roomId);

    // Notify the client that the room was created
    sendMessage(peer, {
        type: MessageType.gameState,
        gameState,
    });
}

export function getRoomGameState(roomId: string): GameState | undefined {
    return rooms.get(roomId);
}

export function getClientIdForPeer(peer: Peer): string | undefined {
    return peersToClients.get(peer.id);
}

// Sends a message to every currently-connected peer in the room. Used by
// timer-driven events (round transitions) where there is no incoming peer.
export function broadcastToRoom(roomId: string, message: Message) {
    const payload = JSON.stringify(message);
    for (const [peerId, clientId] of peersToClients) {
        if (clientsInRooms.get(clientId) !== roomId) continue;
        const peer = peers.get(peerId);
        peer?.send(payload);
    }
}

// Called when a client explicitly leaves the room. Removes the player and
// notifies the rest of the room.
export function leaveRoom(peer: Peer) {
    const clientId = peersToClients.get(peer.id);
    if (!clientId) return;
    removeClientFromRoom(clientId, peer);
}

// Called when a peer's websocket closes (refresh, tab close, network blip).
// We deliberately keep the player in the room so they can rejoin with the
// same clientId and keep their score. We just detach the peer mapping — and
// if that leaves the room with nobody live, start the abandoned-room grace
// timer so an entirely empty room eventually gets cleaned up.
export function handlePeerClose(peer: Peer) {
    const clientId = peersToClients.get(peer.id);
    peersToClients.delete(peer.id);
    peers.delete(peer.id);

    if (!clientId) return;
    const roomId = clientsInRooms.get(clientId);
    if (!roomId) return;

    scheduleAbandonedRoomCleanupIfEmpty(roomId);
}

export function joinRoom(peer: Peer, roomId: string, playerName: string, clientId: string) {
    const gameState = getRoomGameState(roomId);
    if (!gameState) {
        sendMessage(peer, {
            type: MessageType.failedToJoinRoom,
            roomId,
        });
        return;
    }

    // If the client was previously in a different room, leave it first
    const previousRoomId = clientsInRooms.get(clientId);
    if (previousRoomId && previousRoomId !== roomId) {
        removeClientFromRoom(clientId, peer);
    }

    attachPeer(peer, clientId, roomId);

    const existingPlayer = gameState.players.find((p) => p.id === clientId);
    if (existingPlayer) {
        // Reconnect: keep the existing score, update the display name in case
        // it changed, and don't broadcast a joinedRoom since the others never
        // saw them leave.
        existingPlayer.name = playerName;
        sendMessage(peer, {
            type: MessageType.gameState,
            gameState,
        });
        return;
    }

    const player: Player = {
        id: clientId,
        name: playerName,
        score: 0,
    };
    gameState.players.push(player);

    // Notify the others in the room that someone joined
    publishMessage(peer, roomId, {
        type: MessageType.joinedRoom,
        roomId,
        player,
    });

    // Notify the client that they've joined the room
    sendMessage(peer, {
        type: MessageType.gameState,
        gameState,
    });
}
