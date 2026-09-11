<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { EllipsisVertical } from "lucide-vue-next";
import GsIconButton from "./GsIconButton.vue";
import { abrirMenu, fecharMenu, menuEstaAberto, registrarMenu } from "@/lib/menuUnico";
import type { Component } from "vue";

export interface ItemDeMenu {
  chave: string;
  rotulo: string;
  icone?: Component;
  perigo?: boolean;
  desabilitado?: boolean;
  motivo?: string;
}

const LARGURA = 224;
const MARGEM = 8;

defineProps<{ itens: ItemDeMenu[] }>();

const emit = defineEmits<{ (e: "escolher", chave: string): void }>();

const eu = registrarMenu();
const aberto = computed(() => menuEstaAberto(eu));
const raiz = ref<HTMLElement | null>(null);
const lista = ref<HTMLElement | null>(null);
const caixa = ref({ top: 0, left: 0, acima: false });

function medir(): void {
  const botao = raiz.value?.getBoundingClientRect();
  if (!botao) return;

  const abaixo = window.innerHeight - botao.bottom;
  const acima = abaixo < 200 && botao.top > abaixo;

  caixa.value = {
    top: acima ? botao.top - 4 : botao.bottom + 4,
    left: Math.min(Math.max(botao.right - LARGURA, MARGEM), window.innerWidth - LARGURA - MARGEM),
    acima,
  };
}

function alternar(): void {
  if (aberto.value) {
    fecharMenu(eu);
    return;
  }
  medir();
  abrirMenu(eu);
}

function fora(evento: MouseEvent): void {
  if (!aberto.value) return;
  const alvo = evento.target as Node;
  if (raiz.value?.contains(alvo) || lista.value?.contains(alvo)) return;
  fecharMenu(eu);
}

watch(aberto, (agora) => {
  if (agora) {
    medir();
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return;
  }
  window.removeEventListener("scroll", medir, true);
  window.removeEventListener("resize", medir);
});

onMounted(() => document.addEventListener("click", fora));

onBeforeUnmount(() => {
  document.removeEventListener("click", fora);
  window.removeEventListener("scroll", medir, true);
  window.removeEventListener("resize", medir);
  fecharMenu(eu);
});

function escolher(item: ItemDeMenu): void {
  if (item.desabilitado) return;
  fecharMenu(eu);
  emit("escolher", item.chave);
}
</script>

<template>
  <div ref="raiz" class="relative flex justify-end">
    <GsIconButton label="Ações" :aria-expanded="aberto" @click.stop="alternar">
      <EllipsisVertical class="size-4" />
    </GsIconButton>

    <Teleport to="body">
      <ul
        v-if="aberto"
        ref="lista"
        class="fixed z-50 w-56 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-lg"
        :style="{
          top: `${caixa.top}px`,
          left: `${caixa.left}px`,
          transform: caixa.acima ? 'translateY(-100%)' : undefined,
        }"
      >
        <li v-for="item in itens" :key="item.chave">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-body transition-colors"
            :class="[
              item.desabilitado
                ? 'cursor-not-allowed text-ink-mute'
                : item.perigo
                  ? 'cursor-pointer text-danger hover:bg-danger-bg'
                  : 'cursor-pointer text-ink hover:bg-app',
            ]"
            :title="item.desabilitado ? item.motivo : undefined"
            @click.stop="escolher(item)"
          >
            <component :is="item.icone" v-if="item.icone" class="size-4 shrink-0" />
            <span class="flex-1 truncate">{{ item.rotulo }}</span>
          </button>
        </li>
      </ul>
    </Teleport>
  </div>
</template>
