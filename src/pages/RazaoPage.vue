<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import GsCard from "@/components/ui/GsCard.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import GsSelect from "@/components/ui/GsSelect.vue";
import GsTable from "@/components/ui/GsTable.vue";
import { buscarPlanoDeContas, buscarRazao, type NoDoPlano } from "@/api/relatorios";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { dataCurta, dinheiro, hoje, primeiroDiaDoAno } from "@/lib/formato";
import type { Coluna, SelectOption } from "@/types";

const empresa = useEmpresa();
const tenant = useTenant();

const contaId = ref<string | number | null>(null);
const fromDate = ref(primeiroDiaDoAno());
const toDate = ref(hoje());

const periodoValido = computed(
  () => Boolean(fromDate.value) && Boolean(toDate.value) && fromDate.value <= toDate.value,
);

const semEmpresa = computed(() => empresa.atualId === null);

const plano = useQuery({
  queryKey: computed(() => ["plano-de-contas", tenant.atual, empresa.atualId]),
  enabled: computed(() => empresa.atualId !== null),
  queryFn: () => buscarPlanoDeContas(empresa.atualId!),
});

function analiticas(nos: NoDoPlano[]): NoDoPlano[] {
  return nos.flatMap((no) => [
    ...(no.group || no.disabled ? [] : [no]),
    ...analiticas(no.children ?? []),
  ]);
}

const contas = computed<SelectOption[]>(() =>
  analiticas(plano.data.value ?? [])
    .filter((c) => c.id !== undefined)
    .map((c) => ({
      value: c.id!,
      label: c.accountNumber ? `${c.accountNumber} — ${c.name}` : String(c.name),
    })),
);

watch(contas, (lista) => {
  if (contaId.value === null && lista.length > 0) contaId.value = lista[0].value;
  if (contaId.value !== null && !lista.some((c) => c.value === contaId.value)) {
    contaId.value = lista[0]?.value ?? null;
  }
});

const consulta = useQuery({
  queryKey: computed(() => [
    "razao",
    tenant.atual,
    empresa.atualId,
    contaId.value,
    fromDate.value,
    toDate.value,
  ]),
  enabled: computed(
    () => empresa.atualId !== null && contaId.value !== null && periodoValido.value,
  ),
  placeholderData: keepPreviousData,
  queryFn: () =>
    buscarRazao(empresa.atualId!, Number(contaId.value), fromDate.value, toDate.value),
});

const razao = computed(() => consulta.data.value);
const linhas = computed(() => razao.value?.rows ?? []);

const erro = computed(() => {
  if (semEmpresa.value) return EXIGE_EMPRESA;
  if (!periodoValido.value) return "O início do período não pode ser depois do fim.";
  if (plano.isError.value) return String(plano.error.value?.message);
  if (contaId.value === null && !plano.isPending.value) {
    return "Este plano de contas não tem nenhuma conta analítica para extrair o razão.";
  }
  return consulta.isError.value ? String(consulta.error.value?.message) : undefined;
});

const carregando = computed(
  () => (plano.isPending.value || consulta.isPending.value) && !semEmpresa.value && !erro.value,
);

const colunas: Coluna[] = [
  { key: "postingDate", label: "Data" },
  { key: "voucher", label: "Documento" },
  { key: "remarks", label: "Histórico" },
  { key: "debit", label: "Débito", align: "right" },
  { key: "credit", label: "Crédito", align: "right" },
  { key: "balance", label: "Saldo", align: "right" },
];
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end gap-4">
      <GsSelect
        v-model="contaId"
        label="Conta"
        placeholder="Selecione uma conta"
        :options="contas"
        :disabled="contas.length === 0"
        class="w-full max-w-md"
      />
      <span class="flex-1" />
      <GsInput v-model="fromDate" label="De" type="date" class="w-44" :invalid="!periodoValido" />
      <GsInput v-model="toDate" label="Até" type="date" class="w-44" :invalid="!periodoValido" />
    </div>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GsKpiCard
        label="Saldo de abertura"
        :value="dinheiro(razao?.openingBalance ?? 0)"
        note="O que é anterior ao período"
      />
      <GsKpiCard label="Débitos" :value="dinheiro(razao?.totalDebit ?? 0)" note="No período" />
      <GsKpiCard label="Créditos" :value="dinheiro(razao?.totalCredit ?? 0)" note="No período" />
      <GsKpiCard
        label="Saldo final"
        :value="dinheiro(razao?.closingBalance ?? 0)"
        :note="razao?.accountName ?? '—'"
        :note-tone="Number(razao?.closingBalance ?? 0) < 0 ? 'danger' : 'success'"
      />
    </section>

    <GsCard flush>
      <GsTable
        :colunas="colunas"
        :linhas="linhas"
        :carregando="carregando"
        :erro="erro"
        :esqueletos="8"
        vazio-texto="Nenhum lançamento nesta conta durante o período."
      >
        <template #linha="{ item }">
          <td class="px-6 py-3.5 whitespace-nowrap text-ink-soft">
            {{ dataCurta(item.postingDate) }}
          </td>
          <td class="px-6 py-3.5 font-medium whitespace-nowrap text-ink">
            {{ item.voucherNumber ?? "—" }}
            <span v-if="item.voucherType" class="block text-small font-normal text-ink-mute">
              {{ item.voucherType }}
            </span>
          </td>
          <td class="px-6 py-3.5 text-ink">{{ item.remarks ?? "—" }}</td>
          <td
            class="px-6 py-3.5 text-right tabular-nums"
            :class="Number(item.debit ?? 0) === 0 ? 'text-ink-mute' : 'text-ink'"
          >
            {{ dinheiro(item.debit ?? 0) }}
          </td>
          <td
            class="px-6 py-3.5 text-right tabular-nums"
            :class="Number(item.credit ?? 0) === 0 ? 'text-ink-mute' : 'text-ink'"
          >
            {{ dinheiro(item.credit ?? 0) }}
          </td>
          <td class="px-6 py-3.5 text-right font-medium tabular-nums text-ink">
            {{ dinheiro(item.balance ?? 0) }}
          </td>
        </template>

        <template #rodape>
          <tr class="border-t border-line-strong bg-app text-body font-medium text-ink">
            <td class="px-6 py-3.5" colspan="3">Saldo final do período</td>
            <td class="px-6 py-3.5 text-right tabular-nums">
              {{ dinheiro(razao?.totalDebit ?? 0) }}
            </td>
            <td class="px-6 py-3.5 text-right tabular-nums">
              {{ dinheiro(razao?.totalCredit ?? 0) }}
            </td>
            <td class="px-6 py-3.5 text-right tabular-nums">
              {{ dinheiro(razao?.closingBalance ?? 0) }}
            </td>
          </tr>
        </template>
      </GsTable>
    </GsCard>
  </div>
</template>
