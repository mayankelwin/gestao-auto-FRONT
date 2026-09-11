<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { TriangleAlert } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsCombo from "@/components/ui/GsCombo.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsTextarea from "@/components/ui/GsTextarea.vue";
import { lancarDireto, type LinhaDeExtrato } from "@/api/balcao";
import { refCentroDeCusto, refContaAnalitica } from "@/lib/referencias";
import { dataCurta, dinheiro } from "@/lib/formato";

const props = defineProps<{ linha: LinhaDeExtrato }>();
const emit = defineEmits<{ (e: "fechar"): void; (e: "lancado"): void }>();

const contaId = ref<number | null>(null);
const centroDeCustoId = ref<number | null>(null);
const data = ref(String(props.linha.transactionDate ?? "").slice(0, 10));
const historico = ref(String(props.linha.description ?? ""));
const falha = ref<string | null>(null);

const valor = computed(() => Number(props.linha.unallocatedAmount ?? 0));
const entrou = computed(() => Number(props.linha.deposit ?? 0) > 0);

const salvar = useMutation({
  mutationFn: () =>
    lancarDireto(Number(props.linha.id), {
      accountId: Number(contaId.value),
      postingDate: data.value || undefined,
      costCenterId: centroDeCustoId.value ?? undefined,
      remarks: historico.value || undefined,
    }),
  onSuccess: () => emit("lancado"),
  onError: (erro: unknown) => {
    falha.value = erro instanceof Error ? erro.message : String(erro);
  },
});
</script>

<template>
  <GsModal
    titulo="Lançar direto no razão"
    :subtitulo="`${dataCurta(linha.transactionDate)} · ${linha.description || 'sem histórico'} · ${dinheiro(valor)}`"
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

      <p class="text-body text-ink-soft">
        Isto é para a linha que nunca teve documento: tarifa, juro, IOF, rendimento. A conta abaixo é
        a contrapartida — {{ entrou ? "a receita que entrou" : "a despesa que saiu" }}.
      </p>

      <GsCombo
        v-model="contaId"
        label="Contrapartida *"
        :endpoint="refContaAnalitica.endpoint"
        :rotulo="refContaAnalitica.rotulo"
        :filtro="refContaAnalitica.filtro"
        criavel
      />

      <GsInput
        v-model="data"
        label="Data do lançamento"
        type="date"
        hint="Em branco, usa a data da linha do extrato."
      />

      <GsCombo
        v-model="centroDeCustoId"
        label="Centro de custo"
        :endpoint="refCentroDeCusto.endpoint"
        :rotulo="refCentroDeCusto.rotulo"
        limpavel
      />

      <GsTextarea v-model="historico" label="Histórico" />

      <div class="flex justify-end gap-2">
        <GsButton variant="secondary" @click="emit('fechar')">Cancelar</GsButton>
        <GsButton :disabled="contaId === null || salvar.isPending.value" @click="salvar.mutate()">
          Lançar
        </GsButton>
      </div>
    </div>
  </GsModal>
</template>
