<script setup lang="ts">
import { useGameStore } from "~/stores/game";
import { GameStatus } from "#shared/types/GameState";

const game = useGameStore();
</script>

<template>
    <div class="gameScreen">
        <p v-if="game.error" class="error">{{ game.error }}</p>

        <PlayerList />

        <GameSettings v-if="game.isLobby && game.isHost" />
        <GamePending v-else-if="game.isLobby" />
        <GamePlaying v-else-if="game.isPlaying" />
        <GameFinished v-else-if="game.isFinished" />
        <div v-else>Unknown game status</div>
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
