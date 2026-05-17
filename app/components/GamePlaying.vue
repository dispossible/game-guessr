<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();
</script>

<template>
    <div class="gamePlaying">
        <RoundTimer v-if="game.currentRound?.status === RoundStatus.pending" />
        <RoundGuesser v-else-if="game.currentRound?.status === RoundStatus.inProgress" />
        <RoundResults v-else-if="game.currentRound?.status === RoundStatus.completed" />
        <div v-else>Unknown round status</div>
    </div>
</template>

<style scoped>
.gamePlaying {
    flex: 1;
    padding: 2ch;
    display: flex;
    min-height: 100%;
}
</style>
