import type { Difficulty, GameState, Round } from "#shared/types/GameState";
import { GameStatus, RoundStatus } from "#shared/types/GameState";
import { MessageType } from "#shared/types/Message";
import { Peer } from "crossws";
import { getRoomGameState, broadcastToRoom, getClientIdForPeer, registerRoomDeletedCallback } from "./roomStore";
import { sendMessage } from "./message";
import { pickRandomGame } from "./gameStore";
import { getSteamGameDetails, getScreenshots, type SteamGameDetails } from "./steamApi";

registerRoomDeletedCallback((roomId) => {
    clearRoomTimers(roomId);
    usedAppIds.delete(roomId);
    activeGame.delete(roomId);
});

const MIN_SCORE = 1;
const MAX_SCORE = 100;

const ROUND_START_DELAY_MS = 5_000;

// pending timers per room — cleared when the room is deleted
const roomTimers = new Map<string, NodeJS.Timeout[]>();

// Per-room set of all appIds ever picked — prevents repeats across rounds and matches
const usedAppIds = new Map<string, Set<number>>();

// Per-room Steam details for the current round's game — used for guess validation and reveal
const activeGame = new Map<string, SteamGameDetails>();

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

export function getActiveGame(roomId: string): SteamGameDetails | undefined {
    return activeGame.get(roomId);
}

function completeRound(roomId: string, gameState: GameState, round: Round) {
    if (round.status === RoundStatus.completed) return;

    round.status = RoundStatus.completed;

    const details = activeGame.get(roomId);
    if (details) {
        round.gameName = details.name;
        round.headerImage = details.header_image;
    }

    if (gameState.rounds.length === gameState.roundCount) {
        gameState.status = GameStatus.finished;
    }

    // Cancel all pending round timers (start + end) so the end timer doesn't fire again
    clearRoomTimers(roomId);

    broadcastToRoom(roomId, { type: MessageType.gameState, gameState });
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
        completeRound(roomId, gameState, round);
    }, ROUND_START_DELAY_MS + gameState.roundDuration);
    endTimer.unref?.();
    addTimer(roomId, endTimer);
}

async function pickGame(
    roomId: string,
    difficulty?: Difficulty,
): Promise<{ appId: number; details: SteamGameDetails } | null> {
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

        return { appId: game.appId, details };
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

    const result = await pickGame(roomId, gameState.difficulty);
    if (!result) {
        console.error(`[roundStore] Could not find a game with screenshots for room ${roomId} — aborting round start.`);
        return;
    }

    const { appId, details } = result;

    // Record this game as used for this room
    const used = usedAppIds.get(roomId) ?? new Set<number>();
    used.add(appId);
    usedAppIds.set(roomId, used);

    // Track Steam details as the active answer for this room
    activeGame.set(roomId, details);

    const now = Date.now();
    const round: Round = {
        number: gameState.rounds.length + 1,
        status: RoundStatus.pending,
        startTime: now + ROUND_START_DELAY_MS,
        endTime: now + ROUND_START_DELAY_MS + gameState.roundDuration,
        screenshots: getScreenshots(details).slice(0, 10), // We only show a maximum of 10 screenshots
        guesses: [],
    };

    gameState.rounds.push(round);
    scheduleRoundTimers(roomId, round);

    broadcastToRoom(roomId, { type: MessageType.gameState, gameState });
}

export function submitGuess(peer: Peer, roomId: string, appId: number) {
    const clientId = getClientIdForPeer(peer);
    if (!clientId) return;

    const gameState = getRoomGameState(roomId);
    if (!gameState) return;

    const round = gameState.rounds.at(-1);
    if (!round || round.status !== RoundStatus.inProgress) return;

    // Idempotent — ignore if the player already guessed correctly this round
    if (round.guesses.some((g) => g.playerId === clientId && g.correct)) return;

    const details = activeGame.get(roomId);
    const correct = details !== undefined && appId === details.steam_appid;

    const fraction = (Date.now() - round.startTime) / (round.endTime - round.startTime);
    const score = correct
        ? Math.max(MIN_SCORE, Math.round(MAX_SCORE - (MAX_SCORE - MIN_SCORE) * Math.min(1, Math.max(0, fraction))))
        : 0;

    round.guesses.push({ playerId: clientId, guess: appId, score, correct });

    if (correct) {
        const player = gameState.players.find((p) => p.id === clientId);
        if (player) player.score += score;
    }

    sendMessage(peer, { type: MessageType.guessResult, correct, score, appId });

    if (correct) {
        const correctPlayerIds = new Set(round.guesses.filter((g) => g.correct).map((g) => g.playerId));
        const allGuessed = gameState.players.every((p) => correctPlayerIds.has(p.id));
        if (allGuessed) {
            completeRound(roomId, gameState, round);
        }
    }
}
