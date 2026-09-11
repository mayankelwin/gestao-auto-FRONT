<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Check, ChevronDown, LoaderCircle, X } from "lucide-vue-next";
import { listar, type Registro } from "@/api/lista";
import { useEmpresa } from "@/auth/empresa";

const TAMANHO = 100;

const props = defineProps<{
  endpoint: string;
  rotulo: (registro: Registro) => string;
  label?: string;
  placeholder?: string;
  exigeEmpresa?: boolean;
  parametros?: Record<string, unknown>;
  disabled?: boolean;
  invalid?: boolean;
  hint?: string;
}>();

const model = defineModel<number[]>({ default: () => [] });

const empresa = useEmpresa();

const aberto = ref(false);
const carregando = ref(false);
const falha = ref<string | null>(null);
const registros = ref<Registro[]>([]);
const raiz = ref<HTMLElement | null>(null);

const escolhidos = computed(() =>
  registros.value.filter((r) => model.value.includes(Number(r.id))),
);

async function carregar(): Promise<void> {
  carregando.value = true;
  falha.value = null;

  try {
    const pagina = await listar(props.endpoint, {
      page: 0,
      size: TAMANHO,
      companyId: props.exigeEmpresa ? empresa.atualId : undefined,
      ...props.parametros,
    });
    registros.value = pagina.content;
  } catch (e) {
    registros.value = [];
    falha.value = e instanceof Error ? e.message : String(e);
  } finally {
    carregando.value = false;
  }
}

function alternar(registro: Registro): void {
  const id = Number(registro.id);
  model.value = model.value.includes(id)
    ? model.value.filter((v) => v !== id)
    : [...model.value, id];
}

function remover(id: number): void {
  model.value = model.value.filter((v) => v !== id);
}

function fora(evento: MouseEvent): void {
  if (raiz.value && !raiz.value.contains(evento.target as Node)) aberto.value = false;
}

onMounted(() => {
  document.addEventListener("click", fora);
  void carregar();
});

onBeforeUnmount(() => document.removeEventListener("click", fora));
</script>

<template>
  <div ref="raiz" class="flex flex-col gap-1.5">
    <span v-if="label" class="text-small font-medium text-ink-soft">{{ label }}</span>

    <div class="relative">
      <div
        class="flex min-h-control w-full flex-wrap items-center gap-1.5 rounded-control border bg-surface py-1.5 pr-2 pl-2 transition-colors"
        :class="[
          invalid ? 'border-danger' : aberto ? 'border-primary ring-2 ring-primary/25' : 'border-line-field',
          disabled ? 'cursor-not-allowed bg-app' : 'cursor-pointer',
        ]"
        @click.stop="!disabled && (aberto = !aberto)"
      >
        <span
          v-for="registro in escolhidos"
          :key="String(registro.id)"
          class="inline-flex items-center gap-1 rounded-badge bg-primary-50 px-2 py-0.5 text-chip font-medium text-primary"
        >
          {{ rotulo(registro) }}
          <button
            type="button"
            class="cursor-pointer opacity-70 hover:opacity-100"
            aria-label="Remover"
            @click.stop="remover(Number(registro.id))"
          >
            <X class="size-3" />
          </button>
        </span>

        <span v-if="escolhidos.length === 0" class="flex-1 px-1 text-body text-ink-mute">
          {{ placeholder ?? "Selecione..." }}
        </span>

        <LoaderCircle v-if="carregando" class="ml-auto size-4 shrink-0 animate-spin text-ink-mute" />
        <ChevronDown v-else class="ml-auto size-4 shrink-0 text-ink-mute" />
      </div>

      <ul
        v-if="aberto"
        class="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-card border border-line bg-surface py-1 shadow-lg"
      >
        <li v-if="falha" class="px-3 py-2 text-body text-danger">{{ falha }}</li>
        <li v-else-if="registros.length === 0" class="px-3 py-2 text-body text-ink-mute">
          Nenhum registro.
        </li>
        <li v-for="registro in registros" :key="String(registro.id)">
          <button
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-body transition-colors hover:bg-app"
            :class="model.includes(Number(registro.id)) ? 'font-medium text-primary' : 'text-ink'"
            @click.stop="alternar(registro)"
          >
            <span class="truncate">{{ rotulo(registro) }}</span>
            <Check v-if="model.includes(Number(registro.id))" class="size-4 shrink-0" />
          </button>
        </li>
      </ul>
    </div>

    <span v-if="hint" class="text-small" :class="invalid ? 'text-danger' : 'text-ink-mute'">
      {{ hint }}
    </span>
  </div>
</template>
