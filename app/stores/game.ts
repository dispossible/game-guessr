import { defineStore } from "pinia";
import type { GameState, Player } from "#shared/types/GameState";
import { type Message, MessageSchema, MessageType } from "#shared/types/Message";

type ConnectionStatus = "idle" | "connecting" | "open" | "closed";

interface GameStoreState {
    socket: WebSocket | null;
    status: ConnectionStatus;
    gameState: GameState | null;
    playerId: string | null;
    playerName: string;
    error: string | null;
}

export const useGameStore = defineStore("game", {
    state: (): GameStoreState => ({
        socket: null,
        status: "idle",
        gameState: null,
        playerId: null,
        playerName: "",
        error: null,
    }),

    getters: {
        isConnected: (state) => state.status === "open",
        roomId: (state) => state.gameState?.id ?? null,
        players: (state) => state.gameState?.players ?? [],
        inRoom: (state) => state.gameState !== null,
    },

    actions: {
        connect(): Promise<void> {
            if (this.socket && (this.status === "open" || this.status === "connecting")) {
                return Promise.resolve();
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
            this.send({ type: MessageType.createRoom, playerName });
        },

        async joinRoom(roomId: string, playerName: string) {
            await this.connect();
            this.send({ type: MessageType.joinRoom, roomId, playerName });
        },

        leaveRoom() {
            if (this.status === "open") {
                this.send({ type: MessageType.leaveRoom });
            }
            this.gameState = null;
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
                    // The server assigns the authoritative player id; pick ours
                    // out of the player list so it matches the peer id.
                    if (this.playerName) {
                        const me = message.gameState.players.find((p) => p.name === this.playerName);
                        if (me) this.playerId = me.id;
                    }
                    this.error = null;
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
                    }
                    break;

                case MessageType.failedToJoinRoom:
                    this.error = `Failed to join room "${message.roomId}"`;
                    break;
            }
        },
    },
});
