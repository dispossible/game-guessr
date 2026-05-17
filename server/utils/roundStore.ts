import type { Game } from "#shared/types/Game";
import type { Difficulty, Round } from "#shared/types/GameState";
import { GameStatus, RoundStatus } from "#shared/types/GameState";
import { MessageType } from "#shared/types/Message";
import { Peer } from "crossws";
import { getRoomGameState, broadcastToRoom, getClientIdForPeer, registerRoomDeletedCallback } from "./roomStore";
import { pickRandomGame } from "./gameStore";
import { getSteamGameDetails, getScreenshots } from "./steamApi";

registerRoomDeletedCallback((roomId) => {
    clearRoomTimers(roomId);
    usedAppIds.delete(roomId);
    activeGame.delete(roomId);
});

const ROUND_START_DELAY_MS = 5_000;

// pending timers per room — cleared when the room is deleted
const roomTimers = new Map<string, NodeJS.Timeout[]>();

// Per-room set of all appIds ever picked — prevents repeats across rounds and matches
const usedAppIds = new Map<string, Set<number>>();

// Per-room current answer — replaced at each round start, used for guess validation
const activeGame = new Map<string, Game>();

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

export function getActiveGame(roomId: string): Game | undefined {
    return activeGame.get(roomId);
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

async function pickGameWithScreenshots(
    roomId: string,
    difficulty?: Difficulty,
): Promise<{ game: Game; screenshots: string[] } | null> {
    const excluded = usedAppIds.get(roomId) ?? new Set<number>();

    for (let attempt = 0; attempt < 2; attempt++) {
        const game = pickRandomGame(excluded, difficulty);
        if (!game) return null;

        const details = await getSteamGameDetails(game.appId);
        if (!details) {
            // Temporarily exclude this game for the retry so we don't re-try the same appId
            excluded.add(game.appId);
            continue;
        }

        return { game, screenshots: getScreenshots(details) };
    }

    return null;
}

interface RoundSettings {
    roundCount?: number;
    roundDuration?: number;
    difficulty?: Difficulty;
}

export async function startRound(peer: Peer, roomId: string, settings: RoundSettings = {}) {
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
        if (settings.difficulty !== undefined) gameState.difficulty = settings.difficulty;
        gameState.status = GameStatus.playing;
    }

    const result = await pickGameWithScreenshots(roomId, gameState.difficulty);
    if (!result) {
        console.error(`[roundStore] Could not find a game with screenshots for room ${roomId} — aborting round start.`);
        return;
    }

    const { game, screenshots } = result;

    // Record this game as used for this room
    const used = usedAppIds.get(roomId) ?? new Set<number>();
    used.add(game.appId);
    usedAppIds.set(roomId, used);

    // Track as the active answer for this room
    activeGame.set(roomId, game);

    const now = Date.now();
    const round: Round = {
        number: gameState.rounds.length + 1,
        status: RoundStatus.pending,
        startTime: now + ROUND_START_DELAY_MS,
        endTime: now + ROUND_START_DELAY_MS + gameState.roundDuration,
        screenshots: screenshots.slice(0, 10), // We only show a maximum of 10 screenshots
        guesses: [],
    };

    gameState.rounds.push(round);
    scheduleRoundTimers(roomId, round);

    broadcastToRoom(roomId, { type: MessageType.gameState, gameState });
}
