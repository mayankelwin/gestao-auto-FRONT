<script setup lang="ts">
import GsCard from "@/components/ui/GsCard.vue";
import GsTable from "@/components/ui/GsTable.vue";
import type { LinhaDeRelatorio } from "@/api/relatorios";
import { dinheiro } from "@/lib/formato";
import type { Coluna } from "@/types";

defineProps<{
  titulo: string;
  linhas: LinhaDeRelatorio[];
  total: number | undefined;
  rotuloTotal: string;
  carregando?: boolean;
  erro?: string;
}>();

const colunas: Coluna[] = [
  { key: "accountNumber", label: "Conta" },
  { key: "accountName", label: "Descrição" },
  { key: "amount", label: "Saldo", align: "right" },
];
</script>

<template>
  <GsCard :title="titulo" flush>
    <GsTable
      :colunas="colunas"
      :linhas="linhas"
      :carregando="carregando"
      :erro="erro"
      :esqueletos="5"
      vazio-texto="Nenhuma conta desta natureza no plano."
    >
      <template #linha="{ item }">
        <td
          class="px-6 py-2.5 whitespace-nowrap text-ink-soft"
          :class="item.group ? 'font-medium text-ink' : ''"
        >
          {{ item.accountNumber ?? "—" }}
        </td>
        <td class="py-2.5 pr-6 text-ink" :class="item.group ? 'font-medium' : ''">
          <span :style="{ paddingLeft: `${1.5 + (item.indent ?? 0) * 1.25}rem` }">
            {{ item.accountName }}
          </span>
        </td>
        <td
          class="px-6 py-2.5 text-right tabular-nums"
          :class="item.group ? 'font-medium text-ink' : 'text-ink-soft'"
        >
          {{ dinheiro(item.amount ?? 0) }}
        </td>
      </template>

      <template #rodape>
        <tr class="border-t border-line-strong bg-app text-body font-medium text-ink">
          <td class="px-6 py-3.5" />
          <td class="py-3.5 pr-6 pl-6">{{ rotuloTotal }}</td>
          <td class="px-6 py-3.5 text-right tabular-nums">{{ dinheiro(total ?? 0) }}</td>
        </tr>
      </template>
    </GsTable>
  </GsCard>
</template>
