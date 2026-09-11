import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { autenticacaoDesligada, obterKeycloak } from "./keycloak";
import { useTenant } from "./tenant";
import type { TenantRole } from "@/lib/navigation";

interface PerfilToken {
  name?: string;
  preferred_username?: string;
  email?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  groups?: string[];
}

const ORDEM_DE_PAPEIS: TenantRole[] = [
  "TENANT_ADMIN",
  "CONTADOR",
  "FINANCEIRO",
  "COMERCIAL",
  "OPERADOR",
];

export const useSessao = defineStore("sessao", () => {
  const papeisGlobais = ref<string[]>([]);
  const perfisPorCliente = ref<Record<string, string[]>>({});
  const nome = ref("");
  const email = ref("");

  /**
   * Os grupos do token, recortados por cliente.
   *
   * O caminho é `/<cliente>/<PERFIL>`, e é o mesmo que o `TenantJwtConverter` lê do outro lado.
   * Grupo de um nível só é ignorado: o grupo do cliente existe para pendurar os perfis, e tratá-lo
   * como perfil produziria a autoridade `fazendaboavista`, que não corresponde a papel nenhum.
   *
   * O alias vai para minúscula porque é assim que ele casa com o slug do seletor de cliente.
   */
  function perfisDosGrupos(caminhos: string[]): Record<string, string[]> {
    const porCliente: Record<string, string[]> = {};

    for (const caminho of caminhos) {
      const partes = caminho.split("/").filter(Boolean);
      if (partes.length < 2) continue;

      const cliente = partes[0].trim().toLowerCase();
      const perfil = partes[1].trim();
      if (!cliente || !perfil) continue;

      porCliente[cliente] = [...new Set([...(porCliente[cliente] ?? []), perfil])];
    }

    return porCliente;
  }

  function carregarDoToken(): void {
    if (autenticacaoDesligada) {
      nome.value = "Desenvolvimento";
      email.value = "";
      papeisGlobais.value = ["TENANT_ADMIN"];
      perfisPorCliente.value = {};
      return;
    }

    const perfil = obterKeycloak().tokenParsed as PerfilToken | undefined;
    if (!perfil) return;

    nome.value = perfil.name ?? perfil.preferred_username ?? "";
    email.value = perfil.email ?? "";

    const doRealm = perfil.realm_access?.roles ?? [];
    const dosClients = Object.values(perfil.resource_access ?? {}).flatMap((c) => c.roles ?? []);

    papeisGlobais.value = [...new Set([...doRealm, ...dosClients])];
    perfisPorCliente.value = perfisDosGrupos(perfil.groups ?? []);
  }

  /**
   * Os papéis que valem **no cliente selecionado**, e só neles.
   *
   * Desde o `ADR-0016` o perfil é do cliente, não do realm: quem administra a fazenda A e apenas
   * opera na B entra nas duas com o mesmo token. Por isso isto é derivado do cliente atual em vez
   * de ser calculado uma vez no login — trocar de cliente troca o que o menu mostra.
   *
   * Os papéis de realm continuam somando. Em 07/09/2026 os cinco de cliente foram removidos do
   * realm e sobrou `PLATFORM_ADMIN`, que é de plataforma; enquanto algum papel global existir, ele
   * vale em qualquer cliente — que é o que o ADR aceita para fora do tenant.
   */
  const papeis = computed(() => {
    const cliente = useTenant().atual;
    const doGrupo = cliente ? (perfisPorCliente.value[cliente.toLowerCase()] ?? []) : [];

    return [...new Set([...papeisGlobais.value, ...doGrupo])];
  });

  function temPapel(...aceitos: TenantRole[]): boolean {
    return papeis.value.includes("TENANT_ADMIN") || aceitos.some((p) => papeis.value.includes(p));
  }

  const iniciais = computed(() => {
    const partes = nome.value.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  });

  const papelPrincipal = computed(
    () => ORDEM_DE_PAPEIS.find((p) => papeis.value.includes(p)) ?? "",
  );

  return { papeis, nome, email, iniciais, papelPrincipal, carregarDoToken, temPapel };
});
