<script setup lang="ts">
import { computed, ref } from "vue";
import type { PontoMensal } from "@/types";

const props = defineProps<{ dados: PontoMensal[] }>();

const maximo = computed(() =>
  Math.max(...props.dados.flatMap((d) => [d.vendas, d.compras]), 1),
);

function altura(valor: number): string {
  return `${(valor / maximo.value) * 100}%`;
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const foco = ref<{ mes: string; serie: string; valor: number } | null>(null);
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-6 flex items-start justify-between">
      <h3 class="text-h3 text-ink">Vendas × Compras — últimos 6 meses</h3>

      <div class="flex shrink-0 items-center gap-4">
        <span class="flex items-center gap-1.5 text-small text-ink-soft">
          <span class="size-2 rounded-full bg-primary" />
          Vendas
        </span>
        <span class="flex items-center gap-1.5 text-small text-ink-soft">
          <span class="size-2 rounded-full bg-blue" />
          Compras
        </span>
      </div>
    </div>

    <div class="relative min-h-[280px] flex-1">
      <div
        v-if="foco"
        class="pointer-events-none absolute top-0 right-0 z-10 rounded-control border border-line bg-surface px-3 py-2 text-small shadow-sm"
      >
        <p class="font-medium text-ink">{{ foco.mes }} · {{ foco.serie }}</p>
        <p class="text-ink-soft">{{ moeda.format(foco.valor) }}</p>
      </div>

      <div class="flex h-full items-end justify-around gap-2 border-b border-line pb-0">
        <div v-for="ponto in dados" :key="ponto.mes" class="flex h-full flex-1 flex-col">
          <div class="flex flex-1 items-end justify-center gap-0.5">
            <div
              class="w-5 rounded-t-[4px] bg-primary transition-opacity hover:opacity-80"
              :style="{ height: altura(ponto.vendas) }"
              @mouseenter="foco = { mes: ponto.mes, serie: 'Vendas', valor: ponto.vendas }"
              @mouseleave="foco = null"
            />
            <div
              class="w-5 rounded-t-[4px] bg-blue transition-opacity hover:opacity-80"
              :style="{ height: altura(ponto.compras) }"
              @mouseenter="foco = { mes: ponto.mes, serie: 'Compras', valor: ponto.compras }"
              @mouseleave="foco = null"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-around gap-2 pt-2">
        <span v-for="ponto in dados" :key="ponto.mes" class="flex-1 text-center text-small text-ink-mute">
          {{ ponto.mes }}
        </span>
      </div>
    </div>
  </div>
</template>
