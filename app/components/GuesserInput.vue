<script setup lang="ts">
import type { Game } from "#shared/types/Game";
import { useGameStore } from "~/stores/game";

const game = useGameStore();

const query = ref("");
const results = ref<Game[]>([]);
const activeIndex = ref(0);
const showDropdown = ref(false);
const showWrong = ref(false);

let wrongTimer: ReturnType<typeof setTimeout> | null = null;
let requestId = 0;

const currentRound = computed(() => game.currentRound);

const hasGuessedCorrectly = computed(() => {
    const result = game.lastGuessResult;
    return result?.correct === true && result.roundNumber === currentRound.value?.number;
});

const correctScore = computed(() => {
    if (!hasGuessedCorrectly.value) return 0;
    return game.lastGuessResult?.score ?? 0;
});

const activeResult = computed(() => results.value[activeIndex.value] ?? null);

async function fetchResults(q: string) {
    if (!q.trim()) {
        results.value = [];
        showDropdown.value = false;
        return;
    }

    const id = ++requestId;
    const data = await $fetch<{ results: Game[] }>("/api/games/search", { query: { q } });
    if (id !== requestId) return; // stale response

    results.value = data.results;
    activeIndex.value = 0;
    showDropdown.value = data.results.length > 0;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(query, (val) => {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchResults(val), 150);
});

watch(
    () => game.lastGuessResult,
    (result) => {
        if (!result || result.correct) return;
        if (result.roundNumber !== currentRound.value?.number) return;

        showWrong.value = true;
        if (wrongTimer !== null) clearTimeout(wrongTimer);
        wrongTimer = setTimeout(() => {
            showWrong.value = false;
        }, 1000);
    },
);

function submitGuess() {
    if (!activeResult.value) return;
    game.makeGuess(activeResult.value.appId);
    query.value = "";
    results.value = [];
    showDropdown.value = false;
}

function onKeydown(e: KeyboardEvent) {
    if (!showDropdown.value || results.value.length === 0) {
        if (e.key === "Enter") {
            e.preventDefault();
            submitGuess();
        }
        return;
    }

    if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex.value = Math.max(activeIndex.value - 1, 0);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1);
    } else if (e.key === "Enter") {
        e.preventDefault();
        submitGuess();
    } else if (e.key === "Escape") {
        showDropdown.value = false;
    }
}

function selectResult(index: number) {
    activeIndex.value = index;
    submitGuess();
}

function onBlur() {
    // Delay so click on a result fires before we hide the list
    setTimeout(() => {
        showDropdown.value = false;
    }, 150);
}

function onFocus() {
    if (results.value.length > 0) showDropdown.value = true;
}

const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLUListElement | null>(null);

async function scrollActiveIntoView() {
    await nextTick();
    const activeEl = listEl.value?.querySelector('[data-active="true"]') as HTMLElement | null;
    activeEl?.scrollIntoView({ block: "nearest" });
}

watch(activeIndex, scrollActiveIntoView);
watch(results, scrollActiveIntoView);

onMounted(() => inputEl.value?.focus());

onUnmounted(() => {
    if (wrongTimer !== null) clearTimeout(wrongTimer);
    if (debounceTimer !== null) clearTimeout(debounceTimer);
});
</script>

<template>
    <Transition name="guesser" mode="out-in">
        <div v-if="hasGuessedCorrectly" class="correctMessage">
            <span class="correctIcon">✓</span>
            <span
                >Correct! <strong>+{{ correctScore }}</strong> points</span
            >
        </div>

        <div v-else class="guesserInput">
            <Transition name="fade">
                <p v-if="showWrong" class="wrongLabel">Wrong!</p>
            </Transition>

            <ul v-if="showDropdown && results.length > 0" ref="listEl" class="resultsList">
                <li
                    v-for="(result, i) in [...results].reverse()"
                    :key="result.appId"
                    class="resultItem"
                    :data-active="results.length - 1 - i === activeIndex"
                    @mousedown.prevent="selectResult(results.length - 1 - i)"
                >
                    {{ result.name }}
                </li>
            </ul>

            <div class="inputRow">
                <input
                    ref="inputEl"
                    v-model="query"
                    class="searchInput"
                    type="search"
                    placeholder="Search for a game…"
                    autocomplete="off"
                    @keydown="onKeydown"
                    @blur="onBlur"
                    @focus="onFocus"
                />
                <BaseButton :disabled="!activeResult" @click="submitGuess">Guess</BaseButton>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.guesserInput {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5lh;
    width: min(600px, 100%);
    margin: auto;
}

.inputRow {
    display: flex;
    gap: 1ch;
    align-items: center;
    width: 100%;
}

.searchInput {
    flex: 1;
    padding: 0.5lh 1.5ch;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font: inherit;

    &::placeholder {
        color: color-mix(in srgb, var(--color-text) 40%, transparent);
    }

    &:focus {
        outline: 0;
        border-color: var(--color-accent);
    }
}

.resultsList {
    position: absolute;
    bottom: calc(100% + 0.5lh);
    left: 0;
    right: 0;
    list-style: none;
    margin: 0;
    padding: 0.25lh 0;
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
    max-height: 40vh;
    overflow-y: auto;
}

.resultItem {
    padding: 0.4lh 1.5ch;
    cursor: pointer;
    font-size: 0.95em;

    &[data-active="true"] {
        background: var(--color-accent);
        color: hsl(from var(--color-bg) h s calc(l - 20));
    }

    &:hover {
        background: color-mix(in srgb, var(--color-accent) 30%, transparent);
    }

    &[data-active="true"]:hover {
        background: var(--color-accent);
    }
}

.wrongLabel {
    margin: 0;
    text-align: center;
    color: var(--color-danger);
    font-weight: 600;
}

.correctMessage {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 1ch;
    padding: 0.5lh 2ch;
    border-radius: 8px;
    border: 1px solid var(--color-accent);
    background: var(--color-panel);
    color: var(--color-text);
    margin: auto;
}

.correctIcon {
    font-size: 1.3em;
    color: var(--color-accent);
    font-weight: 600;
}

/* transitions */
.guesser-enter-active,
.guesser-leave-active {
    transition: opacity 200ms ease;
}
.guesser-enter-from,
.guesser-leave-to {
    opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
