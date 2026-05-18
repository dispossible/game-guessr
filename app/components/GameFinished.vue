<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();

const leaderboard = computed(() =>
    [...game.players].sort((a, b) => b.score - a.score).map((p) => ({ name: p.name, score: p.score })),
);
</script>

<template>
    <div class="gameFinished">
        <div class="scoreboard">
            <h3 class="scoreboardTitle">Final scores</h3>
            <PlayerScoreboard :entries="leaderboard" empty-message="No players to show" />
        </div>

        <BaseButton @click="game.returnToLobby" v-if="game.isHost">Play Again</BaseButton>
        <p class="waitingForHost" v-else>Waiting for host to start a new game&hellip;</p>
    </div>
</template>

<style scoped>
.gameFinished {
    align-self: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
    gap: 2lh;
    padding: 2ch;
}

.scoreboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1ch;
    width: 100%;
}

.scoreboardTitle {
    font-size: 0.95rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0;
}

.waitingForHost {
    opacity: 0.7;
}
</style>
