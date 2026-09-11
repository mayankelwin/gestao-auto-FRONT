<script setup lang="ts">
import { Search } from "lucide-vue-next";

withDefaults(defineProps<{ placeholder?: string; disabled?: boolean }>(), {
  placeholder: "Buscar...",
});

const model = defineModel<string>({ default: "" });
</script>

<template>
  <div class="relative">
    <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-mute" />
    <input
      v-model="model"
      type="search"
      :placeholder="placeholder"
      :disabled="disabled"
      class="h-control w-full rounded-control border border-line-field bg-surface pr-3 pl-9 text-body text-ink transition-colors placeholder:text-ink-mute focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:bg-app"
    />
  </div>
</template>
