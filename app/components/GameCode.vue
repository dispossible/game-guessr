<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();
const copied = ref(false);

async function copyCode() {
    const url = new URL(window.location.href);
    url.searchParams.set("id", game.roomId);
    await navigator.clipboard.writeText(url.toString());
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
    <div class="gameCode">
        <code class="code">
            {{ game.roomId }}
        </code>
        <BaseButton variant="ghost" @click="copyCode" class="copyButton">
            <Transition name="label" mode="out-in">
                <span v-if="copied" key="copied" class="copyLabel">Copied!</span>
                <span v-else key="copy" class="copyLabel">Copy Link</span>
            </Transition>
            <span class="hiddenLabel" role="presentation">Copy Link</span>
        </BaseButton>
    </div>
</template>

<style scoped>
.gameCode {
    display: flex;
    align-items: center;
    gap: 1ch;
}

.code {
    padding: 0.5lh 2ch;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: monospace;
    font-size: 1.2em;
    letter-spacing: 0.1ch;
    display: inline-grid;
    place-items: center;
}

.label-enter-active,
.label-leave-active {
    transition:
        opacity 150ms ease,
        translate 150ms ease,
        rotate 150ms ease;
}

.label-enter-from,
.label-leave-to {
    opacity: 0;
}
.label-enter-from {
    translate: 0 -0.5lh;
    rotate: -10deg;
}
.label-leave-to {
    translate: 0 0.5lh;
    rotate: 10deg;
}

.label-move {
    opacity: 1;
    translate: 0 0;
    rotate: 0;
    transform-origin: center left;
}

.hiddenLabel {
    color: transparent;
}

.copyLabel {
    position: absolute;
    inset: 0;
    display: inline-grid;
    place-items: center;
}

.copyButton {
    position: relative;
    overflow: hidden;
}
</style>
