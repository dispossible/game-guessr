<script setup lang="ts">
import { useGameStore } from "~/stores/game";

const game = useGameStore();
</script>

<template>
    <div class="playerList">
        <h3 class="title">
            Players <span>{{ game.players.length }}</span>
        </h3>
        <ul class="players">
            <li v-for="player in game.players" :key="player.id" class="player" :data-you="player.id === game.clientId">
                <span class="name">{{ player.name }}</span>
                <span class="score">{{ player.score }}</span>
            </li>
        </ul>
        <div class="error">{{ game.error }}</div>
        <div class="actions">
            <BaseButton @click="game.leaveRoom" variant="danger">Leave</BaseButton>
            <BaseButton @click="game.startGame" variant="primary">Start Game</BaseButton>
        </div>
    </div>
</template>

<style scoped>
.playerList {
    border-right: 1px solid var(--color-border);
    padding: 2ch;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.title {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2ch;
    padding-bottom: 0.5lh;
    margin-bottom: 0.5lh;
    border-bottom: 1px solid var(--color-border);
}

.players {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1lh;
    flex: 1;
}

.player {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2ch;

    &[data-you="true"] {
        color: hsla(from var(--color-accent) h s calc(l + 10));
        .name {
            font-weight: 800;
        }
    }
}

.error {
    color: var(--color-danger);
    text-align: center;
    padding-block: 1lh;
}

.actions {
    display: flex;
    gap: 1ch;
    & :last-child {
        flex: 1;
    }
}
</style>
