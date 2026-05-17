<script setup lang="ts">
import type { BaseInputProps } from "./BaseInput.vue";

const props = defineProps<
    BaseInputProps & {
        label: string;
        monospace?: boolean;
    }
>();

defineEmits<{
    "update:modelValue": [value: string];
}>();
</script>

<template>
    <label class="labeled-input">
        <span class="label">{{ label }}</span>
        <BaseInput
            :model-value="modelValue"
            v-bind="props"
            :class="{ monospace }"
            @update:model-value="$emit('update:modelValue', $event)"
        />
    </label>
</template>

<style scoped>
.labeled-input {
    display: grid;
    gap: 0.1lh;
}

.label {
    font-size: 0.9em;
    color: color-mix(in srgb, var(--color-text) 75%, transparent);
}

.monospace {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace, var(--font-family);
    letter-spacing: 0.5ch;
}
</style>
