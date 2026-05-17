<script setup lang="ts">
const props = defineProps<{
    timestamp: number;
    size?: "small" | "medium" | "large";
}>();

const secondsRemaining = ref(0);

function tick() {
    secondsRemaining.value = Math.max(0, Math.ceil((props.timestamp - Date.now()) / 1000));
}

let interval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    tick();
    interval = setInterval(tick, 100);
});

onUnmounted(() => {
    if (interval !== null) clearInterval(interval);
});

watch(
    () => props.timestamp,
    () => tick(),
);
</script>

<template>
    <div :class="['countdown', props.size ?? 'medium']">
        <Transition name="countdown">
            <span class="countdownNumber" :key="secondsRemaining">{{ secondsRemaining }}</span>
        </Transition>
    </div>
</template>

<style scoped>
.countdown {
    border-radius: 50%;
    border: 4px solid var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: var(--color-bg);

    &.small {
        width: 4rem;
        height: 4rem;
        font-size: 1.4em;
        border-width: 3px;
    }

    width: 6rem;
    height: 6rem;
    font-size: 2em;

    &.large {
        width: 8rem;
        height: 8rem;
        font-size: 2.5em;
    }
}

.countdownNumber {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    position: absolute;
    inset: 0;
    display: inline-grid;
    place-items: center;
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
