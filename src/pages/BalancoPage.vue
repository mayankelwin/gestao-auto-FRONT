<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { CircleAlert, CircleCheck } from "lucide-vue-next";
import GsCard from "@/components/ui/GsCard.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import LinhasDeConta from "@/components/relatorios/LinhasDeConta.vue";
import { buscarBalanco } from "@/api/relatorios";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { dataCurta, dinheiro, hoje } from "@/lib/formato";

const empresa = useEmpresa();
const tenant = useTenant();

const asOf = ref(hoje());

const consulta = useQuery({
  queryKey: computed(() => ["balanco", tenant.atual, empresa.atualId, asOf.value]),
  enabled: computed(() => empresa.atualId !== null && Boolean(asOf.value)),
  placeholderData: keepPreviousData,
  queryFn: () => buscarBalanco(empresa.atualId!, asOf.value),
});

const balanco = computed(() => consulta.data.value);
const semEmpresa = computed(() => empresa.atualId === null);

const erro = computed(() => {
  if (semEmpresa.value) return EXIGE_EMPRESA;
  return consulta.isError.value ? String(consulta.error.value?.message) : undefined;
});

const carregando = computed(() => consulta.isPending.value && !semEmpresa.value);
const confere = computed(() => balanco.value?.consistent === true);
const divergencia = computed(
  () => Number(balanco.value?.unclosedResult ?? 0) - Number(balanco.value?.accumulatedResult ?? 0),
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-end gap-4">
      <GsInput v-model="asOf" label="Posição em" type="date" class="w-44" />
    </div>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GsKpiCard label="Ativo" :value="dinheiro(balanco?.totalAssets ?? 0)" :note="dataCurta(balanco?.asOf ?? asOf)" />
      <GsKpiCard label="Passivo" :value="dinheiro(balanco?.totalLiabilities ?? 0)" note="Obrigações com terceiros" />
      <GsKpiCard label="Patrimônio líquido" :value="dinheiro(balanco?.totalEquity ?? 0)" note="Sem o resultado do exercício" />
      <GsKpiCard
        label="Resultado não encerrado"
        :value="dinheiro(balanco?.unclosedResult ?? 0)"
        note="Ativo menos passivo e patrimônio"
        :note-tone="Number(balanco?.unclosedResult ?? 0) < 0 ? 'danger' : 'success'"
      />
    </section>

    <GsCard v-if="balanco && !erro">
      <div class="flex items-start gap-3">
        <component
          :is="confere ? CircleCheck : CircleAlert"
          class="mt-0.5 size-5 shrink-0"
          :class="confere ? 'text-success' : 'text-danger'"
        />
        <div class="flex flex-col gap-1">
          <p class="text-body font-medium text-ink">
            {{ confere ? "O balanço confere com a DRE." : "O balanço não confere com a DRE." }}
          </p>
          <p class="text-small text-ink-soft">
            O resultado que o balanço deduz ({{ dinheiro(balanco.unclosedResult ?? 0) }}) é
            comparado ao que a DRE acumula até esta data
            ({{ dinheiro(balanco.accumulatedResult ?? 0) }}).
            <template v-if="!confere">
              A diferença de {{ dinheiro(divergencia) }} indica conta com natureza errada no plano,
              ou lançamento que não fechou em partidas dobradas.
            </template>
          </p>
        </div>
      </div>
    </GsCard>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <LinhasDeConta
        titulo="Ativo"
        :linhas="balanco?.assets ?? []"
        :total="balanco?.totalAssets"
        rotulo-total="Total do ativo"
        :carregando="carregando"
        :erro="erro"
      />

      <div class="flex flex-col gap-4">
        <LinhasDeConta
          titulo="Passivo"
          :linhas="balanco?.liabilities ?? []"
          :total="balanco?.totalLiabilities"
          rotulo-total="Total do passivo"
          :carregando="carregando"
          :erro="erro"
        />
        <LinhasDeConta
          titulo="Patrimônio líquido"
          :linhas="balanco?.equity ?? []"
          :total="balanco?.totalEquity"
          rotulo-total="Total do patrimônio líquido"
          :carregando="carregando"
          :erro="erro"
        />
      </div>
    </div>
  </div>
</template>
