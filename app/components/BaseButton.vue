<script setup lang="ts">
import { computed, resolveComponent } from "vue";

const props = defineProps<{
    variant?: "primary" | "danger" | "ghost";
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    href?: string;
}>();

defineEmits<{
    click: [event: MouseEvent];
}>();

const tag = computed(() => (props.href ? resolveComponent("NuxtLink") : "button"));

const linkProps = computed(() =>
    props.href
        ? { to: props.href, ariaDisabled: props.disabled || undefined }
        : { type: props.type ?? "button", disabled: props.disabled },
);
</script>

<template>
    <component
        :is="tag"
        v-bind="linkProps"
        :data-variant="variant ?? 'primary'"
        @click="!disabled && $emit('click', $event)"
        class="button"
    >
        <slot />
    </component>
</template>

<style scoped>
.button {
    --button-background: var(--color-accent);
    --button-color: hsl(from var(--color-bg) h s calc(l - 20));

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 1ch;
    padding: 0.5lh 2ch;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    background: var(--button-background);
    color: var(--button-color);
    transition: background-color 150ms ease;

    &[data-variant="primary"] {
    }

    &[data-variant="danger"] {
        --button-background: hsl(from var(--color-danger) h calc(s - 30) calc(l + 10));
    }

    &[data-variant="ghost"] {
        --button-background: transparent;
        --button-color: var(--color-text);
        border-color: var(--color-accent);
    }

    &:hover {
        background: hsl(from var(--button-background) h s calc(l + 5));
    }

    &:active {
        background: hsl(from var(--button-background) h s calc(l + 10));
    }

    &:disabled {
        background: hsl(from var(--button-background) h calc(s - 40) calc(l - 30));
        color: hsl(from var(--button-color) h calc(s - 10) calc(l - 10));
        cursor: not-allowed;
    }
}
</style>
