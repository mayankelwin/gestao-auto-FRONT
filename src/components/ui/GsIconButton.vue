<script setup lang="ts">
import { computed } from "vue";
import type { IconButtonSize, IconButtonTone } from "@/types";

const props = withDefaults(
  defineProps<{
    label: string;
    tone?: IconButtonTone;
    size?: IconButtonSize;
    title?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  }>(),
  { tone: "neutral", size: "md", type: "button", disabled: false },
);

const tones: Record<IconButtonTone, string> = {
  neutral: "text-ink-mute hover:bg-neutral-bg hover:text-ink",
  danger: "text-ink-mute hover:bg-danger-bg hover:text-danger",
  accent: "text-ink-mute hover:bg-primary-50 hover:text-primary",
  soft: "text-ink-soft hover:bg-app",
  alerta: "text-danger hover:bg-danger-bg",
};

const sizes: Record<IconButtonSize, string> = {
  sm: "size-6",
  md: "size-8",
  lg: "size-control",
};

const classes = computed(() => [tones[props.tone], sizes[props.size]]);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-label="label"
    :title="title"
    class="flex cursor-pointer items-center justify-center rounded-control transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
    :class="classes"
  >
    <slot />
  </button>
</template>
