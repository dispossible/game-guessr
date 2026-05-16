<script setup lang="ts">
defineProps<{
    class?: string;
}>();
</script>

<template>
    <div :class="['panel', $props.class]">
        <slot />
    </div>
</template>

<style scoped>
.panel {
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 2ch;
}
</style>
