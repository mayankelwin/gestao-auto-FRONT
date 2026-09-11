<script setup lang="ts">
import marca from "@/assets/logo-mark.png";

withDefaults(defineProps<{ size?: number; withWordmark?: boolean }>(), {
  size: 32,
  withWordmark: false,
});
</script>

<template>
  <div class="flex items-center gap-2.5">
    <span
      class="block shrink-0 overflow-clip"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <img :src="marca" alt="Gestão Auto" width="100%" height="100%" class="size-full object-contain" />
    </span>

    <span v-if="withWordmark" class="flex flex-col leading-none">
      <span class="text-body font-semibold tracking-wide text-ink-invert">Gestão Auto</span>
      <span class="mt-1 text-[0.5rem] font-semibold tracking-[0.14em] text-yellow">
        DADOS · PLANEJAMENTO · RESULTADOS
      </span>
    </span>
  </div>
</template>
