import { describe, expect, it } from "vitest";
import { ehPorPassos, passoDoCampo, passosComErro, passosDe, validarPasso } from "./passos";
import type { Formulario, LinhasDeFormulario } from "./formulario";

const secao = (titulo: string, campo: string): Formulario[number] => ({
  titulo,
  campos: [{ campo, label: campo, tipo: "texto", obrigatorio: true }],
});

const itens: LinhasDeFormulario = {
  campo: "linhas",
  titulo: "Itens",
  rotuloNovo: "Nova linha",
  colunas: [{ campo: "quantidade", label: "Quantidade", tipo: "decimal", obrigatorio: true }],
};

describe("quando o formulário vira passos", () => {
  it("duas seções continuam rolando: passo em cadastro curto é pior que rolagem", () => {
    expect(ehPorPassos([secao("Um", "a"), secao("Dois", "b")])).toBe(false);
  });

  it("três seções viram passos", () => {
    expect(ehPorPassos([secao("Um", "a"), secao("Dois", "b"), secao("Três", "c")])).toBe(true);
  });

  it("linhas filhas contam como um passo", () => {
    expect(ehPorPassos([secao("Um", "a"), secao("Dois", "b")], [itens])).toBe(true);
  });
});

describe("os passos", () => {
  const formulario = [secao("Identificação", "nome"), secao("Fiscal", "ncm")];

  it("um por seção, e as linhas filhas no último", () => {
    const passos = passosDe(formulario, [itens]);
    expect(passos.map((p) => p.titulo)).toEqual(["Identificação", "Fiscal", "Itens"]);
    expect(passos[2].secao).toBeNull();
    expect(passos[2].linhas).toEqual(["linhas"]);
  });

  it("cobra o obrigatório do passo, e só dele", () => {
    const passos = passosDe(formulario, [itens]);
    const erros = validarPasso(passos[0], formulario, [itens], { nome: "" }, {});

    expect(erros.campos).toEqual({ nome: "Obrigatório." });
  });

  it("não cobra no passo 1 o que é do passo 2", () => {
    const passos = passosDe(formulario, [itens]);
    const erros = validarPasso(passos[0], formulario, [itens], { nome: "Soja", ncm: "" }, {});

    expect(erros.campos).toEqual({});
  });

  it("sabe em que passo mora um campo, para saltar até o erro do servidor", () => {
    const passos = passosDe(formulario, [itens]);
    expect(passoDoCampo(passos, formulario, "ncm")).toBe(1);
    expect(passoDoCampo(passos, formulario, "inexistente")).toBe(-1);
  });
});

describe("a trilha marca o passo que tem erro", () => {
  const formulario = [secao("Identificação", "nome"), secao("Fiscal", "ncm")];
  const passos = passosDe(formulario, [itens]);

  it("marca todos os passos recusados, não só aquele para onde a tela salta", () => {
    expect(passosComErro(passos, formulario, ["nome", "ncm"])).toEqual(new Set([0, 1]));
  });

  it("marca o passo das linhas filhas pelo campo delas", () => {
    expect(passosComErro(passos, formulario, [], ["linhas"])).toEqual(new Set([2]));
  });

  it("ignora campo que não mora em passo nenhum: erro de fora não marca trilha", () => {
    expect(passosComErro(passos, formulario, ["inexistente"])).toEqual(new Set());
  });

  it("sem erro, nenhum passo fica marcado", () => {
    expect(passosComErro(passos, formulario, [])).toEqual(new Set());
  });
});
