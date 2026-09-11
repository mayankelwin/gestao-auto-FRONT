<script setup lang="ts">
import { computed } from "vue";
import { AlertCircle, Check } from "lucide-vue-next";
import type { Passo } from "@/lib/passos";

const props = defineProps<{
  passos: Passo[];
  atual: number;
  maiorVisitado: number;
  comErro?: Set<number>;
}>();

const emit = defineEmits<{ (e: "ir", indice: number): void }>();

const alcancavel = (indice: number): boolean => indice <= props.maiorVisitado;

const errado = (indice: number): boolean => Boolean(props.comErro?.has(indice));

const progresso = computed(() =>
  props.passos.length < 2 ? 100 : (props.atual / (props.passos.length - 1)) * 100,
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <ol class="hidden items-center gap-1 sm:flex">
      <li
        v-for="(passo, indice) in passos"
        :key="passo.titulo"
        class="flex min-w-0 flex-1 items-center gap-1"
      >
        <button
          type="button"
          class="flex min-w-0 items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors"
          :class="[
            alcancavel(indice) ? 'cursor-pointer hover:bg-app' : 'cursor-default',
            errado(indice) ? 'text-danger' : indice === atual ? 'text-ink' : 'text-ink-mute',
          ]"
          :disabled="!alcancavel(indice)"
          :aria-current="indice === atual ? 'step' : undefined"
          @click="alcancavel(indice) && emit('ir', indice)"
        >
          <span
            class="flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-medium"
            :class="
              errado(indice)
                ? 'border-danger text-danger'
                : indice < atual
                  ? 'border-primary bg-primary text-ink-invert'
                  : indice === atual
                    ? 'border-primary text-primary'
                    : 'border-line text-ink-mute'
            "
          >
            <AlertCircle v-if="errado(indice)" class="size-3.5" />
            <Check v-else-if="indice < atual" class="size-3.5" />
            <template v-else>{{ indice + 1 }}</template>
          </span>
          <span
            class="truncate text-small"
            :class="indice === atual || errado(indice) ? 'font-medium' : ''"
          >
            {{ passo.titulo }}
          </span>
        </button>

        <span
          v-if="indice < passos.length - 1"
          class="h-px min-w-3 flex-1"
          :class="indice < atual ? 'bg-primary' : 'bg-line'"
        />
      </li>
    </ol>

    <div class="flex flex-col gap-1.5 sm:hidden">
      <div class="flex items-baseline justify-between gap-2">
        <span
          class="truncate text-small font-medium"
          :class="errado(atual) ? 'text-danger' : 'text-ink'"
        >
          {{ passos[atual].titulo }}
        </span>
        <span class="shrink-0 text-caption text-ink-mute">
          {{ atual + 1 }} de {{ passos.length }}
        </span>
      </div>
      <div class="h-1 rounded-full bg-line">
        <div
          class="h-1 rounded-full bg-primary transition-all"
          :style="{ width: `${progresso}%` }"
        />
      </div>
    </div>
  </div>
</template>
