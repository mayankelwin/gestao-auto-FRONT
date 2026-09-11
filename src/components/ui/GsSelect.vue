<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import type { SelectOption } from "@/types";

defineProps<{
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  invalid?: boolean;
  hint?: string;
  limpavel?: boolean;
}>();

const model = defineModel<string | number | null>();
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span v-if="label" class="text-small font-medium text-ink-soft">{{ label }}</span>
    <div class="relative">
      <select
        v-model="model"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        class="h-control w-full appearance-none rounded-control border bg-surface px-3 pr-9 text-body text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:bg-app disabled:text-ink-mute"
        :class="[
          invalid ? 'border-danger focus:border-danger' : 'border-line-field focus:border-primary',
          model === null || model === undefined || model === '' ? 'text-ink-mute' : '',
        ]"
      >
        <option v-if="placeholder" :value="null" :disabled="!limpavel">{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <ChevronDown
        class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
      />
    </div>
    <span v-if="hint" class="text-small" :class="invalid ? 'text-danger' : 'text-ink-mute'">
      {{ hint }}
    </span>
  </label>
</template>
