<script setup lang="ts">
import type { SelectHTMLAttributes } from "vue";

interface SelectOption {
    value: string;
    label: string;
}

interface BaseSelectProps extends /* @vue-ignore */ SelectHTMLAttributes {
    modelValue?: string;
    options: SelectOption[];
}

export type { BaseSelectProps, SelectOption };

const props = defineProps<BaseSelectProps>();

defineEmits<{
    "update:modelValue": [value: string];
}>();
</script>

<template>
    <select
        v-bind="props"
        :value="props.modelValue"
        class="select"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
        <option
            v-for="option in props.options"
            :key="option.value"
            :value="option.value"
        >
            {{ option.label }}
        </option>
    </select>
</template>

<style scoped>
.select {
    padding: 0.5lh 1.5ch;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font: inherit;
    width: 100%;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1ch center;
    padding-right: 3ch;

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
