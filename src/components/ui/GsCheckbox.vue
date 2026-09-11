<script setup lang="ts">
defineProps<{ label: string; hint?: string; disabled?: boolean }>();

const model = defineModel<boolean>({ default: false });
</script>

<template>
  <label class="flex min-h-control cursor-pointer items-center gap-2.5 select-none">
    <input
      v-model="model"
      type="checkbox"
      :disabled="disabled"
      class="size-4 shrink-0 cursor-pointer rounded-sm border-line-field accent-primary disabled:cursor-not-allowed"
    />
    <span class="flex flex-col">
      <span class="text-body text-ink">{{ label }}</span>
      <span v-if="hint" class="text-small text-ink-mute">{{ hint }}</span>
    </span>
  </label>
</template>
