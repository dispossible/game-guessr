<script setup lang="ts">
export interface ScoreboardEntry {
    name: string;
    score: number;
}

const props = withDefaults(
    defineProps<{
        entries: ScoreboardEntry[];
        scorePrefix?: string;
        emptyMessage?: string;
    }>(),
    {
        scorePrefix: "",
        emptyMessage: "No results to show",
    },
);
</script>

<template>
    <div class="playerScoreboard">
        <p class="emptyMessage" v-if="props.entries.length === 0">{{ props.emptyMessage }}</p>
        <ol class="entryList" v-else>
            <li v-for="(entry, index) in props.entries" :key="entry.name" class="entryRow">
                <span class="rank">{{ index + 1 }}</span>
                <span class="name">{{ entry.name }}</span>
                <span class="score">{{ props.scorePrefix }}{{ entry.score }}</span>
            </li>
        </ol>
    </div>
</template>

<style scoped>
.playerScoreboard {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.emptyMessage {
    font-size: 0.9rem;
    opacity: 0.55;
    margin: 0;
}

.entryList {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    counter-reset: scoreboard;
}

.entryRow {
    display: grid;
    grid-template-columns: 3ch 1fr auto;
    align-items: center;
    gap: 1ch;
    padding: 0.3lh 1ch;
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    border-radius: 6px;
}

.rank {
    font-size: 0.75rem;
    font-weight: 700;
    opacity: 0.5;
    text-align: center;
}

.name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.score {
    color: var(--color-accent);
}
</style>
