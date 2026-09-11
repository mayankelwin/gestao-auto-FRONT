<script setup lang="ts">
import { computed } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsIconButton from "@/components/ui/GsIconButton.vue";
import GsCampo from "./GsCampo.vue";
import { dinheiro } from "@/lib/formato";
import { valoresDeLinha, type LinhasDeFormulario, type Valores } from "@/lib/formulario";

const props = defineProps<{ definicao: LinhasDeFormulario; erro?: string }>();

const linhas = defineModel<Valores[]>({ required: true });

const total = computed(() => {
  const calculo = props.definicao.total;
  if (!calculo) return null;
  return linhas.value.reduce((soma, linha) => soma + calculo(linha), 0);
});

function acrescentar(): void {
  linhas.value = [...linhas.value, valoresDeLinha(props.definicao)];
}

function remover(indice: number): void {
  linhas.value = linhas.value.filter((_, i) => i !== indice);
}

const larguras: Record<string, string> = {
  referencia: "min-w-[15rem]",
  texto: "min-w-[10rem]",
  textoLongo: "min-w-[12rem]",
  data: "w-40",
  inteiro: "w-28",
  decimal: "w-32",
  dinheiro: "w-36",
  opcoes: "w-44",
  booleano: "w-24",
};
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-4">
      <h3 class="text-overline text-ink-mute uppercase">
        {{ definicao.titulo }}
        <span v-if="definicao.obrigatorio" class="text-danger">*</span>
      </h3>
      <GsButton variant="secondary" @click="acrescentar">
        <Plus class="size-4" />
        {{ definicao.rotuloNovo }}
      </GsButton>
    </div>

    <p v-if="erro" class="text-small text-danger">{{ erro }}</p>

    <div class="overflow-x-auto rounded-card border border-line">
      <table class="w-full">
        <thead>
          <tr class="border-b border-line bg-app text-overline text-ink-mute">
            <th class="px-3 py-2 text-left font-semibold">#</th>
            <th
              v-for="coluna in definicao.colunas"
              :key="coluna.campo"
              class="px-3 py-2 text-left font-semibold whitespace-nowrap"
            >
              {{ coluna.label }}<span v-if="coluna.obrigatorio" class="text-danger"> *</span>
            </th>
            <th class="px-3 py-2" />
          </tr>
        </thead>

        <tbody>
          <tr v-if="linhas.length === 0">
            <td :colspan="definicao.colunas.length + 2" class="px-3 py-8 text-center">
              <p class="text-body text-ink-mute">Nenhuma linha ainda.</p>
            </td>
          </tr>

          <tr
            v-for="(linha, indice) in linhas"
            :key="indice"
            class="border-b border-line last:border-0 align-top"
          >
            <td class="px-3 py-2 text-body text-ink-mute tabular-nums">{{ indice + 1 }}</td>
            <td
              v-for="coluna in definicao.colunas"
              :key="coluna.campo"
              class="px-3 py-2"
              :class="larguras[coluna.tipo] ?? 'min-w-[10rem]'"
            >
              <GsCampo v-model="linha[coluna.campo]" :campo="coluna" :contexto="linha" compacto />
            </td>
            <td class="px-3 py-2">
              <GsIconButton tone="danger" label="Remover linha" @click="remover(indice)">
                <Trash2 class="size-4" />
              </GsIconButton>
            </td>
          </tr>
        </tbody>

        <tfoot v-if="total !== null && linhas.length > 0">
          <tr class="border-t border-line-strong bg-app text-body font-medium text-ink">
            <td :colspan="definicao.colunas.length" class="px-3 py-2.5 text-right">
              {{ definicao.rotuloTotal ?? "Total" }}
            </td>
            <td class="px-3 py-2.5 text-right tabular-nums whitespace-nowrap" colspan="2">
              {{ dinheiro(total) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>
