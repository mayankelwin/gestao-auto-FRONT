<script setup lang="ts">
import { ref } from "vue";
import GsModal from "@/components/ui/GsModal.vue";
import SubRecurso from "./SubRecurso.vue";
import type { Registro } from "@/api/lista";
import type { PainelDeRecurso } from "@/lib/subrecursos";

const props = defineProps<{
  painel: PainelDeRecurso;
  registro: Registro;
  subtitulo?: string;
  abaInicial?: string;
}>();

const emit = defineEmits<{ (e: "fechar"): void }>();

const ativa = ref(
  props.painel.abas.find((aba) => aba.titulo === props.abaInicial)?.titulo
    ?? props.painel.abas[0]?.titulo
    ?? "",
);
</script>

<template>
  <GsModal :titulo="painel.rotulo" :subtitulo="subtitulo" largura="cheia" @fechar="emit('fechar')">
    <div class="flex flex-col gap-5">
      <nav class="flex flex-wrap gap-1 border-b border-line">
        <button
          v-for="aba in painel.abas"
          :key="aba.titulo"
          type="button"
          class="-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-body font-medium transition-colors"
          :class="
            ativa === aba.titulo
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-soft hover:text-ink'
          "
          @click="ativa = aba.titulo"
        >
          {{ aba.titulo }}
        </button>
      </nav>

      <template v-for="aba in painel.abas" :key="aba.titulo">
        <div v-if="ativa === aba.titulo">
          <SubRecurso v-if="aba.definicao" :definicao="aba.definicao" :registro="registro" />
          <component :is="aba.componente" v-else-if="aba.componente" :registro="registro" />
          <component :is="aba.abaixo" v-if="aba.abaixo" :registro="registro" />
        </div>
      </template>
    </div>
  </GsModal>
</template>
