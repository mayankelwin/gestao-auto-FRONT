<script setup lang="ts">
import { computed } from "vue";
import type { NoteTone } from "@/types";

const props = withDefaults(
  defineProps<{ label: string; value: string; note?: string; noteTone?: NoteTone }>(),
  { noteTone: "muted" },
);

const noteClass = computed(
  () =>
    ({
      muted: "text-primary",
      success: "text-success",
      danger: "text-danger",
      warning: "text-warning",
    })[props.noteTone],
);
</script>

<template>
  <div
    class="flex min-h-[110px] flex-col justify-center gap-1 rounded-card border border-line bg-surface px-5 py-4"
  >
    <span class="text-small font-medium text-ink-soft">{{ label }}</span>
    <span class="text-value text-ink">{{ value }}</span>
    <span v-if="note" class="text-micro" :class="noteClass">{{ note }}</span>
  </div>
</template>
