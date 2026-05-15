<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useGameStore } from "~/stores/game";

const game = useGameStore();

const name = ref(game.playerName ?? "");
const joinRoomId = ref("");

onMounted(() => {
    game.restoreSession();
});

const trimmedName = computed(() => name.value.trim());
const canSubmit = computed(() => trimmedName.value.length > 0);

async function onCreate() {
    if (!canSubmit.value) return;
    await game.createRoom(trimmedName.value);
}

async function onJoin() {
    if (!canSubmit.value) return;
    const roomId = joinRoomId.value.trim().toUpperCase();
    if (!roomId) return;
    await game.joinRoom(roomId, trimmedName.value);
}

function onLeave() {
    game.leaveRoom();
}
</script>

<template>
    <main class="page">
        <header class="header">
            <h1>Game Guessr</h1>
            <span class="status" :data-status="game.status">{{ game.status }}</span>
        </header>

        <section v-if="game.status === 'connecting'" class="panel">
            <h2>Connecting...</h2>
        </section>

        <section v-else-if="!game.inRoom" class="panel">
            <h2>Join a game</h2>

            <label class="field">
                <span>Your name</span>
                <input v-model="name" type="text" placeholder="e.g. Alex" maxlength="100" autocomplete="off" />
            </label>

            <div class="actions">
                <button :disabled="!canSubmit" @click="onCreate">Create room</button>

                <div class="join">
                    <input
                        v-model="joinRoomId"
                        type="text"
                        placeholder="ROOM ID"
                        maxlength="6"
                        autocomplete="off"
                        class="room-input"
                    />
                    <button :disabled="!canSubmit || !joinRoomId.trim()" @click="onJoin">Join</button>
                </div>
            </div>

            <p v-if="game.error" class="error">{{ game.error }}</p>
        </section>

        <section v-else class="panel">
            <div class="room-header">
                <div>
                    <h2>Room</h2>
                    <code class="room-id">{{ game.roomId }}</code>
                </div>
                <button class="leave" @click="onLeave">Leave</button>
            </div>

            <h3>Players ({{ game.players.length }})</h3>
            <ul class="players">
                <li v-for="player in game.players" :key="player.id">
                    <span class="player-name">
                        {{ player.name }}
                        <span v-if="player.id === game.playerId" class="you">you</span>
                    </span>
                    <span class="score">{{ player.score }}</span>
                </li>
            </ul>

            <p v-if="game.error" class="error">{{ game.error }}</p>
        </section>
    </main>
</template>

<style scoped>
.page {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    padding: 48px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
}

h1 {
    margin: 0;
    font-size: 28px;
    letter-spacing: -0.02em;
}

h2 {
    margin: 0 0 16px;
    font-size: 18px;
}

h3 {
    margin: 24px 0 8px;
    font-size: 14px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.status {
    font-size: 12px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.status[data-status="open"] {
    color: #6dd58c;
}

.status[data-status="connecting"] {
    color: #e0c060;
}

.status[data-status="closed"] {
    color: var(--danger);
}

.panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
}

.field span {
    font-size: 12px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

input {
    background: var(--panel-2);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 15px;
    outline: none;
    transition: border-color 120ms ease;
}

input:focus {
    border-color: var(--accent);
}

.actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.join {
    display: flex;
    gap: 8px;
}

.room-input {
    flex: 1;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

button {
    background: var(--accent);
    color: #0b0e15;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 120ms ease;
}

button:hover:not(:disabled) {
    background: var(--accent-hover);
}

button:disabled {
    background: #3a3f4d;
    color: #6b7280;
    cursor: not-allowed;
}

button.leave {
    background: transparent;
    color: var(--danger);
    border: 1px solid var(--border);
}

button.leave:hover {
    background: rgba(255, 115, 115, 0.08);
}

.room-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.room-id {
    display: inline-block;
    margin-top: 4px;
    padding: 4px 8px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 16px;
    letter-spacing: 0.2em;
}

.players {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.players li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.player-name {
    display: flex;
    align-items: center;
    gap: 8px;
}

.you {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    background: rgba(124, 156, 255, 0.12);
    border: 1px solid rgba(124, 156, 255, 0.3);
    padding: 1px 6px;
    border-radius: 999px;
}

.score {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
}

.error {
    margin: 16px 0 0;
    color: var(--danger);
    font-size: 13px;
}
</style>
