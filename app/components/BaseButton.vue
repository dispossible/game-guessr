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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 1ch;
    padding: 0.5lh 2ch;
    border-radius: 8px;
    cursor: pointer;
    border: 0;

    &[data-variant="primary"] {
        background: var(--accent);
        color: #0b0e15;
    }

    &[data-variant="danger"] {
        background: var(--danger);
        color: #0b0e15;
    }

    &[data-variant="ghost"] {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--border);
    }
}
</style>
