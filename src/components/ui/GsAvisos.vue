<script setup lang="ts">
import { useRouter } from "vue-router";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-vue-next";
import { useAvisos, type Aviso, type TomDeAviso } from "@/lib/avisos";
import type { DestinoDeCorrecao } from "@/lib/mensagens";

const avisos = useAvisos();
const router = useRouter();

const icones: Record<TomDeAviso, unknown> = {
  success: CircleCheck,
  danger: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

const cores: Record<TomDeAviso, string> = {
  success: "border-success bg-success-bg text-success",
  danger: "border-danger bg-danger-bg text-danger",
  warning: "border-warning bg-warning-bg text-warning",
  info: "border-info bg-info-bg text-info",
};

function ir(aviso: Aviso, destino: DestinoDeCorrecao): void {
  avisos.dispensar(aviso.id);
  void router.push({
    path: destino.rota,
    query: destino.campo ? { destacar: destino.campo } : undefined,
  });
}
</script>

<template>
  <div
    class="pointer-events-none fixed right-6 bottom-6 z-50 flex w-full max-w-sm flex-col gap-2"
    role="status"
    aria-live="polite"
  >
    <div
      v-for="aviso in avisos.lista"
      :key="aviso.id"
      class="pointer-events-auto flex items-start gap-2.5 rounded-card border px-4 py-3 shadow-lg"
      :class="cores[aviso.tom]"
    >
      <component :is="icones[aviso.tom]" class="mt-0.5 size-4 shrink-0" />

      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p v-if="aviso.titulo" class="text-body font-semibold">{{ aviso.titulo }}</p>
        <p class="whitespace-pre-line text-body">{{ aviso.texto }}</p>
        <p v-if="aviso.orientacao" class="text-small opacity-90">{{ aviso.orientacao }}</p>

        <button
          v-if="aviso.destino"
          type="button"
          class="mt-1 w-fit cursor-pointer text-small font-medium underline underline-offset-2"
          @click="ir(aviso, aviso.destino)"
        >
          {{ aviso.destino.rotulo }}
        </button>
      </div>

      <button
        type="button"
        class="shrink-0 cursor-pointer opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dispensar"
        @click="avisos.dispensar(aviso.id)"
      >
        <X class="size-4" />
      </button>
    </div>
  </div>
</template>
