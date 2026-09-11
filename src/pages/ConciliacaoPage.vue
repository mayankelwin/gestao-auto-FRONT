<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Link2, Unlink, Upload, Wallet } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsIconButton from "@/components/ui/GsIconButton.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import GsSelect from "@/components/ui/GsSelect.vue";
import GsTable from "@/components/ui/GsTable.vue";
import DetalheDaLinha from "@/components/balcao/DetalheDaLinha.vue";
import ImportacaoDeExtrato from "@/components/balcao/ImportacaoDeExtrato.vue";
import LancamentoDireto from "@/components/balcao/LancamentoDireto.vue";
import SugestoesDeConciliacao from "@/components/balcao/SugestoesDeConciliacao.vue";
import {
  buscarContasBancarias,
  buscarExtrato,
  buscarResumoDaConciliacao,
  desconciliar,
  type LinhaDeExtrato,
} from "@/api/balcao";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { useAvisos } from "@/lib/avisos";
import { dataCurta, dinheiro, hoje, primeiroDiaDoAno } from "@/lib/formato";
import { rotuloDe, SITUACAO_DA_LINHA_DE_EXTRATO } from "@/lib/opcoes";
import type { BadgeTone, Coluna } from "@/types";

const TOM_DA_SITUACAO: Record<string, BadgeTone> = {
  UNRECONCILED: "warning",
  PARTIALLY_RECONCILED: "info",
  RECONCILED: "success",
  CANCELLED: "neutral",
};

const COLUNAS: Coluna[] = [
  { key: "transactionDate", label: "Data" },
  { key: "description", label: "Histórico" },
  { key: "referenceNumber", label: "Documento" },
  { key: "deposit", label: "Entrada", align: "right" },
  { key: "withdrawal", label: "Saída", align: "right" },
  { key: "unallocatedAmount", label: "Sem documento", align: "right" },
  { key: "status", label: "Situação" },
  { key: "acoes", label: "" },
];

const empresa = useEmpresa();
const tenant = useTenant();
const avisos = useAvisos();
const clienteDeConsulta = useQueryClient();

const contaSelecionada = ref<string | number | null>(null);
const contaId = computed(() =>
  contaSelecionada.value === null || contaSelecionada.value === ""
    ? null
    : Number(contaSelecionada.value),
);
const de = ref(primeiroDiaDoAno());
const ate = ref(hoje());
const mostrar = ref<string | number | null>("abertas");
const soAbertas = computed(() => mostrar.value === "abertas");
const importando = ref(false);
const conciliando = ref<LinhaDeExtrato | null>(null);
const lancando = ref<LinhaDeExtrato | null>(null);
const detalhando = ref<LinhaDeExtrato | null>(null);

const semEmpresa = computed(() => empresa.atualId === null);

const contas = useQuery({
  queryKey: computed(() => ["contas-bancarias", tenant.atual, empresa.atualId]),
  enabled: computed(() => empresa.atualId !== null),
  queryFn: () => buscarContasBancarias(empresa.atualId!),
});

const opcoesDeConta = computed(() =>
  (contas.data.value ?? []).map((c) => ({ value: Number(c.id), label: String(c.name) })),
);

watch(opcoesDeConta, (lista) => {
  if (contaSelecionada.value === null && lista.length > 0) contaSelecionada.value = lista[0].value;
});

const chaveDoExtrato = computed(() => [
  "extrato",
  tenant.atual,
  contaId.value,
  de.value,
  ate.value,
  soAbertas.value,
]);

const extrato = useQuery({
  queryKey: chaveDoExtrato,
  enabled: computed(() => contaId.value !== null && Boolean(de.value) && Boolean(ate.value)),
  placeholderData: keepPreviousData,
  queryFn: () => buscarExtrato(contaId.value!, de.value, ate.value, soAbertas.value),
});

const resumo = useQuery({
  queryKey: computed(() => ["conciliacao-resumo", tenant.atual, contaId.value, ate.value]),
  enabled: computed(() => contaId.value !== null && Boolean(ate.value)),
  placeholderData: keepPreviousData,
  queryFn: () => buscarResumoDaConciliacao(contaId.value!, ate.value),
});

const linhas = computed<LinhaDeExtrato[]>(() => extrato.data.value ?? []);

const inexplicado = computed(() => Number(resumo.data.value?.unexplainedDifference ?? 0));

function atualizar(): void {
  void clienteDeConsulta.invalidateQueries({ queryKey: ["extrato"] });
  void clienteDeConsulta.invalidateQueries({ queryKey: ["conciliacao-resumo"] });
}

const desfazer = useMutation({
  mutationFn: (linha: LinhaDeExtrato) => desconciliar(Number(linha.id)),
  onSuccess: () => {
    avisos.sucesso("Conciliação desfeita.");
    atualizar();
  },
  onError: (erro: unknown) => avisos.falha(erro instanceof Error ? erro.message : String(erro)),
});

const erro = computed(() => {
  if (semEmpresa.value) return EXIGE_EMPRESA;
  if (contas.isError.value) return String(contas.error.value?.message);
  if (opcoesDeConta.value.length === 0 && !contas.isPending.value) {
    return "Nenhuma conta bancária cadastrada. Cadastre uma em Financeiro / Contas Bancárias.";
  }
  return extrato.isError.value ? String(extrato.error.value?.message) : undefined;
});

function podeConciliar(linha: LinhaDeExtrato): boolean {
  return linha.status !== "CANCELLED" && Number(linha.unallocatedAmount ?? 0) !== 0;
}

function podeDesfazer(linha: LinhaDeExtrato): boolean {
  return Number(linha.allocatedAmount ?? 0) !== 0;
}

function concluir(mensagem: string): void {
  conciliando.value = null;
  lancando.value = null;
  importando.value = false;
  avisos.sucesso(mensagem);
  atualizar();
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <GsSelect
          v-model="contaSelecionada"
          label="Conta bancária"
          :options="opcoesDeConta"
          placeholder="Selecione..."
          class="w-64"
        />
        <GsInput v-model="de" label="De" type="date" class="w-40" />
        <GsInput v-model="ate" label="Até" type="date" class="w-40" />
        <GsSelect
          v-model="mostrar"
          label="Mostrar"
          :options="[
            { value: 'abertas', label: 'Só o que falta conciliar' },
            { value: 'tudo', label: 'Tudo' },
          ]"
          class="w-56"
        />
      </div>
      <GsButton :disabled="contaId === null" @click="importando = true">
        <Upload class="size-4" />
        Importar extrato
      </GsButton>
    </div>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GsKpiCard
        label="Saldo no razão"
        :value="dinheiro(resumo.data.value?.ledgerBalance ?? 0)"
        note="O que a contabilidade diz"
      />
      <GsKpiCard
        label="Saldo do extrato"
        :value="dinheiro(resumo.data.value?.statementBalance ?? 0)"
        note="O que o banco mandou"
      />
      <GsKpiCard
        label="Lançado e não caiu"
        :value="dinheiro(resumo.data.value?.unclearedAmount ?? 0)"
        note="Pagamentos ainda sem linha no extrato"
      />
      <GsKpiCard
        label="Diferença inexplicada"
        :value="dinheiro(inexplicado)"
        :note="
          inexplicado === 0
            ? 'Os dois lados se explicam'
            : 'Falta lançamento, ou algum está errado'
        "
        :note-tone="inexplicado === 0 ? 'success' : 'danger'"
      />
    </section>

    <GsCard flush>
      <GsTable
        :colunas="COLUNAS"
        :linhas="linhas"
        :carregando="extrato.isPending.value && !semEmpresa && contaId !== null"
        :erro="erro"
        :esqueletos="8"
        vazio-texto="Nenhuma linha de extrato neste período."
      >
        <template #linha="{ item }">
          <td class="px-6 py-3.5 whitespace-nowrap text-ink-soft">
            {{ dataCurta(item.transactionDate) }}
          </td>
          <td class="px-6 py-3.5">
            <button
              type="button"
              class="cursor-pointer text-left text-ink hover:text-primary hover:underline"
              @click="detalhando = item"
            >
              {{ item.description || "Ver a linha" }}
            </button>
          </td>
          <td class="px-6 py-3.5 text-ink-soft">{{ item.referenceNumber || "—" }}</td>
          <td class="px-6 py-3.5 text-right tabular-nums text-ink">
            {{ Number(item.deposit ?? 0) === 0 ? "—" : dinheiro(item.deposit) }}
          </td>
          <td class="px-6 py-3.5 text-right tabular-nums text-ink">
            {{ Number(item.withdrawal ?? 0) === 0 ? "—" : dinheiro(item.withdrawal) }}
          </td>
          <td
            class="px-6 py-3.5 text-right font-medium tabular-nums"
            :class="Number(item.unallocatedAmount ?? 0) === 0 ? 'text-ink-mute' : 'text-ink'"
          >
            {{ dinheiro(item.unallocatedAmount ?? 0) }}
          </td>
          <td class="px-6 py-3.5">
            <GsBadge :tone="TOM_DA_SITUACAO[item.status ?? ''] ?? 'neutral'">
              {{ rotuloDe(SITUACAO_DA_LINHA_DE_EXTRATO, item.status) }}
            </GsBadge>
          </td>
          <td class="px-6 py-3.5">
            <div class="flex items-center justify-end gap-1">
              <GsIconButton
                v-if="podeConciliar(item)"
                tone="accent"
                label="Casar com um pagamento"
                title="Casar com um pagamento"
                @click="conciliando = item"
              >
                <Link2 class="size-4" />
              </GsIconButton>
              <GsIconButton
                v-if="podeConciliar(item)"
                tone="accent"
                label="Lançar direto no razão"
                title="Tarifa, juro, IOF: lançar direto"
                @click="lancando = item"
              >
                <Wallet class="size-4" />
              </GsIconButton>
              <GsIconButton
                v-if="podeDesfazer(item)"
                tone="danger"
                label="Desfazer conciliação"
                title="Desfazer conciliação"
                @click="desfazer.mutate(item)"
              >
                <Unlink class="size-4" />
              </GsIconButton>
            </div>
          </td>
        </template>
      </GsTable>
    </GsCard>

    <ImportacaoDeExtrato
      v-if="importando && contaId !== null"
      :conta-id="contaId"
      @fechar="importando = false"
      @importado="concluir($event)"
    />

    <SugestoesDeConciliacao
      v-if="conciliando"
      :linha="conciliando"
      @fechar="conciliando = null"
      @conciliado="concluir('Linha conciliada.')"
    />

    <LancamentoDireto
      v-if="lancando"
      :linha="lancando"
      @fechar="lancando = null"
      @lancado="concluir('Lançamento feito.')"
    />

    <DetalheDaLinha
      v-if="detalhando"
      :linha="detalhando"
      @fechar="detalhando = null"
      @mudou="concluir($event)"
    />
  </div>
</template>
