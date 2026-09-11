<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Bell, Check, ChevronDown } from "lucide-vue-next";
import { useSessao } from "@/auth/sessao";
import { useTenant } from "@/auth/tenant";
import { useEmpresa } from "@/auth/empresa";

defineProps<{ title: string; breadcrumb?: string }>();

const sessao = useSessao();
const tenant = useTenant();
const empresa = useEmpresa();

const aberto = ref<"cliente" | "empresa" | null>(null);
const raiz = ref<HTMLElement | null>(null);

function fora(evento: MouseEvent): void {
  if (raiz.value && !raiz.value.contains(evento.target as Node)) aberto.value = null;
}

onMounted(() => document.addEventListener("click", fora));
onBeforeUnmount(() => document.removeEventListener("click", fora));
</script>

<template>
  <header
    class="flex h-topbar shrink-0 items-center gap-3 border-b border-line bg-surface pr-6 pl-7"
  >
    <div class="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
      <span v-if="breadcrumb" class="truncate text-caption text-ink-mute normal-case">
        {{ breadcrumb }}
      </span>
      <h1 class="truncate text-title text-ink">{{ title }}</h1>
    </div>

    <div ref="raiz" class="flex shrink-0 items-center gap-3">
      <div v-if="tenant.podeTrocar" class="relative">
        <button
          type="button"
          class="flex cursor-pointer items-center gap-2 rounded-control border border-line-field bg-surface py-1.5 pr-2.5 pl-3 text-chip font-medium text-ink-soft"
          @click.stop="aberto = aberto === 'cliente' ? null : 'cliente'"
        >
          {{ tenant.atual ?? "—" }}
          <ChevronDown class="size-3" />
        </button>

        <ul
          v-if="aberto === 'cliente'"
          class="absolute right-0 z-20 mt-1 max-h-80 w-60 overflow-y-auto rounded-card border border-line bg-surface py-1 shadow-lg"
        >
          <li class="px-3 py-1.5 text-caption text-ink-mute uppercase">Cliente</li>
          <li v-for="slug in tenant.organizacoes" :key="slug">
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-body transition-colors hover:bg-app"
              :class="slug === tenant.atual ? 'font-medium text-primary' : 'text-ink'"
              @click="tenant.trocar(slug)"
            >
              <span class="truncate">{{ slug }}</span>
              <Check v-if="slug === tenant.atual" class="size-4 shrink-0" />
            </button>
          </li>
        </ul>
      </div>

      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-2 rounded-control border border-primary bg-primary-50 py-1.5 pr-2.5 pl-3 text-chip font-medium text-primary"
          :class="empresa.podeTrocar ? 'cursor-pointer' : 'cursor-default'"
          :disabled="!empresa.podeTrocar"
          @click.stop="aberto = aberto === 'empresa' ? null : 'empresa'"
        >
          {{ empresa.rotulo ?? "Sem empresa" }}
          <ChevronDown v-if="empresa.podeTrocar" class="size-3" />
        </button>

        <ul
          v-if="aberto === 'empresa'"
          class="absolute right-0 z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-card border border-line bg-surface py-1 shadow-lg"
        >
          <li class="px-3 py-1.5 text-caption text-ink-mute uppercase">Empresa</li>
          <li v-for="c in empresa.empresas" :key="c.id">
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-body transition-colors hover:bg-app"
              :class="c.id === empresa.atualId ? 'font-medium text-primary' : 'text-ink'"
              @click="empresa.selecionar(c.id); aberto = null"
            >
              <span class="truncate">{{ c.abbreviation ? `${c.name} · ${c.abbreviation}` : c.name }}</span>
              <Check v-if="c.id === empresa.atualId" class="size-4 shrink-0" />
            </button>
          </li>
        </ul>
      </div>

      <button
        type="button"
        class="shrink-0 cursor-pointer rounded-control border border-line-field px-3 py-1.5 text-chip font-medium text-ink-soft"
      >
        Safra 2025/26
      </button>

      <button type="button" class="shrink-0 cursor-pointer text-ink-soft hover:text-ink">
        <Bell class="size-[18px]" />
      </button>

      <span
        :title="sessao.nome"
        class="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-yellow text-small font-semibold text-navy"
      >
        {{ sessao.iniciais }}
      </span>
    </div>
  </header>
</template>
