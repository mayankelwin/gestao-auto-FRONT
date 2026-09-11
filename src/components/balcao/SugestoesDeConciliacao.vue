<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { Sparkles, TriangleAlert } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsTable from "@/components/ui/GsTable.vue";
import { buscarSugestoes, conciliar, type LinhaDeExtrato } from "@/api/balcao";
import { dataCurta, dinheiro } from "@/lib/formato";
import type { Coluna } from "@/types";

const props = defineProps<{ linha: LinhaDeExtrato }>();
const emit = defineEmits<{ (e: "fechar"): void; (e: "conciliado"): void }>();

const COLUNAS: Coluna[] = [
  { key: "escolha", label: "" },
  { key: "number", label: "Pagamento" },
  { key: "postingDate", label: "Data" },
  { key: "referenceNumber", label: "Comprovante" },
  { key: "allocableAmount", label: "Disponível", align: "right" },
  { key: "rank", label: "Aderência" },
  { key: "allocatedAmount", label: "Levar desta linha", align: "right" },
];

const escolhidos = ref<Record<number, string>>({});
const falha = ref<string | null>(null);

const porConciliar = computed(() => Number(props.linha.unallocatedAmount ?? 0));

const sugestoes = useQuery({
  queryKey: computed(() => ["sugestoes", props.linha.id]),
  queryFn: () => buscarSugestoes(Number(props.linha.id)),
});

const lista = computed(() => sugestoes.data.value ?? []);

const marcados = computed(() =>
  Object.entries(escolhidos.value)
    .map(([id, valor]) => ({ paymentEntryId: Number(id), allocatedAmount: Number(valor) }))
    .filter((a) => a.allocatedAmount > 0),
);

const totalMarcado = computed(() =>
  marcados.value.reduce((soma, a) => soma + a.allocatedAmount, 0),
);

const sobra = computed(() => porConciliar.value - totalMarcado.value);

function alternar(paymentEntryId: number, disponivel: number): void {
  const proximo = { ...escolhidos.value };

  if (proximo[paymentEntryId] !== undefined) {
    delete proximo[paymentEntryId];
  } else {
    const cabe = Math.min(Math.abs(disponivel), Math.abs(sobra.value));
    proximo[paymentEntryId] = String(cabe || Math.abs(disponivel));
  }

  escolhidos.value = proximo;
}

const salvar = useMutation({
  mutationFn: () => conciliar(Number(props.linha.id), { allocations: marcados.value }),
  onSuccess: () => emit("conciliado"),
  onError: (erro: unknown) => {
    falha.value = erro instanceof Error ? erro.message : String(erro);
  },
});

function tom(rank: unknown): "success" | "info" | "neutral" {
  const nota = Number(rank ?? 0);
  if (nota >= 3) return "success";
  if (nota >= 1) return "info";
  return "neutral";
}
</script>

<template>
  <GsModal
    titulo="Casar com um pagamento"
    :subtitulo="`${dataCurta(linha.transactionDate)} · ${linha.description || 'sem histórico'} · ${dinheiro(porConciliar)} sem documento`"
    largura="cheia"
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

      <div class="rounded-card border border-line">
        <GsTable
          :colunas="COLUNAS"
          :linhas="lista"
          :carregando="sugestoes.isPending.value"
          :erro="sugestoes.isError.value ? String(sugestoes.error.value?.message) : undefined"
          :esqueletos="4"
          vazio-texto="Nenhum pagamento em aberto parecido com esta linha. Se ela é tarifa ou juro, use o lançamento direto."
        >
          <template #linha="{ item }">
            <td class="py-3 pr-0 pl-6">
              <input
                type="checkbox"
                class="size-4 cursor-pointer accent-primary"
                :checked="escolhidos[Number(item.paymentEntryId)] !== undefined"
                :aria-label="`Usar o pagamento ${item.number}`"
                @change="alternar(Number(item.paymentEntryId), Number(item.allocableAmount ?? 0))"
              />
            </td>
            <td class="px-6 py-3 font-medium text-ink">{{ item.number }}</td>
            <td class="px-6 py-3 whitespace-nowrap text-ink-soft">
              {{ dataCurta(item.postingDate) }}
            </td>
            <td class="px-6 py-3 text-ink-soft">{{ item.referenceNumber || "—" }}</td>
            <td class="px-6 py-3 text-right tabular-nums text-ink">
              {{ dinheiro(item.allocableAmount) }}
            </td>
            <td class="px-6 py-3">
              <GsBadge :tone="tom(item.rank)">
                {{ item.exactReference ? "Comprovante idêntico" : `Nota ${item.rank ?? 0}` }}
              </GsBadge>
            </td>
            <td class="px-6 py-3">
              <GsInput
                v-if="escolhidos[Number(item.paymentEntryId)] !== undefined"
                v-model="escolhidos[Number(item.paymentEntryId)]"
                type="number"
                class="w-36"
              />
              <span v-else class="block text-right text-ink-mute">—</span>
            </td>
          </template>
        </GsTable>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-body text-ink-soft">
          {{ dinheiro(totalMarcado) }} de {{ dinheiro(porConciliar) }} marcado.
          <span v-if="sobra > 0.004">Sobram {{ dinheiro(sobra) }} sem documento nesta linha.</span>
          <span v-else-if="sobra < -0.004" class="text-danger">
            Você marcou {{ dinheiro(-sobra) }} a mais do que a linha tem.
          </span>
          <span v-else class="text-success">A linha fica explicada por inteiro.</span>
        </p>

        <div class="flex gap-2">
          <GsButton variant="secondary" @click="emit('fechar')">Cancelar</GsButton>
          <GsButton
            :disabled="marcados.length === 0 || salvar.isPending.value"
            @click="salvar.mutate()"
          >
            <Sparkles class="size-4" />
            Conciliar
          </GsButton>
        </div>
      </div>
    </div>
  </GsModal>
</template>
