<script setup lang="ts">
import { computed } from "vue";
import type { BadgeTone } from "@/types";

const props = withDefaults(defineProps<{ tone?: BadgeTone }>(), { tone: "neutral" });

const tones: Record<BadgeTone, string> = {
  neutral: "bg-neutral-bg text-neutral",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  navy: "bg-navy text-ink-invert",
};

const classes = computed(() => tones[props.tone]);
</script>

<template>
  <span
    class="inline-flex items-center rounded-badge px-2 py-0.5 text-micro font-medium whitespace-nowrap"
    :class="classes"
  >
    <slot />
  </span>
</template>
