<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();
</script>

<template>
    <div class="gamePending">
        <div class="wrapper">
            <GameCode />
        </div>
        <p class="message">Waiting for host to start game...</p>
    </div>
</template>

<style scoped>
.gamePending {
    flex: 1;
    padding: 2ch;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 100%;
}

.wrapper {
    margin: 0 auto;
    max-width: 600px;
}

.message {
    text-align: center;
    padding: 2ch;
    font-size: 1.2em;
}
</style>
