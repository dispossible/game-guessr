<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();

const secondsRemaining = ref(0);

function updateCountdown() {
    const round = game.currentRound;
    if (!round) return;
    const diff = round.startTime - Date.now();
    secondsRemaining.value = Math.max(0, Math.ceil(diff / 1000));
    // secondsRemaining.value = Math.abs(Math.ceil(diff / 1000) % 5);
}

let interval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    updateCountdown();
    interval = setInterval(updateCountdown, 100);
});

onUnmounted(() => {
    if (interval !== null) clearInterval(interval);
});
</script>

<template>
    <div class="roundTimer">
        <p class="roundLabel">Round {{ game.currentRound?.number }}</p>
        <div class="countdown">
            <Transition name="countdown">
                <span class="countdownNumber" :key="secondsRemaining">{{ secondsRemaining }}</span>
            </Transition>
        </div>
        <p class="countdownLabel">
            {{ secondsRemaining <= 0 ? "Starting…" : "Round starting in" }}
        </p>
    </div>
</template>

<style scoped>
.roundTimer {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5ch;
    padding: 2ch;
}

.roundLabel {
    font-size: 1.4em;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    opacity: 0.7;
}

.countdown {
    width: 7rem;
    height: 7rem;
    border-radius: 50%;
    border: 4px solid var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.countdownNumber {
    font-size: 3em;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    position: absolute;
    inset: 0;
    display: inline-grid;
    place-items: center;
}

.countdownLabel {
    font-size: 1.1em;
    opacity: 0.7;
}

.countdown-enter-active,
.countdown-leave-active {
    transition:
        opacity 250ms ease,
        scale 250ms ease,
        rotate 250ms ease;
}

.countdown-enter-from,
.countdown-leave-to {
    opacity: 0;
    scale: 0.1;
    rotate: 360deg;
}
.countdown-enter-from {
    rotate: -360deg;
}

.countdown-move {
    opacity: 1;
    scale: 1;
}
</style>
