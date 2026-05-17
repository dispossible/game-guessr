<script setup lang="ts">
import type { BaseInputProps } from "./BaseInput.vue";
import type { BaseSelectProps } from "./BaseSelect.vue";

type InputMode = BaseInputProps & { select?: never };
type SelectMode = BaseSelectProps & { type?: never; select: true };

const props = defineProps<
    (InputMode | SelectMode) & {
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
        <BaseSelect
            v-if="props.select"
            :model-value="modelValue"
            v-bind="(props as BaseSelectProps)"
            :class="{ monospace }"
            @update:model-value="$emit('update:modelValue', $event)"
        />
        <BaseInput
            v-else
            :model-value="modelValue"
            v-bind="(props as BaseInputProps)"
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
