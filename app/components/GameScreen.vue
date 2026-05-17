<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();
</script>

<template>
    <div class="gameScreen">
        <p v-if="game.error" class="error">{{ game.error }}</p>

        <PlayerList />
    </div>
</template>

<style scoped>
.gameScreen {
    min-height: 100%;
    display: grid;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 4fr;
}

.error {
    color: var(--danger);
    text-align: center;
    padding: 32px;
}
</style>
