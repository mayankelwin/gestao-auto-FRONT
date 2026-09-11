<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import GsCard from "@/components/ui/GsCard.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import GsSearchBox from "@/components/ui/GsSearchBox.vue";
import GsTable from "@/components/ui/GsTable.vue";
import { buscarBalancete, type LinhaDoBalancete } from "@/api/relatorios";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { dinheiro, hoje, primeiroDiaDoAno } from "@/lib/formato";
import type { Coluna } from "@/types";

const empresa = useEmpresa();
const tenant = useTenant();

const fromDate = ref(primeiroDiaDoAno());
const toDate = ref(hoje());
const filtro = ref("");

const periodoValido = computed(
  () => Boolean(fromDate.value) && Boolean(toDate.value) && fromDate.value <= toDate.value,
);

const semEmpresa = computed(() => empresa.atualId === null);

const consulta = useQuery({
  queryKey: computed(() => [
    "balancete",
    tenant.atual,
    empresa.atualId,
    fromDate.value,
    toDate.value,
  ]),
  enabled: computed(() => empresa.atualId !== null && periodoValido.value),
  placeholderData: keepPreviousData,
  queryFn: () => buscarBalancete(empresa.atualId!, fromDate.value, toDate.value),
});

const todas = computed<LinhaDoBalancete[]>(() => consulta.data.value ?? []);

const linhas = computed(() => {
  const termo = filtro.value.trim().toLowerCase();
  if (!termo) return todas.value;
  return todas.value.filter((l) =>
    `${l.accountNumber ?? ""} ${l.accountName ?? ""}`.toLowerCase().includes(termo),
  );
});

function somar(campo: keyof LinhaDoBalancete): number {
  return linhas.value.reduce((soma, l) => soma + Number(l[campo] ?? 0), 0);
}

const totalDebito = computed(() => somar("periodDebit"));
const totalCredito = computed(() => somar("periodCredit"));
const diferenca = computed(() => totalDebito.value - totalCredito.value);

const erro = computed(() => {
  if (semEmpresa.value) return EXIGE_EMPRESA;
  if (!periodoValido.value) return "O início do período não pode ser depois do fim.";
  return consulta.isError.value ? String(consulta.error.value?.message) : undefined;
});

const colunas: Coluna[] = [
  { key: "accountNumber", label: "Conta" },
  { key: "accountName", label: "Descrição" },
  { key: "openingBalance", label: "Saldo anterior", align: "right" },
  { key: "periodDebit", label: "Débito", align: "right" },
  { key: "periodCredit", label: "Crédito", align: "right" },
  { key: "closingBalance", label: "Saldo atual", align: "right" },
];
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <GsSearchBox v-model="filtro" placeholder="Filtrar por conta" class="w-full max-w-md" />
      <div class="flex items-end gap-3">
        <GsInput v-model="fromDate" label="De" type="date" class="w-44" :invalid="!periodoValido" />
        <GsInput v-model="toDate" label="Até" type="date" class="w-44" :invalid="!periodoValido" />
      </div>
    </div>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <GsKpiCard label="Total de débitos" :value="dinheiro(totalDebito)" note="No período" />
      <GsKpiCard label="Total de créditos" :value="dinheiro(totalCredito)" note="No período" />
      <GsKpiCard
        label="Diferença"
        :value="dinheiro(diferenca)"
        :note="
          diferenca === 0
            ? 'Débitos e créditos fecham'
            : 'Partidas dobradas não fecham no período'
        "
        :note-tone="diferenca === 0 ? 'success' : 'danger'"
      />
    </section>

    <GsCard flush>
      <GsTable
        :colunas="colunas"
        :linhas="linhas"
        :carregando="consulta.isPending.value && !semEmpresa && periodoValido"
        :erro="erro"
        :esqueletos="10"
        :vazio-texto="
          filtro ? `Nada encontrado para “${filtro}”.` : 'Nenhuma conta no balancete.'
        "
      >
        <template #linha="{ item }">
          <td class="px-6 py-2.5 font-medium whitespace-nowrap text-ink">
            {{ item.accountNumber ?? "—" }}
          </td>
          <td class="px-6 py-2.5 text-ink">{{ item.accountName }}</td>
          <td class="px-6 py-2.5 text-right tabular-nums text-ink-soft">
            {{ dinheiro(item.openingBalance ?? 0) }}
          </td>
          <td class="px-6 py-2.5 text-right tabular-nums text-ink">
            {{ dinheiro(item.periodDebit ?? 0) }}
          </td>
          <td class="px-6 py-2.5 text-right tabular-nums text-ink">
            {{ dinheiro(item.periodCredit ?? 0) }}
          </td>
          <td class="px-6 py-2.5 text-right font-medium tabular-nums text-ink">
            {{ dinheiro(item.closingBalance ?? 0) }}
          </td>
        </template>

        <template #rodape>
          <tr class="border-t border-line-strong bg-app text-body font-medium text-ink">
            <td class="px-6 py-3.5" colspan="3">Totais do período</td>
            <td class="px-6 py-3.5 text-right tabular-nums">{{ dinheiro(totalDebito) }}</td>
            <td class="px-6 py-3.5 text-right tabular-nums">{{ dinheiro(totalCredito) }}</td>
            <td class="px-6 py-3.5 text-right tabular-nums">{{ dinheiro(somar("closingBalance")) }}</td>
          </tr>
        </template>
      </GsTable>
    </GsCard>
  </div>
</template>
