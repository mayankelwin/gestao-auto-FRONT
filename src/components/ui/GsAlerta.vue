<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-vue-next";
import type { TomDeMensagem } from "@/lib/mensagens";

withDefaults(
  defineProps<{
    tom?: TomDeMensagem;
    titulo?: string;
    texto: string;
    orientacao?: string;
  }>(),
  { tom: "info" },
);

const icones: Record<TomDeMensagem, unknown> = {
  success: CircleCheck,
  danger: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

const cores: Record<TomDeMensagem, string> = {
  success: "border-success bg-success-bg text-success",
  danger: "border-danger bg-danger-bg text-danger",
  warning: "border-warning bg-warning-bg text-warning",
  info: "border-info bg-info-bg text-info",
};
</script>

<template>
  <div class="flex items-start gap-2.5 rounded-card border px-4 py-3" :class="cores[tom]">
    <component :is="icones[tom]" class="mt-0.5 size-4 shrink-0" />

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p v-if="titulo" class="text-body font-semibold">{{ titulo }}</p>
      <p class="whitespace-pre-line text-body">{{ texto }}</p>
      <p v-if="orientacao" class="text-small opacity-90">{{ orientacao }}</p>
      <slot />
    </div>
  </div>
</template>
