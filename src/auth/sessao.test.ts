import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.mock("./keycloak", () => ({
  autenticacaoDesligada: false,
  obterKeycloak: () => ({ tokenParsed: tokenAtual }),
}));

let tokenAtual: Record<string, unknown> = {};

const { useSessao } = await import("./sessao");
const { useTenant } = await import("./tenant");

/**
 * O papel do menu, depois do ADR-0016.
 *
 * Em 07/09/2026 os cinco papéis de cliente saíram do realm, e o token passou a dizer o perfil pelo
 * claim `groups`, no formato `/<cliente>/<PERFIL>`. Enquanto o front lia só `realm_access`, ele
 * ficava sem papel nenhum e o menu escondia tudo que exige papel — foi o que aconteceu com o RH.
 */
describe("papéis da sessão", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Trocar de cliente recarrega a página (tenant.ts), e no vitest não há window.
    vi.stubGlobal("window", { location: { assign: () => {} } });
  });

  function autenticar(token: Record<string, unknown>, cliente: string): void {
    tokenAtual = token;
    useTenant().carregarDoToken();
    useTenant().selecionar(cliente);
    useSessao().carregarDoToken();
  }

  it("lê o perfil do claim groups", () => {
    autenticar(
      {
        organization: ["fazendaboavista"],
        groups: ["/fazendaboavista/TENANT_ADMIN"],
      },
      "fazendaboavista",
    );

    expect(useSessao().temPapel("TENANT_ADMIN")).toBe(true);
  });

  /**
   * O caso que o ADR-0016 existe para resolver, agora visível na tela.
   *
   * A mesma pessoa entra nos dois clientes com o mesmo token, e o menu tem de mudar quando ela
   * troca de cliente — administrar a fazenda A não é administrar a B.
   */
  it("o papel muda ao trocar de cliente", () => {
    autenticar(
      {
        organization: ["fazendaboavista", "santarita"],
        groups: ["/fazendaboavista/TENANT_ADMIN", "/santarita/OPERADOR"],
      },
      "fazendaboavista",
    );

    expect(useSessao().temPapel("TENANT_ADMIN")).toBe(true);

    useTenant().selecionar("santarita");

    expect(useSessao().papeis).toContain("OPERADOR");
    expect(useSessao().papeis).not.toContain("TENANT_ADMIN");
  });

  it("ignora o grupo de um nível só, que é o do cliente", () => {
    autenticar(
      { organization: ["fazendaboavista"], groups: ["/fazendaboavista"] },
      "fazendaboavista",
    );

    expect(useSessao().papeis).toHaveLength(0);
  });

  it("normaliza o alias, como o seletor de cliente faz", () => {
    autenticar(
      {
        organization: ["fazendaboavista"],
        groups: ["/FazendaBoaVista/COMERCIAL"],
      },
      "fazendaboavista",
    );

    expect(useSessao().papeis).toContain("COMERCIAL");
  });

  /** Papel de realm continua somando — é o que sustenta PLATFORM_ADMIN, que é de plataforma. */
  it("papel de realm continua valendo", () => {
    autenticar(
      {
        organization: ["fazendaboavista"],
        realm_access: { roles: ["PLATFORM_ADMIN"] },
      },
      "fazendaboavista",
    );

    expect(useSessao().papeis).toContain("PLATFORM_ADMIN");
  });
});
