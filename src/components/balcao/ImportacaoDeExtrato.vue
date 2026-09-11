<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { FileUp, TriangleAlert } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsTable from "@/components/ui/GsTable.vue";
import { importarExtrato, type LinhaImportada } from "@/api/balcao";
import { dataCurta, dinheiro } from "@/lib/formato";
import { lerExtrato } from "@/lib/extrato";
import type { Coluna } from "@/types";

const props = defineProps<{ contaId: number }>();
const emit = defineEmits<{ (e: "fechar"): void; (e: "importado", mensagem: string): void }>();

const COLUNAS: Coluna[] = [
  { key: "transactionDate", label: "Data" },
  { key: "description", label: "Histórico" },
  { key: "referenceNumber", label: "Documento" },
  { key: "externalId", label: "Id do banco" },
  { key: "deposit", label: "Entrada", align: "right" },
  { key: "withdrawal", label: "Saída", align: "right" },
];

const linhas = ref<LinhaImportada[]>([]);
const arquivo = ref("");
const falha = ref<string | null>(null);

const total = computed(() =>
  linhas.value.reduce(
    (soma, l) => soma + Number(l.deposit ?? 0) - Number(l.withdrawal ?? 0),
    0,
  ),
);

const semIdentificador = computed(() => linhas.value.filter((l) => !l.externalId).length);

async function escolher(evento: Event): Promise<void> {
  const alvo = evento.target as HTMLInputElement;
  const escolhido = alvo.files?.[0];

  if (!escolhido) return;

  falha.value = null;
  arquivo.value = escolhido.name;

  try {
    linhas.value = lerExtrato(await escolhido.text(), escolhido.name);
    if (linhas.value.length === 0) {
      falha.value = "O arquivo não tem nenhuma linha de movimento que eu consiga ler.";
    }
  } catch (erro: unknown) {
    linhas.value = [];
    falha.value = erro instanceof Error ? erro.message : String(erro);
  }
}

const importar = useMutation({
  mutationFn: () => importarExtrato(props.contaId, linhas.value),
  onSuccess: (resultado) => {
    const entraram = Number(resultado.imported ?? 0);
    const repetidas = Number(resultado.repeated ?? 0);
    emit(
      "importado",
      repetidas > 0
        ? `${entraram} linha(s) importada(s); ${repetidas} já existiam e foram ignoradas.`
        : `${entraram} linha(s) importada(s).`,
    );
  },
  onError: (erro: unknown) => {
    falha.value = erro instanceof Error ? erro.message : String(erro);
  },
});
</script>

<template>
  <GsModal
    titulo="Importar extrato"
    subtitulo="OFX ou CSV. O arquivo é lido aqui no navegador e só as linhas vão para a API."
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

      <label
        class="flex cursor-pointer items-center gap-3 rounded-card border border-dashed border-line-strong bg-app px-4 py-5 transition-colors hover:border-primary"
      >
        <FileUp class="size-5 text-ink-mute" />
        <span class="flex-1 text-body text-ink-soft">
          {{ arquivo || "Escolher arquivo OFX ou CSV" }}
        </span>
        <input type="file" accept=".ofx,.csv,.txt,text/csv" class="hidden" @change="escolher" />
      </label>

      <p v-if="linhas.length > 0" class="text-small text-ink-soft">
        {{ linhas.length }} linha(s), somando {{ dinheiro(total) }}.
        <span v-if="semIdentificador > 0">
          {{ semIdentificador }} sem identificador do banco: reimportar o arquivo vai duplicá-las.
        </span>
        <span v-else>
          Todas trazem identificador do banco, então reimportar o mesmo arquivo não duplica nada.
        </span>
      </p>

      <div v-if="linhas.length > 0" class="max-h-96 overflow-y-auto rounded-card border border-line">
        <GsTable :colunas="COLUNAS" :linhas="linhas">
          <template #linha="{ item }">
            <td class="px-6 py-2.5 whitespace-nowrap text-ink-soft">
              {{ dataCurta(item.transactionDate) }}
            </td>
            <td class="px-6 py-2.5 text-ink">{{ item.description || "—" }}</td>
            <td class="px-6 py-2.5 text-ink-soft">{{ item.referenceNumber || "—" }}</td>
            <td class="px-6 py-2.5 text-ink-mute">{{ item.externalId || "—" }}</td>
            <td class="px-6 py-2.5 text-right tabular-nums text-ink">
              {{ Number(item.deposit ?? 0) === 0 ? "—" : dinheiro(item.deposit) }}
            </td>
            <td class="px-6 py-2.5 text-right tabular-nums text-ink">
              {{ Number(item.withdrawal ?? 0) === 0 ? "—" : dinheiro(item.withdrawal) }}
            </td>
          </template>
        </GsTable>
      </div>

      <div class="flex justify-end gap-2">
        <GsButton variant="secondary" @click="emit('fechar')">Cancelar</GsButton>
        <GsButton
          :disabled="linhas.length === 0 || importar.isPending.value"
          @click="importar.mutate()"
        >
          Importar {{ linhas.length > 0 ? `${linhas.length} linha(s)` : "" }}
        </GsButton>
      </div>
    </div>
  </GsModal>
</template>
