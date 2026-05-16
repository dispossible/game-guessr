<script setup lang="ts">
import type { InputHTMLAttributes } from "vue";

interface BaseInputProps extends /* @vue-ignore */ InputHTMLAttributes {
    modelValue?: string;
    type?: "text" | "number" | "email" | "password" | "search";
}

export type { BaseInputProps };

const props = defineProps<BaseInputProps>();

defineEmits<{
    "update:modelValue": [value: string];
}>();
</script>

<template>
    <input
        v-bind="props"
        :value="props.modelValue"
        :type="props.type ?? 'text'"
        class="input"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
</template>

<style scoped>
.input {
    padding: 0.5lh 1.5ch;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font: inherit;
    width: 100%;

    &::placeholder {
        color: color-mix(in srgb, var(--color-text) 40%, transparent);
    }

    &:focus {
        outline: 0;
        border-color: var(--color-accent);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}
</style>
