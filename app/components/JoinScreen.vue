<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useGameStore } from "~/stores/game";

const game = useGameStore();
const route = useRoute();

const name = ref(game.playerName ?? "");
const joinRoomId = ref("");

onMounted(() => {
    const roomParam = route.query.id;
    if (typeof roomParam === "string" && roomParam.trim()) {
        joinRoomId.value = roomParam.trim().slice(0, 6).toUpperCase();
    }
});

const trimmedName = computed(() => name.value.trim());
const canSubmit = computed(() => trimmedName.value.length > 0);

async function onCreate() {
    if (!canSubmit.value) return;
    await game.createRoom(trimmedName.value);
}

async function onJoin() {
    if (!canSubmit.value) return;
    const roomId = joinRoomId.value.trim().toUpperCase();
    if (!roomId) return;
    await game.joinRoom(roomId, trimmedName.value);
}
</script>

<template>
    <div class="joinScreen">
        <UiPanel>
            <LabeledInput label="Your name" v-model="name" placeholder="e.g. Alex" maxlength="100" autocomplete="off" />

            <div class="actions">
                <div class="host">
                    <BaseButton :disabled="!canSubmit" @click="onCreate">Host a game</BaseButton>
                </div>
                <div class="join">
                    <LabeledInput
                        v-model="joinRoomId"
                        type="text"
                        label="ROOM ID"
                        maxlength="6"
                        autocomplete="off"
                        class="roomInput"
                        monospace
                    />
                    <BaseButton :disabled="!canSubmit || joinRoomId.length !== 6" @click="onJoin">Join</BaseButton>
                </div>
            </div>

            <p v-if="game.error" class="error">{{ game.error }}</p>
        </UiPanel>
        <div></div>
    </div>
</template>

<style scoped>
.joinScreen {
    min-height: 100%;
    display: grid;
    align-items: center;
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    flex: 1;
}

.actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding-top: 32px;
    align-items: end;
}

.host {
    padding-right: 32px;
    text-align: center;
    display: grid;
}

.join {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 0.5lh;
    border-left: 1px solid var(--color-border);
    padding-left: 32px;
}

.error {
    padding-top: 16px;
    color: var(--color-danger);
    text-align: right;
}
</style>
