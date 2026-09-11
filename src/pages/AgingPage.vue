<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { ChevronRight } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsIconButton from "@/components/ui/GsIconButton.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import GsSearchBox from "@/components/ui/GsSearchBox.vue";
import GsTabelaCompacta from "@/components/ui/GsTabelaCompacta.vue";
import GsTable from "@/components/ui/GsTable.vue";
import { buscarAPagar, buscarAReceber, type ParceiroEmAberto } from "@/api/relatorios";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { dataCurta, dinheiro, hoje } from "@/lib/formato";
import type { BadgeTone, Coluna } from "@/types";

const FAIXAS = [
  { chave: "notDue", label: "A vencer", tom: "success" as BadgeTone },
  { chave: "days1To30", label: "1–30 dias", tom: "warning" as BadgeTone },
  { chave: "days31To60", label: "31–60 dias", tom: "warning" as BadgeTone },
  { chave: "days61To90", label: "61–90 dias", tom: "danger" as BadgeTone },
  { chave: "over90", label: "+90 dias", tom: "danger" as BadgeTone },
] as const;

const TOM_DA_FAIXA: Record<string, BadgeTone> = {
  NOT_DUE: "success",
  DAYS_1_30: "warning",
  DAYS_31_60: "warning",
  DAYS_61_90: "danger",
  OVER_90: "danger",
};

const ROTULO_DA_FAIXA: Record<string, string> = {
  NOT_DUE: "A vencer",
  DAYS_1_30: "1–30 dias",
  DAYS_31_60: "31–60 dias",
  DAYS_61_90: "61–90 dias",
  OVER_90: "+90 dias",
};

const route = useRoute();
const empresa = useEmpresa();
const tenant = useTenant();

const aReceber = computed(() => route.path === "/contas-a-receber");
const rotuloParceiro = computed(() => (aReceber.value ? "Cliente" : "Fornecedor"));

const asOf = ref(hoje());
const filtro = ref("");
const abertos = ref(new Set<number>());

watch(
  () => route.path,
  () => {
    filtro.value = "";
    abertos.value = new Set();
  },
);

const consulta = useQuery({
  queryKey: computed(() => ["aging", route.path, tenant.atual, empresa.atualId, asOf.value]),
  enabled: computed(() => empresa.atualId !== null && Boolean(asOf.value)),
  placeholderData: keepPreviousData,
  queryFn: () =>
    aReceber.value
      ? buscarAReceber(empresa.atualId!, asOf.value)
      : buscarAPagar(empresa.atualId!, asOf.value),
});

const parceiros = computed<ParceiroEmAberto[]>(() => consulta.data.value ?? []);

const visiveis = computed(() => {
  const termo = filtro.value.trim().toLowerCase();
  if (!termo) return parceiros.value;
  return parceiros.value.filter((p) => (p.partyName ?? "").toLowerCase().includes(termo));
});

function somar(campo: keyof ParceiroEmAberto): number {
  return visiveis.value.reduce((soma, p) => soma + Number(p[campo] ?? 0), 0);
}

const total = computed(() => somar("total"));
const aVencer = computed(() => somar("notDue"));
const vencido = computed(() => total.value - aVencer.value);
const acimaDe90 = computed(() => somar("over90"));

const parcelasVencidas = computed(
  () =>
    visiveis.value.flatMap((p) => p.installments ?? []).filter((i) => Number(i.daysOverdue ?? 0) > 0)
      .length,
);

const semEmpresa = computed(() => empresa.atualId === null);

const erro = computed(() => {
  if (semEmpresa.value) return EXIGE_EMPRESA;
  return consulta.isError.value ? String(consulta.error.value?.message) : undefined;
});

const colunas = computed<Coluna[]>(() => [
  { key: "expandir", label: "" },
  { key: "parceiro", label: rotuloParceiro.value },
  ...FAIXAS.map((f) => ({ key: f.chave, label: f.label, align: "right" as const })),
  { key: "total", label: "Total", align: "right" as const },
]);

const COLUNAS_DE_PARCELA: Coluna[] = [
  { key: "documentNumber", label: "Documento" },
  { key: "scheduleNumber", label: "Parcela" },
  { key: "dueDate", label: "Vencimento" },
  { key: "daysOverdue", label: "Atraso" },
  { key: "bucket", label: "Faixa" },
  { key: "outstandingAmount", label: "Em aberto", align: "right" },
];

function alternar(id: number | undefined): void {
  if (id === undefined) return;
  const proximo = new Set(abertos.value);
  if (proximo.has(id)) proximo.delete(id);
  else proximo.add(id);
  abertos.value = proximo;
}

function expandido(parceiro: ParceiroEmAberto): boolean {
  return parceiro.partyId !== undefined && abertos.value.has(parceiro.partyId);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <GsSearchBox
        v-model="filtro"
        :placeholder="`Filtrar por ${rotuloParceiro.toLowerCase()}`"
        class="w-full max-w-md"
      />
      <GsInput v-model="asOf" label="Posição em" type="date" class="w-44" />
    </div>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GsKpiCard label="Total em aberto" :value="dinheiro(total)" :note="`${visiveis.length} ${rotuloParceiro.toLowerCase()}(s)`" />
      <GsKpiCard label="A vencer" :value="dinheiro(aVencer)" note="Ainda dentro do prazo" note-tone="success" />
      <GsKpiCard
        label="Vencido"
        :value="dinheiro(vencido)"
        :note="`${parcelasVencidas} parcela(s) em atraso`"
        :note-tone="vencido > 0 ? 'danger' : 'muted'"
      />
      <GsKpiCard
        label="Vencido há mais de 90 dias"
        :value="dinheiro(acimaDe90)"
        note="A faixa mais crítica"
        :note-tone="acimaDe90 > 0 ? 'danger' : 'muted'"
      />
    </section>

    <GsCard flush>
      <GsTable
        :colunas="colunas"
        :linhas="visiveis"
        :carregando="consulta.isPending.value && !semEmpresa"
        :erro="erro"
        :esqueletos="6"
        :expandido="expandido"
        :vazio-texto="
          filtro
            ? `Nada encontrado para “${filtro}”.`
            : 'Nenhuma parcela em aberto nesta data.'
        "
      >
        <template #linha="{ item }">
          <td class="py-3.5 pr-0 pl-6">
            <GsIconButton
              size="sm"
              :aria-expanded="expandido(item)"
              :label="expandido(item) ? 'Recolher parcelas' : 'Ver parcelas'"
              @click="alternar(item.partyId)"
            >
              <ChevronRight
                class="size-4 transition-transform"
                :class="expandido(item) ? 'rotate-90' : ''"
              />
            </GsIconButton>
          </td>
          <td class="px-6 py-3.5 font-medium text-ink">{{ item.partyName }}</td>
          <td
            v-for="faixa in FAIXAS"
            :key="faixa.chave"
            class="px-6 py-3.5 text-right tabular-nums"
            :class="Number(item[faixa.chave] ?? 0) === 0 ? 'text-ink-mute' : 'text-ink'"
          >
            {{ dinheiro(item[faixa.chave] ?? 0) }}
          </td>
          <td class="px-6 py-3.5 text-right font-medium tabular-nums text-ink">
            {{ dinheiro(item.total ?? 0) }}
          </td>
        </template>

        <template #detalhe="{ item }">
          <GsTabelaCompacta
            embutida
            :colunas="COLUNAS_DE_PARCELA"
            :linhas="item.installments ?? []"
            :chave="(parcela) => `${parcela.documentNumber}-${parcela.scheduleNumber}`"
          >
            <template #linha="{ item: parcela }">
              <td class="px-6 py-2.5 font-medium whitespace-nowrap text-ink">
                {{ parcela.documentNumber }}
              </td>
              <td class="px-6 py-2.5 text-ink-soft">{{ parcela.scheduleNumber }}</td>
              <td class="px-6 py-2.5 whitespace-nowrap text-ink-soft">
                {{ dataCurta(parcela.dueDate) }}
              </td>
              <td class="px-6 py-2.5 text-ink-soft">
                {{ Number(parcela.daysOverdue ?? 0) > 0 ? `${parcela.daysOverdue} dias` : "—" }}
              </td>
              <td class="px-6 py-2.5">
                <GsBadge :tone="TOM_DA_FAIXA[parcela.bucket ?? ''] ?? 'neutral'">
                  {{ ROTULO_DA_FAIXA[parcela.bucket ?? ""] ?? parcela.bucket }}
                </GsBadge>
              </td>
              <td class="px-6 py-2.5 text-right font-medium tabular-nums text-ink">
                {{ dinheiro(parcela.outstandingAmount ?? 0) }}
              </td>
            </template>
          </GsTabelaCompacta>
        </template>

        <template #rodape>
          <tr class="border-t border-line-strong bg-app text-body font-medium text-ink">
            <td class="py-3.5 pr-0 pl-6" />
            <td class="px-6 py-3.5">Total</td>
            <td
              v-for="faixa in FAIXAS"
              :key="faixa.chave"
              class="px-6 py-3.5 text-right tabular-nums"
            >
              {{ dinheiro(somar(faixa.chave)) }}
            </td>
            <td class="px-6 py-3.5 text-right tabular-nums">{{ dinheiro(total) }}</td>
          </tr>
        </template>
      </GsTable>
    </GsCard>
  </div>
</template>
