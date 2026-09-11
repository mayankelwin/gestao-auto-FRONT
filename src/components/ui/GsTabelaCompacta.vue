<script setup lang="ts" generic="T">
import type { Coluna } from "@/types";

defineProps<{
  colunas: Coluna[];
  linhas: T[];
  chave?: (item: T, indice: number) => string | number;
  embutida?: boolean;
}>();

defineSlots<{
  linha(props: { item: T }): unknown;
  rodape?(): unknown;
}>();
</script>

<template>
  <div class="overflow-x-auto" :class="embutida ? '' : 'rounded-card border border-line'">
    <table class="w-full text-body">
      <thead>
        <tr
          class="text-overline text-ink-mute"
          :class="embutida ? 'border-y border-line' : 'border-b border-line bg-app'"
        >
          <th
            v-for="coluna in colunas"
            :key="coluna.key"
            class="px-4 py-2 font-semibold whitespace-nowrap"
            :class="coluna.align === 'right' ? 'text-right' : 'text-left'"
          >
            {{ coluna.label }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(linha, indice) in linhas"
          :key="chave ? chave(linha, indice) : indice"
          class="border-b border-line last:border-0"
        >
          <slot name="linha" :item="linha" />
        </tr>
      </tbody>

      <tfoot v-if="$slots.rodape">
        <slot name="rodape" />
      </tfoot>
    </table>
  </div>
</template>
