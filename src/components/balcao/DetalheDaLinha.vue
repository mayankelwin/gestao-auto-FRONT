<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { Ban, Trash2, TriangleAlert } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsTabelaCompacta from "@/components/ui/GsTabelaCompacta.vue";
import { cancelarLinha, type LinhaDeExtrato } from "@/api/balcao";
import { buscarUm, excluir } from "@/api/recurso";
import type { Registro } from "@/api/lista";
import { dataCurta, dinheiro } from "@/lib/formato";
import { rotuloDe, SITUACAO_DA_LINHA_DE_EXTRATO } from "@/lib/opcoes";
import type { BadgeTone, Coluna } from "@/types";

const COLUNAS_DE_ALOCACAO: Coluna[] = [
  { key: "referenceNumber", label: "Documento" },
  { key: "referenceType", label: "Espécie" },
  { key: "allocatedAmount", label: "Valor", align: "right" },
];

const TOM_DA_SITUACAO: Record<string, BadgeTone> = {
  UNRECONCILED: "warning",
  PARTIALLY_RECONCILED: "info",
  RECONCILED: "success",
  CANCELLED: "neutral",
};

const props = defineProps<{ linha: LinhaDeExtrato }>();
const emit = defineEmits<{
  (e: "fechar"): void;
  (e: "mudou", mensagem: string): void;
}>();

const motivo = ref("");
const cancelando = ref(false);
const excluindo = ref(false);
const falha = ref<string | null>(null);

const detalhe = useQuery({
  queryKey: computed(() => ["linha-de-extrato", props.linha.id]),
  queryFn: () => buscarUm("/bank-transactions", Number(props.linha.id)),
});

const linha = computed(() => (detalhe.data.value ?? props.linha) as LinhaDeExtrato);
const alocacoes = computed(() => (linha.value.allocations ?? []) as Registro[]);

const podeCancelar = computed(() => linha.value.status !== "CANCELLED");
const podeExcluir = computed(() => Number(linha.value.allocatedAmount ?? 0) === 0);

function reclamar(erro: unknown): void {
  falha.value = erro instanceof Error ? erro.message : String(erro);
}

const cancelar = useMutation({
  mutationFn: () => cancelarLinha(Number(props.linha.id), motivo.value),
  onSuccess: () => emit("mudou", "Linha cancelada."),
  onError: reclamar,
});

const apagar = useMutation({
  mutationFn: () => excluir("/bank-transactions", Number(props.linha.id)),
  onSuccess: () => emit("mudou", "Linha apagada."),
  onError: reclamar,
});
</script>

<template>
  <GsModal
    :titulo="`Linha ${linha.number ?? ''}`"
    :subtitulo="`${dataCurta(linha.transactionDate)} · ${linha.description || 'sem histórico'}`"
    largura="larga"
    @fechar="emit('fechar')"
  >
    <div class="flex flex-col gap-5">
      <div
        v-if="falha"
        class="flex items-start gap-2.5 rounded-card border border-danger bg-danger-bg px-4 py-3"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-danger" />
        <p class="text-body text-danger">{{ falha }}</p>
      </div>

      <dl class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="flex flex-col gap-0.5">
          <dt class="text-small font-medium text-ink-soft">Situação</dt>
          <dd>
            <GsBadge :tone="TOM_DA_SITUACAO[linha.status ?? ''] ?? 'neutral'">
              {{ rotuloDe(SITUACAO_DA_LINHA_DE_EXTRATO, linha.status) }}
            </GsBadge>
          </dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-small font-medium text-ink-soft">Movimento</dt>
          <dd class="text-body tabular-nums text-ink">
            {{ dinheiro(Number(linha.deposit ?? 0) - Number(linha.withdrawal ?? 0)) }}
          </dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-small font-medium text-ink-soft">Sem documento</dt>
          <dd class="text-body tabular-nums text-ink">
            {{ dinheiro(linha.unallocatedAmount ?? 0) }}
          </dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-small font-medium text-ink-soft">Documento no extrato</dt>
          <dd class="text-body text-ink">{{ linha.referenceNumber || "—" }}</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-small font-medium text-ink-soft">Identificador do banco</dt>
          <dd class="text-body text-ink-mute">{{ linha.externalId || "—" }}</dd>
        </div>
        <div v-if="linha.cancelledReason" class="flex flex-col gap-0.5">
          <dt class="text-small font-medium text-ink-soft">Motivo do cancelamento</dt>
          <dd class="text-body text-ink">{{ linha.cancelledReason }}</dd>
        </div>
      </dl>

      <section class="flex flex-col gap-3">
        <h3 class="text-overline text-ink-mute uppercase">O que explica esta linha</h3>
        <p v-if="alocacoes.length === 0" class="text-body text-ink-mute">
          Nada ainda. Case com um pagamento, ou lance direto se for tarifa ou juro.
        </p>
        <GsTabelaCompacta v-else :colunas="COLUNAS_DE_ALOCACAO" :linhas="alocacoes">
          <template #linha="{ item }">
            <td class="px-4 py-2.5 font-medium text-ink">
              {{ item.referenceNumber ?? item.referenceId }}
            </td>
            <td class="px-4 py-2.5 text-ink-soft">{{ item.referenceType ?? "—" }}</td>
            <td class="px-4 py-2.5 text-right tabular-nums text-ink">
              {{ dinheiro(item.allocatedAmount) }}
            </td>
          </template>
        </GsTabelaCompacta>
      </section>

      <div v-if="cancelando" class="flex flex-col gap-3 rounded-card border border-line bg-app p-4">
        <p class="text-body text-ink-soft">
          Cancelar mantém a linha no extrato, marcada como cancelada. Use quando o banco estornou.
        </p>
        <GsInput v-model="motivo" label="Motivo" placeholder="Estorno do banco" />
        <div class="flex justify-end gap-2">
          <GsButton variant="secondary" @click="cancelando = false">Voltar</GsButton>
          <GsButton
            variant="danger"
            :disabled="motivo.trim() === '' || cancelar.isPending.value"
            @click="cancelar.mutate()"
          >
            Cancelar a linha
          </GsButton>
        </div>
      </div>

      <div v-else-if="excluindo" class="flex flex-col gap-3 rounded-card border border-line bg-app p-4">
        <p class="text-body text-ink-soft">
          Apagar tira a linha do extrato como se nunca tivesse sido importada. Só faça isso quando a
          importação foi errada — reimportar o arquivo a traz de volta.
        </p>
        <div class="flex justify-end gap-2">
          <GsButton variant="secondary" @click="excluindo = false">Voltar</GsButton>
          <GsButton variant="danger" :disabled="apagar.isPending.value" @click="apagar.mutate()">
            Apagar
          </GsButton>
        </div>
      </div>

      <div v-else class="flex flex-wrap justify-end gap-2">
        <GsButton v-if="podeCancelar" variant="secondary" @click="cancelando = true">
          <Ban class="size-4" />
          Cancelar linha
        </GsButton>
        <GsButton v-if="podeExcluir" variant="secondary" @click="excluindo = true">
          <Trash2 class="size-4" />
          Apagar
        </GsButton>
        <GsButton @click="emit('fechar')">Fechar</GsButton>
      </div>
    </div>
  </GsModal>
</template>
