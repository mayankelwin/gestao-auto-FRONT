<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { TriangleAlert } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsTabelaCompacta from "@/components/ui/GsTabelaCompacta.vue";
import GsTextarea from "@/components/ui/GsTextarea.vue";
import { fecharTurno } from "@/api/balcao";
import { buscarUm } from "@/api/recurso";
import type { Registro } from "@/api/lista";
import { dinheiro } from "@/lib/formato";
import type { Coluna } from "@/types";

const COLUNAS: Coluna[] = [
  { key: "nome", label: "Meio" },
  { key: "esperado", label: "Esperado", align: "right" },
  { key: "contado", label: "Contado", align: "right" },
  { key: "diferenca", label: "Diferença", align: "right" },
];

const props = defineProps<{ turno: Registro }>();
const emit = defineEmits<{ (e: "fechar"): void; (e: "fechado"): void }>();

const contado = ref<Record<number, string>>({});
const observacoes = ref("");
const falha = ref<string | null>(null);

const detalhe = useQuery({
  queryKey: computed(() => ["turno", props.turno.id]),
  queryFn: () => buscarUm("/pos/shifts", Number(props.turno.id)),
});

interface MeioDoTurno {
  id: number;
  nome: string;
  esperado: number;
}

const meios = computed<MeioDoTurno[]>(() => {
  const bruto = detalhe.data.value?.payments;
  if (!Array.isArray(bruto)) return [];

  return (bruto as Registro[]).map((p) => ({
    id: Number(p.paymentMethodId),
    nome: String(p.paymentMethodName ?? p.paymentMethodId),
    esperado: Number(p.expectedAmount ?? 0),
  }));
});

function diferenca(meio: MeioDoTurno): number {
  const valor = contado.value[meio.id];
  if (valor === undefined || valor === "") return 0;
  return Number(valor) - meio.esperado;
}

const totalDaDiferenca = computed(() =>
  meios.value.reduce((soma, meio) => soma + diferenca(meio), 0),
);

const naoContados = computed(
  () => meios.value.filter((m) => contado.value[m.id] === undefined || contado.value[m.id] === "")
    .length,
);

const fechar = useMutation({
  mutationFn: () =>
    fecharTurno(Number(props.turno.id), {
      countedBalances: meios.value.map((m) => ({
        paymentMethodId: m.id,
        amount: Number(contado.value[m.id] ?? 0),
      })),
      remarks: observacoes.value || undefined,
    }),
  onSuccess: () => emit("fechado"),
  onError: (erro: unknown) => {
    falha.value = erro instanceof Error ? erro.message : String(erro);
  },
});
</script>

<template>
  <GsModal
    :titulo="`Fechar o turno ${turno.number}`"
    subtitulo="Conte cada meio. A diferença vai para o razão, contra a conta de quebra de caixa."
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

      <p v-if="detalhe.isPending.value" class="text-body text-ink-mute">Carregando o turno...</p>

      <GsTabelaCompacta v-else :colunas="COLUNAS" :linhas="meios" :chave="(meio) => meio.id">
        <template #linha="{ item }">
          <td class="px-4 py-2.5 font-medium text-ink">{{ item.nome }}</td>
          <td class="px-4 py-2.5 text-right tabular-nums text-ink-soft">
            {{ dinheiro(item.esperado) }}
          </td>
          <td class="px-4 py-2 text-right">
            <GsInput v-model="contado[item.id]" type="number" placeholder="0,00" class="w-36" />
          </td>
          <td
            class="px-4 py-2.5 text-right font-medium tabular-nums"
            :class="diferenca(item) === 0 ? 'text-ink-mute' : 'text-danger'"
          >
            {{ dinheiro(diferenca(item)) }}
          </td>
        </template>

        <template #rodape>
          <tr class="border-t border-line-strong bg-app font-medium text-ink">
            <td class="px-4 py-2.5" colspan="3">Diferença total</td>
            <td
              class="px-4 py-2.5 text-right tabular-nums"
              :class="totalDaDiferenca === 0 ? 'text-ink' : 'text-danger'"
            >
              {{ dinheiro(totalDaDiferenca) }}
            </td>
          </tr>
        </template>
      </GsTabelaCompacta>

      <p v-if="naoContados > 0" class="text-small text-ink-mute">
        {{ naoContados }} meio(s) sem contagem entram como zero.
      </p>

      <GsTextarea v-model="observacoes" label="Observações do fechamento" />

      <div class="flex justify-end gap-2">
        <GsButton variant="secondary" @click="emit('fechar')">Cancelar</GsButton>
        <GsButton
          :disabled="meios.length === 0 || fechar.isPending.value"
          @click="fechar.mutate()"
        >
          Fechar turno
        </GsButton>
      </div>
    </div>
  </GsModal>
</template>
