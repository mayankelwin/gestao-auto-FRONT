<script setup lang="ts">
import { computed } from "vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsTabelaCompacta from "@/components/ui/GsTabelaCompacta.vue";
import type { CupomDaVenda } from "@/api/balcao";
import { dinheiro } from "@/lib/formato";
import type { Coluna } from "@/types";

const COLUNAS: Coluna[] = [
  { key: "item", label: "Item" },
  { key: "quantity", label: "Qtd.", align: "right" },
  { key: "rate", label: "Preço", align: "right" },
  { key: "amount", label: "Total", align: "right" },
];

const props = defineProps<{ cupom: CupomDaVenda }>();
const emit = defineEmits<{ (e: "fechar"): void }>();

const fatura = computed(() => props.cupom.invoice);
const itens = computed(() => fatura.value?.items ?? []);
</script>

<template>
  <GsModal
    titulo="Venda registrada"
    :subtitulo="`Fatura ${fatura?.number ?? ''} lançada com baixa de estoque.`"
    @fechar="emit('fechar')"
  >
    <div class="flex flex-col gap-5">
      <GsTabelaCompacta :colunas="COLUNAS" :linhas="itens">
        <template #linha="{ item }">
          <td class="px-4 py-2.5 text-ink">{{ item.itemName ?? item.description }}</td>
          <td class="px-4 py-2.5 text-right tabular-nums text-ink-soft">{{ item.quantity }}</td>
          <td class="px-4 py-2.5 text-right tabular-nums text-ink-soft">
            {{ dinheiro(item.rate) }}
          </td>
          <td class="px-4 py-2.5 text-right tabular-nums text-ink">{{ dinheiro(item.amount) }}</td>
        </template>
      </GsTabelaCompacta>

      <dl class="flex flex-col gap-2 text-body">
        <div class="flex justify-between">
          <dt class="text-ink-soft">Total da venda</dt>
          <dd class="font-medium tabular-nums text-ink">{{ dinheiro(cupom.total) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-ink-soft">Recebido</dt>
          <dd class="tabular-nums text-ink">{{ dinheiro(cupom.paidAmount) }}</dd>
        </div>
        <div class="flex justify-between border-t border-line pt-2">
          <dt class="font-medium text-ink">Troco</dt>
          <dd class="text-kpi font-semibold tabular-nums text-ink">
            {{ dinheiro(cupom.changeAmount) }}
          </dd>
        </div>
      </dl>

      <div class="flex justify-end gap-2">
        <GsButton variant="secondary" @click="emit('fechar')">Fechar</GsButton>
        <GsButton @click="emit('fechar')">Nova venda</GsButton>
      </div>
    </div>
  </GsModal>
</template>
