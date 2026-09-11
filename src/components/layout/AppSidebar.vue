<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { ChevronDown } from "lucide-vue-next";
import GsLogo from "@/components/ui/GsLogo.vue";
import { navigation, type NavGroup } from "@/lib/navigation";
import { useSessao } from "@/auth/sessao";
import { useTenant } from "@/auth/tenant";

const route = useRoute();
const sessao = useSessao();
const tenant = useTenant();

const menu = computed<NavGroup[]>(() =>
  navigation
    .map((grupo) => ({
      ...grupo,
      items: grupo.items?.filter((item) => !item.papel || sessao.papeis.includes(item.papel)),
    }))
    .filter((grupo) => 
      (grupo.to && (!grupo.papel || sessao.papeis.includes(grupo.papel))) || 
      (grupo.items && grupo.items.length > 0)
    ),
);

function isActive(to: string): boolean {
  return route.path === to;
}

const aberto = ref<string | null>(null);

watch(
  () => route.path,
  (caminho) => {
    const doCaminho = menu.value.find(
      (grupo) => grupo.label && grupo.items?.some((item) => isActive(item.to)),
    );
    aberto.value = caminho === "/" ? null : (doCaminho?.label ?? null);
  },
  { immediate: true },
);

function alternar(grupo: string): void {
  aberto.value = aberto.value === grupo ? null : grupo;
}

function estaAberto(grupo: NavGroup): boolean {
  return aberto.value === grupo.label;
}
</script>

<template>
  <aside class="flex w-sidebar shrink-0 flex-col bg-blue-800">
    <div class="px-5 py-5">
      <button
        type="button"
        class="flex w-full cursor-pointer"
        @click="tenant.voltarParaEscolha()"
      >
        <GsLogo :size="34" with-wordmark />
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 pb-4">
      <div v-for="group in menu" :key="group.label" class="mb-1.5">
        
        <RouterLink
          v-if="group.to"
          :to="group.to"
          class="group/label mb-0.5 flex items-center gap-2.5 rounded-control px-3 py-2.5 text-body transition-colors"
          :class="
            isActive(group.to)
              ? 'bg-primary font-medium text-ink-invert'
              : 'text-ink-navy hover:bg-navy-800 hover:text-ink-invert'
          "
        >
          <component 
            :is="group.icon" 
            v-if="group.icon" 
            class="size-5 shrink-0 opacity-90 transition-opacity group-hover/label:opacity-100" 
          />
          <span class="truncate text-sm font-medium">{{ group.label }}</span>
        </RouterLink>

        <template v-else>
          <button
            v-if="group.label"
            type="button"
            class="group/label flex w-full cursor-pointer items-center justify-between rounded-control px-3 pt-5 pb-2 text-xs font-semibold tracking-wider text-ink-navy/60 uppercase transition-all duration-200 hover:text-ink-navy"
            :aria-expanded="estaAberto(group)"
            @click="alternar(group.label)"
          >
            <span class="flex min-w-0 items-center gap-2.5">
              <component 
                :is="group.icon" 
                v-if="group.icon" 
                class="size-5 shrink-0 opacity-90 transition-opacity group-hover/label:opacity-100" 
              />
              <span class="truncate">{{ group.label }}</span>
            </span>
            <ChevronDown
              class="size-3.5 opacity-60 transition-transform duration-200 group-hover/label:opacity-100"
              :class="estaAberto(group) ? '' : '-rotate-90'"
            />
          </button>

          <div
            v-if="group.items"
            class="grid transition-[grid-template-rows] duration-200 ease-out"
            :class="estaAberto(group) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
          >
            <div class="overflow-hidden">
              <RouterLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                :title="item.pending"
                class="mb-0.5 flex items-center gap-2.5 rounded-control px-5 py-2 text-body transition-colors"
                :class="[
                  isActive(item.to)
                    ? 'bg-primary font-medium text-ink-invert'
                    : 'text-ink-navy hover:bg-navy-800 hover:text-ink-invert',
                  item.pending ? 'opacity-55' : '',
                ]"
              >
                <component :is="item.icon" class="size-4 shrink-0" />
                <span class="truncate text-sm">{{ item.label }}</span>
              </RouterLink>
            </div>
          </div>
        </template>

      </div>
    </nav>

    <div class="flex items-center gap-3 bg-navy-800 px-5 py-4">
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow text-small font-semibold text-navy"
      >
        {{ sessao.iniciais }}
      </span>
      <span class="flex min-w-0 flex-col leading-tight">
        <span class="truncate text-body font-medium text-ink-invert">{{ sessao.nome }}</span>
        <span class="truncate text-caption text-ink-navy uppercase">{{ sessao.papelPrincipal }}</span>
      </span>
    </div>
  </aside>
</template>