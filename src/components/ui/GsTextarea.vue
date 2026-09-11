<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    hint?: string;
    linhas?: number;
  }>(),
  { linhas: 3 },
);

const model = defineModel<string | null>();
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span v-if="label" class="text-small font-medium text-ink-soft">{{ label }}</span>
    <textarea
      v-model="model"
      :rows="linhas"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      class="w-full resize-y rounded-control border bg-surface px-3 py-2 text-body text-ink transition-colors placeholder:text-ink-mute focus:ring-2 focus:ring-primary/25 focus:outline-none disabled:cursor-not-allowed disabled:bg-app disabled:text-ink-mute"
      :class="invalid ? 'border-danger focus:border-danger' : 'border-line-field focus:border-primary'"
    />
    <span v-if="hint" class="text-small" :class="invalid ? 'text-danger' : 'text-ink-mute'">
      {{ hint }}
    </span>
  </label>
</template>
