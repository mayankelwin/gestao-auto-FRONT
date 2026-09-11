<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  label?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  invalid?: boolean;
  hint?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  maxlength?: number;
  inputmode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  autocomplete?: string;
}>();

const model = defineModel<string | number | null>();

const campo = ref<HTMLInputElement | null>(null);

function focar(): void {
  campo.value?.focus();
  campo.value?.select();
}

defineExpose({ focar });
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span v-if="label" class="text-small font-medium text-ink-soft">{{ label }}</span>
    <input
      ref="campo"
      v-model="model"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :min="min"
      :max="max"
      :step="step"
      :maxlength="maxlength"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :aria-invalid="invalid || undefined"
      class="h-control w-full rounded-control border bg-surface px-3 text-body text-ink transition-colors placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:bg-app disabled:text-ink-mute"
      :class="
        invalid ? 'border-danger focus:border-danger' : 'border-line-field focus:border-primary'
      "
    />
    <span v-if="hint" class="text-small" :class="invalid ? 'text-danger' : 'text-ink-mute'">
      {{ hint }}
    </span>
  </label>
</template>
