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
    title: "Game Guessr",
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

            <GameScreen v-else-if="game.inRoom" />
            <JoinScreen v-else />
        </div>
    </main>
</template>

<style scoped>
.page {
    min-height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.wrapper {
    width: 100%;
    margin: 0 auto;
    min-height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
</style>
