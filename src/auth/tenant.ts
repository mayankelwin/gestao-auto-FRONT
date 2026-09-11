import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { autenticacaoDesligada, obterKeycloak } from "./keycloak";

const CHAVE = "gs.tenant.atual";

interface PerfilOrganizacoes {
  organization?: string[];
}

function ler(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function gravar(slug: string | null): void {
  try {
    if (slug) localStorage.setItem(CHAVE, slug);
    else localStorage.removeItem(CHAVE);
  } catch {
    return;
  }
}

export const useTenant = defineStore("tenant", () => {
  const organizacoes = ref<string[]>([]);
  const atual = ref<string | null>(null);

  function carregarDoToken(): void {
    if (autenticacaoDesligada) {
      organizacoes.value = ["desenvolvimento"];
      atual.value = "desenvolvimento";
      return;
    }

    const perfil = obterKeycloak().tokenParsed as PerfilOrganizacoes | undefined;
    const claim = perfil?.organization ?? [];

    organizacoes.value = [
      ...new Set(claim.map((o) => o.trim().toLowerCase()).filter(Boolean)),
    ].sort();

    const salvo = ler();

    if (salvo && organizacoes.value.includes(salvo)) {
      atual.value = salvo;
    } else if (organizacoes.value.length === 1) {
      atual.value = organizacoes.value[0];
    } else {
      atual.value = null;
    }

    gravar(atual.value);
  }

  function selecionar(slug: string): void {
    if (!organizacoes.value.includes(slug)) return;
    gravar(slug);
    atual.value = slug;
    window.location.assign("/");
  }

  function trocar(slug: string): void {
    if (slug === atual.value || !organizacoes.value.includes(slug)) return;
    gravar(slug);
    window.location.assign("/");
  }

  function voltarParaEscolha(): void {
    if (organizacoes.value.length <= 1) return;
    gravar(null);
    atual.value = null;
  }

  const precisaEscolher = computed(
    () => organizacoes.value.length > 1 && atual.value === null,
  );

  const podeTrocar = computed(() => organizacoes.value.length > 1);

  return {
    organizacoes,
    atual,
    precisaEscolher,
    podeTrocar,
    carregarDoToken,
    selecionar,
    trocar,
    voltarParaEscolha,
  };
});
