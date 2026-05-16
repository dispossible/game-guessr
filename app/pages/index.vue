<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useGameStore } from "~/stores/game";

const game = useGameStore();

onMounted(() => {
    game.connect();
    game.restoreSession();
});

function onLeave() {
    game.leaveRoom();
}

useHead({
    link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: true },
        { href: "https://fonts.googleapis.com/css2?family=Jersey+10&display=swap", rel: "stylesheet" },
    ],
});
</script>

<template>
    <main class="page">
        <header class="header">
            <h1 class="logo">Game Guessr</h1>
            <span class="status" :data-status="game.status">{{ game.status }}</span>
        </header>

        <div class="wrapper">
            <section v-if="game.status === 'connecting'">
                <h2>Connecting...</h2>
            </section>

            <JoinScreen v-else-if="!game.inRoom" />

            <section v-else class="panel">
                <div class="room-header">
                    <div>
                        <h2>Room</h2>
                        <code class="room-id">{{ game.roomId }}</code>
                    </div>
                    <BaseButton variant="danger" @click="onLeave">Leave</BaseButton>
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
        </div>
    </main>
</template>

<style scoped>
.wrapper {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 4ch;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1lh;
    border-bottom: 1px solid var(--color-border);
    padding: 0.4lh 3ch;
}

.logo {
    font-family: "Jersey 10", sans-serif;
    margin: 0;
    font-size: 2em;
    text-shadow:
        0 2px 0 #f00,
        2px 0 0 #00f,
        -2px 0 0 #0f0;
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
