<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import GsCheckbox from "@/components/ui/GsCheckbox.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import { buscarSaldoDaConta } from "@/api/relatorios";
import type { Registro } from "@/api/lista";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { dinheiro, hoje } from "@/lib/formato";

const props = defineProps<{ registro: Registro }>();

const empresa = useEmpresa();

const asOfDate = ref(hoje());
const comDescendentes = ref(false);

const consulta = useQuery({
  queryKey: computed(() => [
    "saldo-da-conta",
    empresa.atualId,
    props.registro.id,
    asOfDate.value,
    comDescendentes.value,
  ]),
  enabled: computed(() => empresa.atualId !== null && Boolean(asOfDate.value)),
  queryFn: () =>
    buscarSaldoDaConta(
      empresa.atualId!,
      Number(props.registro.id),
      asOfDate.value,
      comDescendentes.value,
    ),
});

const saldo = computed(() => consulta.data.value);

const erro = computed(() => {
  if (empresa.atualId === null) return EXIGE_EMPRESA;
  return consulta.isError.value ? String(consulta.error.value?.message) : null;
});

const lado = computed(() => {
  const valor = String(saldo.value?.side ?? "");
  if (valor === "DEBIT") return "Devedor";
  if (valor === "CREDIT") return "Credor";
  return valor || "—";
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end gap-5">
      <GsInput v-model="asOfDate" label="Saldo em" type="date" class="w-44" />
      <GsCheckbox
        v-model="comDescendentes"
        label="Somar as contas subordinadas"
        hint="Numa conta sintética, é o que dá o saldo do grupo inteiro."
      />
    </div>

    <p v-if="erro" class="text-body text-danger">{{ erro }}</p>
    <p v-else-if="consulta.isPending.value" class="text-body text-ink-mute">Carregando saldo...</p>

    <section v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GsKpiCard label="Débitos" :value="dinheiro(saldo?.totalDebit ?? 0)" note="Acumulado" />
      <GsKpiCard label="Créditos" :value="dinheiro(saldo?.totalCredit ?? 0)" note="Acumulado" />
      <GsKpiCard
        label="Saldo"
        :value="dinheiro(saldo?.balance ?? 0)"
        :note="lado"
        :note-tone="Number(saldo?.balance ?? 0) < 0 ? 'danger' : 'success'"
      />
      <GsKpiCard
        label="Abrangência"
        :value="saldo?.includesDescendants ? 'Com filhas' : 'Só esta conta'"
        :note="saldo?.currency ?? '—'"
      />
    </section>
  </div>
</template>
