<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsSearchBox from "@/components/ui/GsSearchBox.vue";
import { buscarCatalogoDePermissoes, type Permissao } from "@/api/autorizacao";
import { useTenant } from "@/auth/tenant";

const tenant = useTenant();

const filtro = ref("");
const perfilEscolhido = ref<string | null>(null);

const consulta = useQuery({
  queryKey: computed(() => ["catalogo-de-permissoes", tenant.atual]),
  queryFn: buscarCatalogoDePermissoes,
  staleTime: 5 * 60 * 1000,
});

const perfis = computed(() => [...(consulta.data.value?.seededProfiles ?? [])].sort());

/**
 * O catálogo já filtrado pelo perfil e pelo termo.
 *
 * A ordem importa: primeiro o perfil, depois o texto. Filtrar por texto sobre as 157 e só então
 * recortar o perfil mostraria recurso vazio — o usuário procuraria "item" e veria o cartão de itens
 * sem linha nenhuma, sem entender que o perfil escolhido é que não alcança nada ali.
 */
const recursos = computed(() => {
  const termo = filtro.value.trim().toLowerCase();
  const perfil = perfilEscolhido.value;

  return (consulta.data.value?.resources ?? [])
    .map((recurso) => ({
      resource: recurso.resource ?? "",
      permissions: (recurso.permissions ?? []).filter((p: Permissao) => {
        const doPerfil = !perfil || (p.profiles ?? []).includes(perfil);
        const casaTermo =
          !termo ||
          (p.permission ?? "").toLowerCase().includes(termo) ||
          (recurso.resource ?? "").toLowerCase().includes(termo);

        return doPerfil && casaTermo;
      }),
    }))
    .filter((recurso) => recurso.permissions.length > 0);
});

const total = computed(() =>
  recursos.value.reduce((soma, recurso) => soma + recurso.permissions.length, 0),
);

function alternarPerfil(perfil: string): void {
  perfilEscolhido.value = perfilEscolhido.value === perfil ? null : perfil;
}
</script>

<template>
  <div class="space-y-4">
    <GsCard>
      <div class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold">Perfis de acesso</h2>
          <p class="text-sm text-[var(--text-secondary)]">
            O que cada perfil pode fazer. A lista vem da API — é o mesmo catálogo que a autorização
            usa, então o que está aqui é exatamente o que existe.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="perfil in perfis"
            :key="perfil"
            type="button"
            class="rounded-lg border px-3 py-1.5 text-sm transition"
            :class="
              perfilEscolhido === perfil
                ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                : 'border-[var(--border-default)] hover:bg-[var(--surface-hover)]'
            "
            @click="alternarPerfil(perfil)"
          >
            {{ perfil }}
          </button>

          <span class="ml-auto text-sm text-[var(--text-secondary)]">
            {{ total }} permissão(ões) em {{ recursos.length }} recurso(s)
          </span>
        </div>

        <GsSearchBox v-model="filtro" placeholder="Recurso ou permissão" />
      </div>
    </GsCard>

    <p v-if="consulta.isPending.value" class="text-sm text-[var(--text-secondary)]">
      Carregando o catálogo…
    </p>

    <p v-else-if="consulta.isError.value" class="text-sm text-[var(--danger)]">
      {{ (consulta.error.value as Error).message }}
    </p>

    <p v-else-if="recursos.length === 0" class="text-sm text-[var(--text-secondary)]">
      Nenhuma permissão para este recorte.
    </p>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <GsCard v-for="recurso in recursos" :key="recurso.resource">
        <div class="space-y-2">
          <h3 class="font-medium">{{ recurso.resource }}</h3>

          <ul class="space-y-1.5">
            <li
              v-for="permissao in recurso.permissions"
              :key="permissao.permission"
              class="flex flex-wrap items-center gap-2 text-sm"
            >
              <code class="text-[var(--text-secondary)]">{{ permissao.action }}</code>

              <span class="ml-auto flex flex-wrap gap-1">
                <GsBadge
                  v-for="perfil in permissao.profiles"
                  :key="perfil"
                  :tone="perfil === 'TENANT_ADMIN' ? 'neutral' : 'success'"
                >
                  {{ perfil }}
                </GsBadge>
              </span>
            </li>
          </ul>
        </div>
      </GsCard>
    </div>
  </div>
</template>
