<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();

const now = ref(Date.now());
let interval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    interval = setInterval(() => {
        now.value = Date.now();
    }, 100);
});

onUnmounted(() => {
    if (interval !== null) clearInterval(interval);
});

const amountToReveal = computed(() => {
    const round = game.currentRound;
    if (!round) return 1;

    const total = round.screenshots.length;
    if (total === 0) return 0;

    const elapsed = now.value - round.startTime;
    const duration = round.endTime - round.startTime;

    if (elapsed <= 0) return 1;
    if (elapsed >= duration) return total;

    return Math.max(1, Math.ceil((elapsed / duration) * total));
});

const allScreenshots = computed(() => (game.currentRound?.screenshots ?? []).slice(0, amountToReveal.value));

const mainScreenshot = computed(() => allScreenshots.value.at(-1));
const thumbnails = computed(() => allScreenshots.value.slice(0, -1).reverse());
</script>

<template>
    <div class="roundGuesser">
        <div class="countdown">
            <CountdownDisplay :timestamp="game.currentRound?.endTime ?? 0" size="small" />
        </div>
        <div class="screenshotsContainer">
            <div class="mainWrapper">
                <Transition name="main">
                    <img :key="mainScreenshot" :src="mainScreenshot" class="mainScreenshot" />
                </Transition>
            </div>
            <TransitionGroup tag="ul" name="thumbnail" class="thumbnailGrid">
                <img v-for="screenshot in thumbnails" :key="screenshot" :src="screenshot" class="thumbnail" />
            </TransitionGroup>
        </div>
    </div>
</template>

<style scoped>
.roundGuesser {
    flex: 1;
    padding: 2ch;
    position: relative;
}

.countdown {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 100;
}

.screenshotsContainer {
    display: flex;
    flex-direction: column;
    gap: 1ch;
}

.mainWrapper {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
}

.mainScreenshot {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 1;
    transform: translateY(0);
}

.thumbnailGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    margin: 0;
    padding: 0;
    list-style: none;
    gap: 1ch;
}

.thumbnail {
    aspect-ratio: 16 / 9;
    width: 100%;
}

/* Main screenshot crossfade */
.main-enter-active,
.main-leave-active {
    transition: all 300ms ease-in-out;
    z-index: 1;
}
.main-leave-active {
    z-index: 2;
}

.main-enter-from {
    opacity: 0;
    transform: translateY(-32px);
}
.main-leave-to {
    opacity: 0.4;
    transform: scale(0.5) translateY(100%);
    transform-origin: center left;
}

/* Thumbnail enter */
.thumbnail-enter-active {
    transition: all 200ms ease-in-out 200ms;
}

.thumbnail-enter-from {
    opacity: 0;
    transform: scale(1.1) translateY(-20%);
}

/* Thumbnail move */
.thumbnail-move {
    transition: all 300ms ease-in-out;
}
</style>
