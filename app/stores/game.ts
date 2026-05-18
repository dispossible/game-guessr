import { defineStore } from "pinia";
import { type Difficulty, type GameState, GameStatus } from "#shared/types/GameState";
import { type Message, MessageSchema, MessageType } from "#shared/types/Message";
import { generateRandomId } from "#shared/utils/randomId";

interface GuessResult {
    correct: boolean;
    score: number;
    appId: number;
    roundNumber: number;
    at: number;
}

type ConnectionStatus = "idle" | "connecting" | "open" | "closed";

interface GameStoreState {
    socket: WebSocket | null;
    status: ConnectionStatus;
    gameState: GameState | null;
    playerName: string | null;
    clientId: string;
    error: string | null;
    lastGuessResult: GuessResult | null;
}

const CLIENT_NAME_KEY = "game-guessr-client-name";
const ROOM_ID_KEY = "game-guessr-room-id";
const CLIENT_ID_KEY = "game-guessr-client-id";
const CLIENT_ID_LENGTH = 32;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Thin wrappers around useCookie so the same options are used everywhere the
// cookie is read or written.
function clientIdCookie() {
    return useCookie<string | null>(CLIENT_ID_KEY, {
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
    });
}

function clientNameCookie() {
    return useCookie<string | null>(CLIENT_NAME_KEY, {
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
    });
}

function roomIdCookie() {
    return useCookie<string | null>(ROOM_ID_KEY, {
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
    });
}

// A stable per-browser id that the server uses as the player id, so a refresh
// reattaches to the same player (and keeps their score) instead of creating a
// new one. Generated lazily and persisted to a cookie so SSR sees it too.
function ensureClientId(): string {
    const cookie = clientIdCookie();
    if (cookie.value) return cookie.value;
    const generated = generateRandomId(CLIENT_ID_LENGTH);
    cookie.value = generated;
    return generated;
}

export const useGameStore = defineStore("game", {
    state: (): GameStoreState => ({
        socket: null,
        status: "idle",
        gameState: null,
        playerName: clientNameCookie().value ?? null,
        clientId: ensureClientId(),
        error: null,
        lastGuessResult: null,
    }),

    getters: {
        isConnected: (state) => state.status === "open",
        roomId: (state) => state.gameState?.id ?? null,
        players: (state) => state.gameState?.players ?? [],
        inRoom: (state) => state.gameState !== null,
        hostId: (state) => state.gameState?.hostId ?? null,
        isHost: (state) => state.gameState?.hostId === state.clientId,
        isLobby: (state) => state.gameState?.status === GameStatus.lobby,
        isPlaying: (state) => state.gameState?.status === GameStatus.playing,
        isFinished: (state) => state.gameState?.status === GameStatus.finished,
        currentRound: (state) => state.gameState?.rounds.at(-1) ?? null,
    },

    actions: {
        connect(): Promise<void> {
            if (this.socket && this.status === "open") {
                return Promise.resolve();
            }
            if (this.socket && this.status === "connecting") {
                return new Promise((resolve, reject) => {
                    this.socket?.addEventListener("open", () => resolve());
                    this.socket?.addEventListener("error", () => reject(new Error("Failed to connect to WebSocket")));
                });
            }

            this.status = "connecting";
            this.error = null;

            // Build a ws:// or wss:// URL relative to the current origin so it
            // works for both dev and prod without extra config.
            const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
            const url = `${proto}//${window.location.host}/ws`;
            const socket = new WebSocket(url);
            this.socket = socket;

            socket.addEventListener("message", (event) => this.handleMessage(event));
            socket.addEventListener("close", () => {
                this.status = "closed";
                this.socket = null;
            });
            socket.addEventListener("error", () => {
                this.error = "WebSocket error";
            });

            return new Promise((resolve, reject) => {
                socket.addEventListener("open", () => {
                    this.status = "open";
                    resolve();
                });
                socket.addEventListener("error", () => reject(new Error("Failed to connect to WebSocket")), {
                    once: true,
                });
            });
        },

        disconnect() {
            this.socket?.close();
            this.socket = null;
            this.status = "closed";
            this.gameState = null;
        },

        send(message: Message) {
            if (!this.socket || this.status !== "open") {
                this.error = "Not connected";
                return;
            }
            this.socket.send(JSON.stringify(message));
        },

        async createRoom(playerName: string) {
            await this.connect();
            this.playerName = playerName;
            clientNameCookie().value = playerName;
            this.send({ type: MessageType.createRoom, playerName, clientId: this.clientId });
        },

        async joinRoom(roomId: string, playerName: string) {
            await this.connect();
            this.playerName = playerName;
            clientNameCookie().value = playerName;
            this.send({ type: MessageType.joinRoom, roomId, playerName, clientId: this.clientId });
        },

        leaveRoom() {
            if (this.status === "open") {
                this.send({ type: MessageType.leaveRoom });
            }
            this.gameState = null;
            roomIdCookie().value = null;
        },

        startGame(roundCount: number, roundDuration: number, difficulty: Difficulty) {
            if (!this.gameState) return;
            this.send({
                type: MessageType.startRound,
                roomId: this.gameState.id,
                roundCount,
                roundDuration,
                difficulty,
            });
        },

        startRound() {
            if (!this.gameState) return;
            this.send({ type: MessageType.startRound, roomId: this.gameState.id });
        },

        makeGuess(appId: number) {
            if (!this.gameState) return;
            this.send({ type: MessageType.makeGuess, roomId: this.gameState.id, appId });
        },

        async restoreSession() {
            const roomId = roomIdCookie().value;
            if (roomId && this.playerName) {
                await this.joinRoom(roomId, this.playerName);
            }
        },

        handleMessage(event: MessageEvent) {
            let raw: unknown;
            try {
                raw = JSON.parse(event.data);
            } catch {
                this.error = "Received malformed message from server";
                console.error("Received malformed message from server", event.data);
                return;
            }

            const parsed = MessageSchema.safeParse(raw);
            if (!parsed.success) {
                this.error = "Received unknown message from server";
                console.error("Received unknown message from server", parsed.error);
                return;
            }

            const message = parsed.data;
            switch (message.type) {
                case MessageType.gameState:
                    this.gameState = message.gameState;
                    roomIdCookie().value = message.gameState.id;
                    this.error = null;
                    break;

                case MessageType.guessResult:
                    this.lastGuessResult = {
                        correct: message.correct,
                        score: message.score,
                        appId: message.appId,
                        roundNumber: this.currentRound?.number ?? 0,
                        at: Date.now(),
                    };
                    break;

                case MessageType.joinedRoom:
                    if (this.gameState && message.roomId === this.gameState.id) {
                        const exists = this.gameState.players.some((p) => p.id === message.player.id);
                        if (!exists) this.gameState.players.push(message.player);
                    }
                    break;

                case MessageType.leftRoom:
                    if (this.gameState && message.roomId === this.gameState.id) {
                        this.gameState.players = this.gameState.players.filter((p) => p.id !== message.userId);
                        this.gameState.hostId = message.hostId;
                    }
                    break;

                case MessageType.failedToJoinRoom:
                    this.error = `Failed to join room "${message.roomId}"`;
                    roomIdCookie().value = null;
                    break;
            }
        },
    },
});
