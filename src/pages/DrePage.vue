<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import GsInput from "@/components/ui/GsInput.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import LinhasDeConta from "@/components/relatorios/LinhasDeConta.vue";
import { buscarDre } from "@/api/relatorios";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { dinheiro, hoje, primeiroDiaDoAno } from "@/lib/formato";

const empresa = useEmpresa();
const tenant = useTenant();

const fromDate = ref(primeiroDiaDoAno());
const toDate = ref(hoje());

const periodoValido = computed(
  () => Boolean(fromDate.value) && Boolean(toDate.value) && fromDate.value <= toDate.value,
);

const consulta = useQuery({
  queryKey: computed(() => ["dre", tenant.atual, empresa.atualId, fromDate.value, toDate.value]),
  enabled: computed(() => empresa.atualId !== null && periodoValido.value),
  placeholderData: keepPreviousData,
  queryFn: () => buscarDre(empresa.atualId!, fromDate.value, toDate.value),
});

const dre = computed(() => consulta.data.value);
const semEmpresa = computed(() => empresa.atualId === null);

const erro = computed(() => {
  if (semEmpresa.value) return EXIGE_EMPRESA;
  if (!periodoValido.value) return "O início do período não pode ser depois do fim.";
  return consulta.isError.value ? String(consulta.error.value?.message) : undefined;
});

const carregando = computed(
  () => consulta.isPending.value && !semEmpresa.value && periodoValido.value,
);

const resultado = computed(() => Number(dre.value?.netResult ?? 0));

const margem = computed(() => {
  const receita = Number(dre.value?.totalIncome ?? 0);
  if (receita === 0) return "Sem receita no período";
  return `Margem de ${((resultado.value / receita) * 100).toFixed(1).replace(".", ",")}%`;
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-end gap-4">
      <GsInput v-model="fromDate" label="De" type="date" class="w-44" :invalid="!periodoValido" />
      <GsInput v-model="toDate" label="Até" type="date" class="w-44" :invalid="!periodoValido" />
    </div>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <GsKpiCard label="Receitas" :value="dinheiro(dre?.totalIncome ?? 0)" note="No período" note-tone="success" />
      <GsKpiCard label="Despesas" :value="dinheiro(dre?.totalExpenses ?? 0)" note="No período" note-tone="danger" />
      <GsKpiCard
        label="Resultado"
        :value="dinheiro(resultado)"
        :note="margem"
        :note-tone="resultado < 0 ? 'danger' : 'success'"
      />
    </section>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <LinhasDeConta
        titulo="Receitas"
        :linhas="dre?.income ?? []"
        :total="dre?.totalIncome"
        rotulo-total="Total de receitas"
        :carregando="carregando"
        :erro="erro"
      />
      <LinhasDeConta
        titulo="Despesas"
        :linhas="dre?.expenses ?? []"
        :total="dre?.totalExpenses"
        rotulo-total="Total de despesas"
        :carregando="carregando"
        :erro="erro"
      />
    </div>
  </div>
</template>
