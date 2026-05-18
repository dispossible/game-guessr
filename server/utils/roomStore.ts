import type { GameState, Player } from "#shared/types/GameState";
import { GameStatus } from "#shared/types/GameState";
import { type Message, MessageType } from "#shared/types/Message";
import { Peer } from "crossws";
import { sendMessage, publishMessage } from "./message";
import { generateRandomId } from "#shared/utils/randomId";

const ID_SIZE = 6;

// How long a disconnected client is kept on the room roster so a refresh or
// brief network blip can reattach with the same clientId and keep their
// score. Once this elapses the player is removed from the room, and if they
// were the last one the room itself is torn down.
const DISCONNECT_TIMEOUT_MS = 60_000;

const rooms = new Map<string, GameState>(); // roomId -> gameState
const clientsInRooms = new Map<string, string>(); // clientId -> roomId
const peersToClients = new Map<string, string>(); // peer.id -> clientId
const peers = new Map<string, Peer>(); // peer.id -> Peer
const disconnectedClientTimers = new Map<string, NodeJS.Timeout>(); // clientId -> removal timer

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

function isClientConnected(clientId: string): boolean {
    for (const cid of peersToClients.values()) {
        if (cid === clientId) return true;
    }
    return false;
}

function cancelDisconnectTimeout(clientId: string) {
    const timer = disconnectedClientTimers.get(clientId);
    if (!timer) return;
    clearTimeout(timer);
    disconnectedClientTimers.delete(clientId);
}

function scheduleDisconnectTimeout(clientId: string) {
    cancelDisconnectTimeout(clientId);

    const timer = setTimeout(() => {
        disconnectedClientTimers.delete(clientId);
        // Re-check on fire in case the client reconnected just before the timer ran.
        if (isClientConnected(clientId)) return;
        const roomId = clientsInRooms.get(clientId);
        if (!roomId) return;
        console.log(`[rooms] Disconnect timeout for ${clientId} in room ${roomId}`);
        removeDisconnectedClient(clientId);
    }, DISCONNECT_TIMEOUT_MS);
    // Don't keep the Node process alive solely because of pending removals.
    timer.unref?.();
    disconnectedClientTimers.set(clientId, timer);
}

function deleteRoom(roomId: string) {
    const gameState = rooms.get(roomId);
    if (gameState) {
        // Drop any lingering clientId -> roomId mappings and pending removal
        // timers for players in this room.
        for (const player of gameState.players) {
            cancelDisconnectTimeout(player.id);
            if (clientsInRooms.get(player.id) === roomId) {
                clientsInRooms.delete(player.id);
            }
        }
    }
    onRoomDeleted?.(roomId);
    rooms.delete(roomId);
}

// Drop a player from the room's roster and, if they were the host, hand the
// role to whoever's next in the list.
function detachPlayer(gameState: GameState, clientId: string) {
    gameState.players = gameState.players.filter((player) => player.id !== clientId);

    // If the host left, hand the role to whoever is next in the player list.
    // If the room is now empty it will be torn down by the caller, so no host needed.
    const nextHost = gameState.players[0];
    if (gameState.hostId === clientId && nextHost) {
        gameState.hostId = nextHost.id;
    }
}

// Called when a disconnected client's grace timer fires without them having
// reconnected. Removes the player and tears down the room if they were the
// last one in it.
function removeDisconnectedClient(clientId: string) {
    const roomId = clientsInRooms.get(clientId);
    if (!roomId) return;

    const gameState = getRoomGameState(roomId);
    if (!gameState) {
        clientsInRooms.delete(clientId);
        return;
    }

    detachPlayer(gameState, clientId);
    clientsInRooms.delete(clientId);

    if (gameState.players.length === 0) {
        deleteRoom(roomId);
        return;
    }

    broadcastToRoom(roomId, {
        type: MessageType.leftRoom,
        userId: clientId,
        roomId,
        hostId: gameState.hostId,
    });
}

function attachPeer(peer: Peer, clientId: string, roomId: string) {
    peersToClients.set(peer.id, clientId);
    peers.set(peer.id, peer);
    clientsInRooms.set(clientId, roomId);
    peer.subscribe(roomId);
    // They're back — abort any pending disconnect-timeout removal.
    cancelDisconnectTimeout(clientId);
}

function removeClientFromRoom(clientId: string, peer: Peer) {
    cancelDisconnectTimeout(clientId);

    const roomId = clientsInRooms.get(clientId);
    if (!roomId) return;

    const gameState = getRoomGameState(roomId);
    if (!gameState) {
        clientsInRooms.delete(clientId);
        return;
    }

    detachPlayer(gameState, clientId);

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
        difficulty: Difficulty.easy,
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
// same clientId and keep their score, but we start a per-client grace timer
// — if they don't reconnect before it fires, they're removed from the room
// (and the room itself is torn down when the last player is removed).
export function handlePeerClose(peer: Peer) {
    const clientId = peersToClients.get(peer.id);
    peersToClients.delete(peer.id);
    peers.delete(peer.id);

    if (!clientId) return;
    if (!clientsInRooms.has(clientId)) return;
    // If this client still has another peer connected (e.g. a second tab),
    // they're not really disconnected — leave them alone.
    if (isClientConnected(clientId)) return;

    scheduleDisconnectTimeout(clientId);
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
