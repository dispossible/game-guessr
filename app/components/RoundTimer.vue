<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();

function preloadScreenshots(urls: string[]) {
    for (const url of urls) {
        const img = new Image();
        img.src = url;
    }
}

watch(
    () => game.currentRound?.screenshots,
    (urls) => {
        if (urls && urls.length > 0) preloadScreenshots(urls);
    },
    { immediate: true },
);
</script>

<template>
    <div class="roundTimer">
        <p class="roundLabel">Round {{ game.currentRound?.number }}</p>
        <CountdownDisplay v-if="game.currentRound" :timestamp="game.currentRound.startTime" />
        <p class="countdownLabel">
            {{ !game.currentRound || game.currentRound.startTime <= Date.now() ? "Starting…" : "Round starting in" }}
        </p>
    </div>
</template>

<style scoped>
.roundTimer {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5ch;
}

.roundLabel {
    font-size: 1.4em;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    opacity: 0.7;
}

.countdownLabel {
    font-size: 1.1em;
    opacity: 0.7;
}
</style>
