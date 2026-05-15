import type { GameState, Player } from "#shared/types/GameState";
import { MessageType } from "#shared/types/Message";
import { Peer } from "crossws";
import { sendMessage, publishMessage } from "./message";
import { generateRandomId } from "#shared/utils/randomId";

const ID_SIZE = 6;

const rooms = new Map<string, GameState>(); // roomId -> gameState
const clientsInRooms = new Map<string, string>(); // clientId -> roomId
const peersToClients = new Map<string, string>(); // peer.id -> clientId

export function generateRoomId(): string {
    // Keep generating until we find one not in the Map
    while (true) {
        const result = generateRandomId(ID_SIZE);
        if (!rooms.has(result)) {
            return result;
        }
    }
}

function attachPeer(peer: Peer, clientId: string, roomId: string) {
    peersToClients.set(peer.id, clientId);
    clientsInRooms.set(clientId, roomId);
    peer.subscribe(roomId);
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

    peer.unsubscribe(roomId);

    publishMessage(peer, roomId, {
        type: MessageType.leftRoom,
        userId: clientId,
        roomId,
    });

    clientsInRooms.delete(clientId);

    if (gameState.players.length === 0) {
        rooms.delete(roomId);
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
        players: [player],
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

// Called when a client explicitly leaves the room. Removes the player and
// notifies the rest of the room.
export function leaveRoom(peer: Peer) {
    const clientId = peersToClients.get(peer.id);
    if (!clientId) return;
    removeClientFromRoom(clientId, peer);
}

// Called when a peer's websocket closes (refresh, tab close, network blip).
// We deliberately keep the player in the room so they can rejoin with the
// same clientId and keep their score. We just detach the peer mapping.
export function handlePeerClose(peer: Peer) {
    peersToClients.delete(peer.id);
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
