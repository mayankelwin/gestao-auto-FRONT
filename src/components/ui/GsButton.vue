<script setup lang="ts">
import { computed } from "vue";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  }>(),
  { variant: "primary", type: "button", disabled: false },
);

const variants: Record<Variant, string> = {
  primary: "bg-primary border-primary-dark text-ink-invert shadow-control hover:bg-primary-dark",
  secondary: "bg-surface border-line text-ink shadow-control hover:bg-app",
  ghost: "bg-transparent border-transparent text-ink-soft hover:bg-neutral-bg",
  danger: "bg-danger border-danger text-ink-invert shadow-control hover:brightness-95",
};

const classes = computed(() => variants[props.variant]);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex h-control cursor-pointer items-center justify-center gap-2 rounded-control border px-5 text-body font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
    :class="classes"
  >
    <slot />
  </button>
</template>
