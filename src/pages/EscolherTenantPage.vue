<script setup lang="ts">
import { Building2, ChevronRight } from "lucide-vue-next";
import GsLogo from "@/components/ui/GsLogo.vue";
import { useSessao } from "@/auth/sessao";
import { useTenant } from "@/auth/tenant";

const sessao = useSessao();
const tenant = useTenant();
</script>
 
<template>
  <div class="flex h-full items-center justify-center bg-app px-6">
    <div class="w-full max-w-md">
      <div class="mb-8 flex flex-col items-center gap-3">
        <GsLogo :size="44" />
        <h1 class="text-h2 text-ink">Escolha o cliente</h1>
        <p class="text-center text-body text-ink-soft">
          {{ sessao.nome }}, você tem acesso a {{ tenant.organizacoes.length }} clientes. Escolha por
          qual quer entrar.
        </p>
      </div>

      <ul class="flex flex-col gap-2">
        <li v-for="slug in tenant.organizacoes" :key="slug">
          <button
            type="button"
            class="flex w-full cursor-pointer items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 text-left transition-colors hover:border-primary hover:bg-primary-50"
            @click="tenant.selecionar(slug)"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary"
            >
              <Building2 class="size-4" />
            </span>
            <span class="min-w-0 flex-1 truncate text-body font-medium text-ink">{{ slug }}</span>
            <ChevronRight class="size-4 shrink-0 text-ink-mute" />
          </button>
        </li>
      </ul>

      <p class="mt-6 text-center text-small text-ink-mute">
        Dá para trocar de cliente depois, pelo seletor no topo da tela.
      </p>
    </div>
  </div>
</template>
