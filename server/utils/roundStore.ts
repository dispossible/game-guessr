import type { Round } from "#shared/types/GameState";
import { GameStatus, RoundStatus } from "#shared/types/GameState";
import { MessageType } from "#shared/types/Message";
import { Peer } from "crossws";
import { getRoomGameState, broadcastToRoom, getClientIdForPeer, registerRoomDeletedCallback } from "./roomStore";

registerRoomDeletedCallback((roomId) => clearRoomTimers(roomId));

const ROUND_START_DELAY_MS = 5_000;

// pending timers per room — cleared when the room is deleted
const roomTimers = new Map<string, NodeJS.Timeout[]>();

function addTimer(roomId: string, timer: NodeJS.Timeout) {
    const list = roomTimers.get(roomId) ?? [];
    list.push(timer);
    roomTimers.set(roomId, list);
}

export function clearRoomTimers(roomId: string) {
    const timers = roomTimers.get(roomId);
    if (!timers) return;
    for (const t of timers) clearTimeout(t);
    roomTimers.delete(roomId);
}

function scheduleRoundTimers(roomId: string, round: Round) {
    const gameState = getRoomGameState(roomId);
    if (!gameState) return;

    const startTimer = setTimeout(() => {
        round.status = RoundStatus.inProgress;
        broadcastToRoom(roomId, { type: MessageType.gameState, gameState });
    }, ROUND_START_DELAY_MS);
    startTimer.unref?.();
    addTimer(roomId, startTimer);

    const endTimer = setTimeout(() => {
        round.status = RoundStatus.completed;
        if (gameState.rounds.length === gameState.roundCount) {
            gameState.status = GameStatus.finished;
        }
        broadcastToRoom(roomId, { type: MessageType.gameState, gameState });
    }, ROUND_START_DELAY_MS + gameState.roundDuration);
    endTimer.unref?.();
    addTimer(roomId, endTimer);
}

interface RoundSettings {
    roundCount?: number;
    roundDuration?: number;
}

export function startRound(peer: Peer, roomId: string, settings: RoundSettings = {}) {
    const clientId = getClientIdForPeer(peer);
    if (!clientId) return;

    const gameState = getRoomGameState(roomId);
    if (!gameState) return;

    const isPlayerInRoom = gameState.players.some((p) => p.id === clientId);
    if (!isPlayerInRoom) return;

    // Only the host is allowed to start (or advance to) rounds.
    if (gameState.hostId !== clientId) return;

    const lastRound = gameState.rounds.at(-1);

    const isFirstRound = gameState.status === GameStatus.lobby && gameState.rounds.length === 0;
    const isNextRound =
        gameState.status === GameStatus.playing &&
        lastRound?.status === RoundStatus.completed &&
        gameState.rounds.length < gameState.roundCount;

    if (!isFirstRound && !isNextRound) return;

    if (isFirstRound) {
        // Apply host-provided settings before transitioning out of the lobby
        if (settings.roundCount !== undefined) gameState.roundCount = settings.roundCount;
        if (settings.roundDuration !== undefined) gameState.roundDuration = settings.roundDuration;
        gameState.status = GameStatus.playing;
    }

    const now = Date.now();
    const round: Round = {
        number: gameState.rounds.length + 1,
        status: RoundStatus.pending,
        startTime: now + ROUND_START_DELAY_MS,
        endTime: now + ROUND_START_DELAY_MS + gameState.roundDuration,
        guesses: [],
    };

    gameState.rounds.push(round);
    scheduleRoundTimers(roomId, round);

    broadcastToRoom(roomId, { type: MessageType.gameState, gameState });
}
