import { GameState, Player } from "#shared/types/GameState";

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_SIZE = 6;

const rooms = new Map<string, GameState>();

export function newRoomId(): string {
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

export function initNewRoom(roomId: string, player: Player) {
    const gameState: GameState = {
        id: roomId,
        players: [player],
    };
    rooms.set(roomId, gameState);
    return gameState;
}

export function getRoom(roomId: string): GameState | undefined {
    return rooms.get(roomId);
}

export function closeRoom(roomId: string) {
    rooms.delete(roomId);
}
