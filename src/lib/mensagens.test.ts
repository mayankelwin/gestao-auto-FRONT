import { describe, expect, it } from "vitest";
import { MENSAGENS, resolverMensagem } from "./mensagens";

describe("resolverMensagem", () => {
  it("dá o caminho da correção a quem tem o papel", () => {
    const m = resolverMensagem("empresa-nao-selecionada", ["TENANT_ADMIN"]);

    expect(m.podeResolver).toBe(true);
    expect(m.orientacao).toBe(MENSAGENS["empresa-nao-selecionada"].comoResolver);
    expect(m.destino?.rota).toBe("/empresas");
  });

  it("troca a orientação e esconde o destino de quem não tem o papel", () => {
    const m = resolverMensagem("empresa-nao-selecionada", ["OPERADOR"]);

    expect(m.podeResolver).toBe(false);
    expect(m.orientacao).toBe(MENSAGENS["empresa-nao-selecionada"].semPermissao);
    expect(m.destino).toBeUndefined();
  });

  it("TENANT_ADMIN resolve qualquer papel exigido, como em sessao.temPapel", () => {
    expect(resolverMensagem("natureza-sem-regra", ["TENANT_ADMIN"]).podeResolver).toBe(true);
  });

  it("mensagem sem papel exigido vale para todos", () => {
    expect(resolverMensagem("documento-ja-atendido", []).podeResolver).toBe(true);
  });

  it("cai na orientação geral quando não há texto próprio para quem não pode", () => {
    const m = resolverMensagem("conflito", []);
    expect(m.orientacao).toBe(MENSAGENS.conflito.comoResolver);
  });

  it("marca como interrompe só o que impede de continuar", () => {
    expect(resolverMensagem("sessao-expirada", []).interrompe).toBe(true);
    expect(resolverMensagem("rascunho-recuperado", []).interrompe).toBe(false);
  });

  it("ajustes sobrescrevem o catálogo sem apagar o resto", () => {
    const m = resolverMensagem("cfop-duplicado", [], { texto: "CFOP 5102 já cadastrado." });

    expect(m.texto).toBe("CFOP 5102 já cadastrado.");
    expect(m.titulo).toBe(MENSAGENS["cfop-duplicado"].titulo);
  });
});
