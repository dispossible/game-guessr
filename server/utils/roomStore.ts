import type { GameState, Player } from "#shared/types/GameState";
import { MessageType } from "#shared/types/Message";
import { Peer } from "crossws";
import { sendMessage, publishMessage } from "./message";

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_SIZE = 6;

const rooms = new Map<string, GameState>(); // roomId -> gameState
const usersInRooms = new Map<string, string>(); // userId -> roomId

export function generateRoomId(): string {
    let result = "";

    // Keep generating until we find one not in the Map
    while (true) {
        result = "";
        for (let i = 0; i < ID_SIZE; i++) {
            result += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
        }

        if (!rooms.has(result)) {
            return result;
        }
    }
}

export function initNewRoom(peer: Peer, playerName: string) {
    leaveRoom(peer); // Make sure they're not in a room already

    const player: Player = {
        id: peer.id,
        name: playerName,
        score: 0,
    };

    const roomId = generateRoomId();
    const gameState: GameState = {
        id: roomId,
        players: [player],
    };
    rooms.set(roomId, gameState);
    usersInRooms.set(peer.id, roomId);
    peer.subscribe(roomId);

    // Notify the client that the room was created
    sendMessage(peer, {
        type: MessageType.gameState,
        gameState,
    });
}

export function getRoomGameState(roomId: string): GameState | undefined {
    return rooms.get(roomId);
}

export function leaveRoom(peer: Peer) {
    const roomId = usersInRooms.get(peer.id);
    if (!roomId) {
        return;
    }

    const gameState = getRoomGameState(roomId);
    if (!gameState) {
        return;
    }

    gameState.players = gameState.players.filter((player) => player.id !== peer.id);

    publishMessage(peer, roomId, {
        type: MessageType.leftRoom,
        userId: peer.id,
        roomId,
    });

    peer.unsubscribe(roomId);
    usersInRooms.delete(peer.id);

    if (gameState.players.length === 0) {
        rooms.delete(roomId);
    }
}

export function joinRoom(peer: Peer, roomId: string, playerName: string) {
    leaveRoom(peer); // Make sure they're not in a room already

    const player: Player = {
        id: peer.id,
        name: playerName,
        score: 0,
    };

    const gameState = getRoomGameState(roomId);
    if (!gameState) {
        sendMessage(peer, {
            type: MessageType.failedToJoinRoom,
            roomId,
        });
        return;
    }

    gameState.players.push(player);
    usersInRooms.set(peer.id, roomId);
    peer.subscribe(roomId);

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
