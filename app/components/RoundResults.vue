<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();

const round = computed(() => game.currentRound);
</script>

<template>
    <div class="roundResults">
        <div class="reveal">
            <img v-if="round.headerImage" :src="round.headerImage" :alt="round.gameName" class="headerImage" />
            <h2 class="gameName">{{ round.gameName }}</h2>

            <BaseButton @click="game.startRound" v-if="game.isHost">Start Next Round</BaseButton>
            <p class="waitingForHost" v-else>Waiting for host to start next round&hellip;</p>
        </div>
        <div></div>
    </div>
</template>

<style scoped>
.roundResults {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
    gap: 1.5rem;
}

.reveal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1lh;
    width: 100%;
}

.headerImage {
    width: 100%;
    max-width: 460px;
    border-radius: 8px;
    display: block;
    object-fit: cover;
    aspect-ratio: 460 / 215;
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.4);
}

.gameName {
    font-size: 2rem;
    font-weight: 700;
    text-align: center;
    margin: 0;
}

.waitingForHost {
    opacity: 0.7;
}
</style>
