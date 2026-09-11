<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import GsIconButton from "./GsIconButton.vue";

const props = defineProps<{
  pagina: number;
  totalPaginas: number;
  totalElementos: number;
  tamanho: number;
}>();

const emit = defineEmits<{ (e: "mudar", pagina: number): void }>();

const primeiro = computed(() => props.pagina * props.tamanho + 1);
const ultimo = computed(() => Math.min((props.pagina + 1) * props.tamanho, props.totalElementos));
</script>

<template>
  <div
    v-if="totalElementos > 0"
    class="flex items-center justify-between gap-4 border-t border-line px-6 py-3"
  >
    <p class="text-small text-ink-mute">
      {{ primeiro }}–{{ ultimo }} de {{ totalElementos }}
    </p>

    <div class="flex items-center gap-1">
      <GsIconButton
        tone="soft"
        label="Página anterior"
        :disabled="pagina === 0"
        @click="emit('mudar', pagina - 1)"
      >
        <ChevronLeft class="size-4" />
      </GsIconButton>

      <span class="px-2 text-small text-ink-soft">
        {{ pagina + 1 }} de {{ Math.max(totalPaginas, 1) }}
      </span>

      <GsIconButton
        tone="soft"
        label="Próxima página"
        :disabled="pagina >= totalPaginas - 1"
        @click="emit('mudar', pagina + 1)"
      >
        <ChevronRight class="size-4" />
      </GsIconButton>
    </div>
  </div>
</template>
