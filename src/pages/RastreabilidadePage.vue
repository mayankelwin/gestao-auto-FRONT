<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Plus, Search } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsCombo from "@/components/ui/GsCombo.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsSelect from "@/components/ui/GsSelect.vue";
import GsTable from "@/components/ui/GsTable.vue";
import SubRecurso from "@/components/form/SubRecurso.vue";
import { listar, type Registro } from "@/api/lista";
import { criar, postarComConsulta } from "@/api/recurso";
import { useSessao } from "@/auth/sessao";
import { useAvisos } from "@/lib/avisos";
import { dataCurta, hoje } from "@/lib/formato";
import { opcoesDe, rotuloDe, SITUACAO_DA_UNIDADE } from "@/lib/opcoes";
import { paineisDeItem } from "@/lib/subrecursos";
import { refItem } from "@/lib/referencias";
import type { BadgeTone, Coluna } from "@/types";

const OPCOES_SITUACAO = opcoesDe(SITUACAO_DA_UNIDADE);

const TOM: Record<string, BadgeTone> = {
  AVAILABLE: "success",
  DELIVERED: "info",
  CONSUMED: "neutral",
  SCRAPPED: "danger",
};

const sessao = useSessao();
const avisos = useAvisos();
const clienteDeConsulta = useQueryClient();

const itemId = ref<number | null>(null);
const aba = ref<"lotes" | "series" | "vencendo">("lotes");
const situacao = ref<string | number | null>(null);
const ate = ref(hoje());
const codigoBuscado = ref("");

const podeEscrever = computed(() => sessao.temPapel("OPERADOR"));

const itemEscolhido = computed<Registro | null>(() =>
  itemId.value === null ? null : { id: itemId.value },
);

const definicaoDeLotes = paineisDeItem.find((p) => p.chave === "lotes-do-item")!;

const series = useQuery({
  queryKey: computed(() => ["series", itemId.value, situacao.value]),
  enabled: computed(() => itemId.value !== null && aba.value === "series"),
  queryFn: () =>
    listar(`/tracking/items/${itemId.value}/serials`, {
      page: 0,
      size: 100,
      ...(situacao.value ? { status: situacao.value } : {}),
    }),
});

const vencendo = useQuery({
  queryKey: computed(() => ["lotes-vencendo", ate.value]),
  enabled: computed(() => aba.value === "vencendo" && Boolean(ate.value)),
  queryFn: () => listar("/tracking/batches/expiring", { page: 0, size: 200, until: ate.value }),
});

const buscaPorCodigo = useQuery({
  queryKey: computed(() => ["serial-por-codigo", codigoBuscado.value]),
  enabled: computed(() => codigoBuscado.value.length > 0),
  queryFn: () => listar("/tracking/serials/by-code", { page: 0, size: 1, code: codigoBuscado.value }),
});

const criandoSerie = ref(false);
const novaSerie = ref({ code: "", batchId: null as number | null, warrantyExpiryDate: "", notes: "" });

const cadastrarSerie = useMutation({
  mutationFn: () =>
    criar(`/tracking/items/${itemId.value}/serials`, {
      code: novaSerie.value.code,
      batchId: novaSerie.value.batchId ?? undefined,
      warrantyExpiryDate: novaSerie.value.warrantyExpiryDate || undefined,
      notes: novaSerie.value.notes || undefined,
    }),
  onSuccess: () => {
    void clienteDeConsulta.invalidateQueries({ queryKey: ["series"] });
    avisos.sucesso("Unidade cadastrada.");
    criandoSerie.value = false;
    novaSerie.value = { code: "", batchId: null, warrantyExpiryDate: "", notes: "" };
  },
  onError: (e: unknown) => avisos.falha(e instanceof Error ? e.message : String(e)),
});

const mudarSituacao = useMutation({
  mutationFn: ({ id, status }: { id: number; status: string }) =>
    postarComConsulta(`/tracking/serials/${id}/status`, { status }, "PUT"),
  onSuccess: () => {
    void clienteDeConsulta.invalidateQueries({ queryKey: ["series"] });
    avisos.sucesso("Situação atualizada.");
  },
  onError: (e: unknown) => avisos.falha(e instanceof Error ? e.message : String(e)),
});

const colunasDeSerie: Coluna[] = [
  { key: "code", label: "Número de série" },
  { key: "batchCode", label: "Lote" },
  { key: "warrantyExpiryDate", label: "Garantia até" },
  { key: "status", label: "Situação" },
  { key: "acoes", label: "" },
];

const colunasDeVencendo: Coluna[] = [
  { key: "code", label: "Lote" },
  { key: "itemCode", label: "Item" },
  { key: "itemName", label: "Descrição" },
  { key: "expiryDate", label: "Validade" },
];
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end gap-4">
      <GsCombo
        v-model="itemId"
        label="Item"
        :endpoint="refItem.endpoint"
        :rotulo="refItem.rotulo"
        busca
        placeholder="Escolha um item para ver lotes e séries"
        class="w-full max-w-lg"
      />
    </div>

    <nav class="flex flex-wrap gap-1 border-b border-line">
      <button
        v-for="opcao in [
          { chave: 'lotes', rotulo: 'Lotes do item' },
          { chave: 'series', rotulo: 'Números de série' },
          { chave: 'vencendo', rotulo: 'Lotes vencendo' },
        ]"
        :key="opcao.chave"
        type="button"
        class="-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-body font-medium transition-colors"
        :class="
          aba === opcao.chave
            ? 'border-primary text-primary'
            : 'border-transparent text-ink-soft hover:text-ink'
        "
        @click="aba = opcao.chave as typeof aba"
      >
        {{ opcao.rotulo }}
      </button>
    </nav>

    <GsCard v-if="aba !== 'vencendo' && !itemEscolhido">
      <p class="text-body text-ink-soft">
        Escolha um item acima. Lote e número de série existem sempre em relação a um item — a API não
        expõe listagem geral.
      </p>
    </GsCard>

    <template v-else-if="aba === 'lotes' && itemEscolhido">
      <GsCard flush>
        <div class="px-6 py-5">
          <SubRecurso :definicao="definicaoDeLotes" :registro="itemEscolhido" />
        </div>
      </GsCard>
    </template>

    <template v-else-if="aba === 'series' && itemEscolhido">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <GsSelect
          v-model="situacao"
          label="Situação"
          placeholder="Todas"
          :options="OPCOES_SITUACAO"
          class="w-56"
        />
        <GsButton v-if="podeEscrever" variant="primary" @click="criandoSerie = true">
          <Plus class="size-4" />
          Cadastrar unidade
        </GsButton>
      </div>

      <GsCard flush>
        <GsTable
          :colunas="colunasDeSerie"
          :linhas="series.data.value?.content ?? []"
          :carregando="series.isPending.value"
          :erro="series.isError.value ? String(series.error.value?.message) : undefined"
          :esqueletos="5"
          vazio-texto="Nenhuma unidade cadastrada para este item."
        >
          <template #linha="{ item }">
            <td class="px-6 py-3 font-medium whitespace-nowrap text-ink">{{ item.code }}</td>
            <td class="px-6 py-3 text-ink-soft">{{ item.batchCode ?? "—" }}</td>
            <td class="px-6 py-3 whitespace-nowrap text-ink-soft">
              {{ dataCurta(item.warrantyExpiryDate) }}
            </td>
            <td class="px-6 py-3">
              <GsBadge :tone="TOM[String(item.status)] ?? 'neutral'">
                {{ rotuloDe(SITUACAO_DA_UNIDADE, item.status) }}
              </GsBadge>
            </td>
            <td class="px-6 py-2">
              <GsSelect
                v-if="podeEscrever"
                :model-value="String(item.status)"
                :options="OPCOES_SITUACAO"
                class="w-44"
                @update:model-value="
                  mudarSituacao.mutate({ id: Number(item.id), status: String($event) })
                "
              />
            </td>
          </template>
        </GsTable>
      </GsCard>
    </template>

    <template v-else-if="aba === 'vencendo'">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <GsInput v-model="ate" label="Vencendo até" type="date" class="w-48" />
        <div class="flex items-end gap-2">
          <GsInput
            v-model="codigoBuscado"
            label="Buscar unidade pelo número de série"
            placeholder="SN-000123"
            class="w-72"
          />
          <Search class="mb-3 size-4 text-ink-mute" />
        </div>
      </div>

      <GsCard v-if="codigoBuscado" flush>
        <div class="px-6 py-4">
          <p v-if="buscaPorCodigo.isPending.value" class="text-body text-ink-mute">Buscando...</p>
          <p v-else-if="buscaPorCodigo.isError.value" class="text-body text-danger">
            {{ buscaPorCodigo.error.value?.message }}
          </p>
          <div
            v-for="unidade in buscaPorCodigo.data.value?.content ?? []"
            :key="String(unidade.id)"
            class="flex flex-wrap items-center gap-3"
          >
            <span class="text-body font-medium text-ink">{{ unidade.code }}</span>
            <span class="text-body text-ink-soft">{{ unidade.itemName ?? unidade.itemCode }}</span>
            <GsBadge :tone="TOM[String(unidade.status)] ?? 'neutral'">
              {{ rotuloDe(SITUACAO_DA_UNIDADE, unidade.status) }}
            </GsBadge>
          </div>
        </div>
      </GsCard>

      <GsCard flush>
        <GsTable
          :colunas="colunasDeVencendo"
          :linhas="vencendo.data.value?.content ?? []"
          :carregando="vencendo.isPending.value"
          :erro="vencendo.isError.value ? String(vencendo.error.value?.message) : undefined"
          :esqueletos="5"
          vazio-texto="Nenhum lote vence até esta data."
        >
          <template #linha="{ item }">
            <td class="px-6 py-3 font-medium whitespace-nowrap text-ink">{{ item.code }}</td>
            <td class="px-6 py-3 whitespace-nowrap text-ink">{{ item.itemCode ?? "—" }}</td>
            <td class="px-6 py-3 text-ink-soft">{{ item.itemName ?? "—" }}</td>
            <td class="px-6 py-3 whitespace-nowrap text-ink-soft">
              {{ dataCurta(item.expiryDate) }}
            </td>
          </template>
        </GsTable>
      </GsCard>
    </template>

    <GsModal
      v-if="criandoSerie"
      titulo="Cadastrar unidade identificada"
      largura="media"
      @fechar="criandoSerie = false"
    >
      <div class="flex flex-col gap-4">
        <GsInput v-model="novaSerie.code" label="Número de série *" />
        <GsCombo
          v-model="novaSerie.batchId"
          label="Lote"
          :endpoint="`/tracking/items/${itemId}/batches`"
          :rotulo="(r) => String(r.code ?? r.id)"
          limpavel
        />
        <GsInput v-model="novaSerie.warrantyExpiryDate" label="Garantia até" type="date" />
        <GsInput v-model="novaSerie.notes" label="Observações" />
      </div>

      <template #rodape>
        <GsButton variant="secondary" @click="criandoSerie = false">Cancelar</GsButton>
        <GsButton
          variant="primary"
          :disabled="cadastrarSerie.isPending.value || !novaSerie.code"
          @click="cadastrarSerie.mutate()"
        >
          {{ cadastrarSerie.isPending.value ? "Salvando..." : "Cadastrar" }}
        </GsButton>
      </template>
    </GsModal>
  </div>
</template>
