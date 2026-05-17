<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();
</script>

<template>
    <div class="roundGuesser">
        <h2>Round Guesser</h2>
        <!-- TODO -->
    </div>
</template>

<style scoped>
.roundGuesser {
    flex: 1;
    padding: 2ch;
}
</style>
