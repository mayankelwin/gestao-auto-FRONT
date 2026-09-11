<script setup lang="ts" generic="T">
import { Inbox, TriangleAlert } from "lucide-vue-next";
import type { Coluna } from "@/types";

defineProps<{
  colunas: Coluna[];
  linhas: T[];
  carregando?: boolean;
  erro?: string;
  vazioTexto?: string;
  esqueletos?: number;
  expandido?: (item: T) => boolean;
}>();

defineSlots<{
  linha(props: { item: T }): unknown;
  detalhe?(props: { item: T }): unknown;
  rodape?(): unknown;
  vazio?(): unknown;
}>();
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-body">
      <thead>
        <tr class="border-y border-line text-overline text-ink-mute">
          <th
            v-for="coluna in colunas"
            :key="coluna.key"
            class="px-6 py-3 font-semibold whitespace-nowrap"
            :class="coluna.align === 'right' ? 'text-right' : 'text-left'"
          >
            {{ coluna.label }}
          </th>
        </tr>
      </thead>

      <tbody>
        <template v-if="carregando">
          <tr v-for="n in esqueletos ?? 8" :key="`esqueleto-${n}`" class="border-b border-line">
            <td v-for="coluna in colunas" :key="coluna.key" class="px-6 py-3.5">
              <span class="block h-3.5 w-full animate-pulse rounded-sm bg-neutral-bg" />
            </td>
          </tr>
        </template>

        <tr v-else-if="erro">
          <td :colspan="colunas.length" class="px-6 py-16">
            <div class="flex flex-col items-center gap-2 text-center">
              <TriangleAlert class="size-7 text-danger" />
              <p class="text-body text-ink">{{ erro }}</p>
            </div>
          </td>
        </tr>

        <tr v-else-if="linhas.length === 0">
          <td :colspan="colunas.length" class="px-6 py-16">
            <slot name="vazio">
              <div class="flex flex-col items-center gap-2 text-center">
                <Inbox class="size-7 text-ink-mute" />
                <p class="text-body text-ink-soft">{{ vazioTexto ?? "Nada por aqui ainda." }}</p>
              </div>
            </slot>
          </td>
        </tr>

        <template v-for="(linha, indice) in carregando || erro ? [] : linhas" :key="indice">
          <tr class="border-b border-line last:border-0 hover:bg-app">
            <slot name="linha" :item="linha" />
          </tr>
          <tr v-if="$slots.detalhe && expandido?.(linha)" class="border-b border-line bg-app">
            <td :colspan="colunas.length" class="p-0">
              <slot name="detalhe" :item="linha" />
            </td>
          </tr>
        </template>
      </tbody>

      <tfoot v-if="$slots.rodape && !carregando && !erro && linhas.length > 0">
        <slot name="rodape" />
      </tfoot>
    </table>
  </div>
</template>
