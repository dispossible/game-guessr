<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();
</script>

<template>
    <div class="roundResults">
        <h2>Round Results</h2>
        <!-- TODO -->
        <BaseButton @click="game.startRound" :disabled="!game.isHost">Start Next Round</BaseButton>
    </div>
</template>

<style scoped>
.roundResults {
    flex: 1;
    padding: 2ch;
}
</style>
