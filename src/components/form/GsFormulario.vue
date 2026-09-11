<script setup lang="ts">
import { nextTick, watch } from "vue";
import GsCampo from "./GsCampo.vue";
import { CLASSES_DE_DESTAQUE, DURACAO_DO_DESTAQUE, useDestaque } from "@/lib/destaque";
import type { AnuncioDaEscolha, Formulario, Valores } from "@/lib/formulario";

const props = defineProps<{
  formulario: Formulario;
  erros?: Record<string, string>;
  criando?: boolean;
}>();

const emit = defineEmits<{ anunciar: [AnuncioDaEscolha] }>();

const valores = defineModel<Valores>({ required: true });

function visivel(secaoIndice: number, campoIndice: number): boolean {
  const campo = props.formulario[secaoIndice].campos[campoIndice];
  if (campo.geradoPeloSistema && props.criando) return false;
  return !campo.visivel || campo.visivel(valores.value);
}

function preencher(sugerido: Valores) {
  valores.value = { ...valores.value, ...sugerido };
}

const { campo: destacado, concluir } = useDestaque();

watch(
  destacado,
  async (nome) => {
    if (!nome) return;
    await nextTick();

    const alvo = document.querySelector(`[data-campo="${nome}"]`);
    if (!alvo) return;

    alvo.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(concluir, DURACAO_DO_DESTAQUE);
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col gap-6">
    <section
      v-for="(secao, s) in formulario"
      :key="secao.titulo ?? `secao-${s}`"
      class="flex flex-col gap-3"
    >
      <h3
        v-if="secao.titulo"
        class="text-overline text-ink-mute uppercase"
      >
        {{ secao.titulo }}
      </h3>

      <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <template v-for="(campo, c) in secao.campos" :key="`${campo.campo}-${c}`">
          <div
            v-if="visivel(s, c)"
            :data-campo="campo.campo"
            :class="[
              campo.inteira ? 'sm:col-span-2' : '',
              destacado === campo.campo ? CLASSES_DE_DESTAQUE : '',
            ]"
          >
            <GsCampo
              v-model="valores[campo.campo]"
              :campo="campo"
              :erro="erros?.[campo.campo]"
              :contexto="valores"
              @preencher="preencher"
              @anunciar="emit('anunciar', $event)"
            />
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
