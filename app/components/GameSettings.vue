<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();

const roundCount = ref(game.gameState?.roundCount ?? 5);
const roundDuration = ref(game.gameState?.roundDuration / 1000 ?? 60);

async function onStartGame() {
    await game.startGame(roundCount.value, roundDuration.value * 1000);
}
</script>

<template>
    <div class="gameSettings">
        <div class="wrapper">
            <GameCode />
        </div>
        <div class="wrapper wide">
            <UiPanel class="settings">
                <h2 class="title">Game Settings</h2>
                <LabeledInput label="Number of rounds" type="number" v-model="roundCount" min="1" max="30" />
                <LabeledInput
                    label="Round duration (seconds)"
                    type="number"
                    v-model="roundDuration"
                    min="1"
                    max="600"
                />
                <BaseButton @click="onStartGame" variant="primary">Start game</BaseButton>
            </UiPanel>
        </div>
    </div>
</template>

<style scoped>
.gameSettings {
    padding: 2ch;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1lh;
}

.wrapper {
    margin: 0 auto;
    max-width: 600px;
    &.wide {
        width: 100%;
    }
}

.settings {
    display: flex;
    flex-direction: column;
    gap: 1lh;
}
</style>
