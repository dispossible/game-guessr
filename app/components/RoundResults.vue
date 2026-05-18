<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();

const round = computed(() => game.currentRound);

const correctGuessers = computed(() => {
    if (!round.value) return [];
    return round.value.guesses
        .filter((g) => g.correct)
        .sort((a, b) => b.score - a.score)
        .map((g) => ({
            name: game.players.find((p) => p.id === g.playerId)?.name ?? "Unknown",
            score: g.score,
        }));
});
</script>

<template>
    <div class="roundResults">
        <div class="reveal">
            <img v-if="round.headerImage" :src="round.headerImage" :alt="round.gameName" class="headerImage" />
            <h2 class="gameName">{{ round.gameName }}</h2>
        </div>

        <div class="scoreboard">
            <h3 class="scoreboardTitle">Correct guesses</h3>
            <PlayerScoreboard
                :entries="correctGuessers"
                score-prefix="+"
                empty-message="Nobody guessed correctly this round"
            />
        </div>

        <template v-if="game.isFinalRound">
            <BaseButton @click="game.endGame" v-if="game.isHost">Show Final Scores</BaseButton>
            <p class="waitingForHost" v-else>Waiting for host to show final scores&hellip;</p>
        </template>
        <template v-else>
            <BaseButton @click="game.startRound" v-if="game.isHost">Start Next Round</BaseButton>
            <p class="waitingForHost" v-else>Waiting for host to start next round&hellip;</p>
        </template>
    </div>
</template>

<style scoped>
.roundResults {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
    gap: 2lh;
    align-self: center;
    margin: auto;
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

.scoreboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
}

.scoreboardTitle {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
    margin: 0;
}

.waitingForHost {
    opacity: 0.7;
}
</style>
