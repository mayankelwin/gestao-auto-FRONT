<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { ArrowRight, Check } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import GsTable from "@/components/ui/GsTable.vue";
import { buscarProntidao } from "@/api/balcao";
import { buscarAPagar, buscarAReceber } from "@/api/relatorios";
import { listar, type Registro } from "@/api/lista";
import { useEmpresa } from "@/auth/empresa";
import GsAlerta from "@/components/ui/GsAlerta.vue";
import GsButton from "@/components/ui/GsButton.vue";
import { resolverMensagem } from "@/lib/mensagens";
import { useSessao } from "@/auth/sessao";
import { useTenant } from "@/auth/tenant";
import { dataCurta, dinheiro, hoje } from "@/lib/formato";
import { situacaoDoDocumento } from "@/lib/recursos";
import type { BadgeTone, Coluna } from "@/types";

const empresa = useEmpresa();
const tenant = useTenant();

const habilitado = computed(() => empresa.atualId !== null);
const semEmpresa = computed(() => empresa.atualId === null);

function daqui(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

const prontidao = useQuery({
  queryKey: computed(() => ["prontidao", tenant.atual, empresa.atualId]),
  enabled: habilitado,
  queryFn: () => buscarProntidao(empresa.atualId!),
});

const aReceber = useQuery({
  queryKey: computed(() => ["dashboard-receber", tenant.atual, empresa.atualId]),
  enabled: habilitado,
  queryFn: () => buscarAReceber(empresa.atualId!, hoje()),
});

const aPagar = useQuery({
  queryKey: computed(() => ["dashboard-pagar", tenant.atual, empresa.atualId]),
  enabled: habilitado,
  queryFn: () => buscarAPagar(empresa.atualId!, hoje()),
});

const pedidos = useQuery({
  queryKey: computed(() => ["dashboard-pedidos", tenant.atual, empresa.atualId]),
  enabled: habilitado,
  queryFn: () =>
    listar("/sales-orders", { page: 0, size: 5, companyId: empresa.atualId, sort: "id,desc" }),
});

const periodos = useQuery({
  queryKey: computed(() => ["dashboard-periodos", tenant.atual, empresa.atualId]),
  enabled: habilitado,
  queryFn: () =>
    listar("/accounting-periods/by-company", { page: 0, size: 6, companyId: empresa.atualId }),
});

const lotes = useQuery({
  queryKey: computed(() => ["dashboard-lotes", tenant.atual]),
  queryFn: () => listar("/tracking/batches/expiring", { page: 0, size: 5, until: daqui(60) }),
});

function vencido(lista: { total?: number; notDue?: number }[] | undefined): number {
  return (lista ?? []).reduce((soma, p) => soma + Number(p.total ?? 0) - Number(p.notDue ?? 0), 0);
}

const receberVencido = computed(() => vencido(aReceber.data.value));
const pagarVencido = computed(() => vencido(aPagar.data.value));

const parcelasVencidas = computed(
  () =>
    (aReceber.data.value ?? [])
      .flatMap((p) => p.installments ?? [])
      .filter((i) => Number(i.daysOverdue ?? 0) > 0).length,
);

const passos = computed(() => prontidao.data.value?.steps ?? []);
const pendentes = computed(() => passos.value.filter((p) => !p.done));
const concluidos = computed(() => Number(prontidao.data.value?.done ?? 0));
const totalDePassos = computed(() => Number(prontidao.data.value?.total ?? 0));
const pronto = computed(() => Boolean(prontidao.data.value?.readyToOperate));

const linhasDePedido = computed<Registro[]>(() => pedidos.data.value?.content ?? []);

const COLUNAS_DE_PEDIDO: Coluna[] = [
  { key: "number", label: "Número" },
  { key: "customerName", label: "Cliente" },
  { key: "transactionDate", label: "Data" },
  { key: "deliveryDate", label: "Entrega" },
  { key: "netTotal", label: "Total", align: "right" },
  { key: "status", label: "Situação" },
];
const linhasDePeriodo = computed<Registro[]>(() => periodos.data.value?.content ?? []);
const linhasDeLote = computed<Registro[]>(() => lotes.data.value?.content ?? []);

function diasAte(valor: unknown): number {
  const data = new Date(String(valor));
  return Math.ceil((data.getTime() - Date.now()) / 86_400_000);
}

function tomDoLote(dias: number): BadgeTone {
  if (dias <= 15) return "danger";
  if (dias <= 45) return "warning";
  return "neutral";
}

const sessao = useSessao();
const avisoDeEmpresa = computed(() => resolverMensagem("empresa-nao-selecionada", sessao.papeis));
</script>

<template>
  <div class="flex flex-col gap-4 mt-4">
    <GsAlerta
      v-if="semEmpresa"
      :tom="avisoDeEmpresa.tom"
      :titulo="avisoDeEmpresa.titulo"
      :texto="avisoDeEmpresa.texto"
      :orientacao="avisoDeEmpresa.orientacao"
    >
      <GsButton
        v-if="avisoDeEmpresa.destino"
        variant="secondary"
        class="mt-2 w-fit"
        @click="$router.push(avisoDeEmpresa.destino.rota)"
      >
        {{ avisoDeEmpresa.destino.rotulo }}
      </GsButton>
    </GsAlerta>

    <section
      v-else-if="!pronto || pendentes.length > 0"
      class="rounded-card border border-line bg-surface p-6"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-h3 text-ink">O que falta para operar</h3>
        <GsBadge :tone="pronto ? 'success' : 'warning'">
          {{ concluidos }} de {{ totalDePassos }} passos
        </GsBadge>
      </div>

      <p v-if="prontidao.isPending.value" class="text-body text-ink-mute">Conferindo...</p>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="passo in pendentes"
          :key="passo.key"
          class="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
        >
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-body font-medium text-ink">{{ passo.title }}</span>
            <span class="text-small text-ink-mute">{{ passo.why }}</span>
          </span>
          <RouterLink
            v-if="passo.route"
            :to="passo.route"
            class="flex shrink-0 items-center gap-1.5 text-body font-medium text-primary hover:underline"
          >
            Resolver
            <ArrowRight class="size-4" />
          </RouterLink>
        </li>
      </ul>
    </section>

    <section
      v-else-if="pronto"
      class="flex items-center gap-3 rounded-card border border-success bg-success-bg px-6 py-4"
    >
      <Check class="size-5 shrink-0 text-success" />
      <p class="text-body text-success">
        A empresa está pronta para operar de ponta a ponta: os {{ totalDePassos }} passos estão
        resolvidos.
      </p>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GsKpiCard
        label="A receber vencido"
        :value="dinheiro(receberVencido)"
        :note="`${parcelasVencidas} parcela(s) em atraso`"
        :note-tone="receberVencido > 0 ? 'danger' : 'muted'"
      />
      <GsKpiCard
        label="A pagar vencido"
        :value="dinheiro(pagarVencido)"
        note="O que já passou do prazo"
        :note-tone="pagarVencido > 0 ? 'warning' : 'muted'"
      />
      <GsKpiCard
        label="Clientes com saldo"
        :value="String((aReceber.data.value ?? []).length)"
        note="Parceiros com parcela em aberto"
      />
      <GsKpiCard
        label="Lotes vencendo em 60 dias"
        :value="String(linhasDeLote.length)"
        note="Estoque a girar antes do prazo"
        :note-tone="linhasDeLote.length > 0 ? 'warning' : 'muted'"
      />
    </section>

    <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-card bg-surface p-6">
        <h3 class="mb-4 text-h3 text-ink">Lotes próximos do vencimento</h3>
        <p v-if="linhasDeLote.length === 0" class="text-body text-ink-mute">
          Nenhum lote vence nos próximos 60 dias.
        </p>
        <ul v-else class="flex flex-col gap-3">
          <li
            v-for="lote in linhasDeLote"
            :key="String(lote.id)"
            class="flex items-start justify-between gap-3"
          >
            <span class="flex min-w-0 flex-col">
              <span class="truncate text-body text-ink">{{ lote.itemCode }}</span>
              <span class="text-small text-ink-mute">{{ lote.code }}</span>
            </span>
            <GsBadge :tone="tomDoLote(diasAte(lote.expiryDate))">
              {{ diasAte(lote.expiryDate) }} dias
            </GsBadge>
          </li>
        </ul>
      </div>

      <div class="rounded-card bg-surface p-6">
        <h3 class="mb-4 text-h3 text-ink">Períodos contábeis</h3>
        <p v-if="linhasDePeriodo.length === 0" class="text-body text-ink-mute">
          Nenhum período contábil cadastrado.
        </p>
        <ul v-else class="flex flex-col gap-3">
          <li
            v-for="periodo in linhasDePeriodo"
            :key="String(periodo.id)"
            class="flex items-center justify-between gap-3"
          >
            <span class="text-body text-ink">{{ periodo.name }}</span>
            <GsBadge :tone="periodo.closed ? 'navy' : 'success'">
              {{ periodo.closed ? "Fechado" : "Aberto" }}
            </GsBadge>
          </li>
        </ul>
      </div>
    </section>

    <GsCard title="Pedidos de venda recentes" flush>
      <template #action>
        <RouterLink
          to="/pedidos-de-venda"
          class="flex items-center gap-1.5 text-body font-medium text-ink-soft hover:text-primary"
        >
          Ver todos
          <ArrowRight class="size-4" />
        </RouterLink>
      </template>

      <GsTable
        :colunas="COLUNAS_DE_PEDIDO"
        :linhas="linhasDePedido"
        vazio-texto="Nenhum pedido de venda ainda."
      >
        <template #linha="{ item }">
          <td class="px-6 py-3.5 font-medium text-ink">{{ item.number }}</td>
          <td class="px-6 py-3.5 text-ink">{{ item.customerName }}</td>
          <td class="px-6 py-3.5 text-ink-soft">{{ dataCurta(item.transactionDate) }}</td>
          <td class="px-6 py-3.5 text-ink-soft">{{ dataCurta(item.deliveryDate) }}</td>
          <td class="px-6 py-3.5 text-right font-medium tabular-nums text-ink">
            {{ dinheiro(item.netTotal) }}
          </td>
          <td class="px-6 py-3.5">
            <GsBadge :tone="situacaoDoDocumento(item)?.tom ?? 'neutral'">
              {{ situacaoDoDocumento(item)?.texto ?? "—" }}
            </GsBadge>
          </td>
        </template>
      </GsTable>
    </GsCard>
  </div>
</template>
