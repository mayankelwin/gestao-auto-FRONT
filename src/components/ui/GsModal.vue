<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { X } from "lucide-vue-next";
import { desempilhar, empilhar, noTopo } from "@/lib/pilhaDeModais";

const props = withDefaults(
  defineProps<{
    titulo: string;
    subtitulo?: string;
    largura?: "media" | "larga" | "larga_media" | "cheia";
    /**
     * Centraliza na vertical. O padrão é encostar no topo, que é o certo para formulário: ele
     * cresce para baixo, e centralizar faria o campo de cima subir e descer a cada passo. Aviso
     * curto é o contrário — encostado no topo ele fica órfão, longe de onde o olho está.
     */
    centralizado?: boolean;
  }>(),
  { largura: "media" },
);

const emit = defineEmits<{ (e: "fechar"): void }>();

const id = ref(0);

const larguras = {
  media: "max-w-xl",
  larga: "max-w-3xl",
  larga_media: "max-w-4xl",
  cheia: "max-w-6xl",
};

function porEsc(evento: KeyboardEvent): void {
  if (evento.key === "Escape" && noTopo(id.value)) emit("fechar");
}

onMounted(() => {
  id.value = empilhar();
  document.addEventListener("keydown", porEsc);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", porEsc);
  desempilhar(id.value);
});
</script>

<template>
  <div
    class="fixed inset-0 z-40 flex justify-center overflow-y-auto p-4 sm:p-8"
    :class="centralizado ? 'items-center' : 'items-start'"
  >
    <div class="fixed inset-0 bg-navy/40" @click="emit('fechar')" />

    <div
      class="relative z-10 flex w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] my-auto flex-col rounded-panel border border-line bg-surface shadow-2xl"
      :class="larguras[props.largura]"
      role="dialog"
      aria-modal="true"
    >
      <header class="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <div class="flex min-w-0 flex-col gap-0.5">
          <h2 class="truncate text-title text-ink">{{ titulo }}</h2>
          <p v-if="subtitulo" class="truncate text-small text-ink-mute">{{ subtitulo }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 cursor-pointer rounded-control p-1 text-ink-mute transition-colors hover:bg-app hover:text-ink"
          aria-label="Fechar"
          @click="emit('fechar')"
        >
          <X class="size-5" />
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <slot />
      </div>

      <footer
        v-if="$slots.rodape"
        class="flex items-center justify-end gap-2 border-t border-line px-6 py-4"
      >
        <slot name="rodape" />
      </footer>
    </div>
  </div>
</template>
