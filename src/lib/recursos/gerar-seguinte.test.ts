import { describe, expect, it } from "vitest";
import { documentos } from "./documentos";
import type { AcaoDeRecurso, Recurso } from "./tipos";

const recursoPorRota = new Map(documentos.map((r) => [r.rota, r]));

const acoesQuePreparam = (rota: string): AcaoDeRecurso[] =>
  (recursoPorRota.get(rota)?.acoes ?? []).filter((a) => a.prepara);

const recurso = (rota: string): Recurso => {
  const achado = recursoPorRota.get(rota);
  if (!achado) throw new Error(`recurso ${rota} não registrado`);
  return achado;
};

const ORIGENS = ["/pedidos-de-compra", "/recebimentos", "/pedidos-de-venda", "/entregas"];

describe("gerar o documento seguinte", () => {
  it("o pedido de compra lançado gera recebimento e nota", () => {
    const acoes = acoesQuePreparam("/pedidos-de-compra");

    expect(acoes.map((a) => a.rotulo)).toEqual(["Gerar recebimento", "Gerar nota"]);
    expect(acoes[0].prepara!.origem({ id: 42 })).toBe("/purchase-receipts/prepare?fromOrders=42");
    expect(acoes[0].prepara!.rota).toBe("/recebimentos");
    expect(acoes[1].prepara!.origem({ id: 42 })).toBe("/purchase-invoices/prepare?fromOrders=42");
    expect(acoes[1].prepara!.rota).toBe("/faturas-de-compra");
  });

  it("o recebimento lançado gera nota", () => {
    const acoes = acoesQuePreparam("/recebimentos");

    expect(acoes).toHaveLength(1);
    expect(acoes[0].prepara!.origem({ id: 7 })).toBe("/purchase-invoices/prepare?fromReceipts=7");
    expect(acoes[0].prepara!.rota).toBe("/faturas-de-compra");
  });

  it("o pedido de venda lançado gera entrega e nota", () => {
    const acoes = acoesQuePreparam("/pedidos-de-venda");

    expect(acoes.map((a) => a.rotulo)).toEqual(["Gerar entrega", "Gerar nota"]);
    expect(acoes[0].prepara!.origem({ id: 42 })).toBe("/delivery-notes/prepare?fromOrders=42");
    expect(acoes[0].prepara!.rota).toBe("/entregas");
    expect(acoes[1].prepara!.origem({ id: 42 })).toBe("/sales-invoices/prepare?fromOrders=42");
    expect(acoes[1].prepara!.rota).toBe("/faturas-de-venda");
  });

  it("a entrega lançada gera nota", () => {
    const acoes = acoesQuePreparam("/entregas");

    expect(acoes).toHaveLength(1);
    expect(acoes[0].prepara!.origem({ id: 7 })).toBe("/sales-invoices/prepare?fromDeliveries=7");
    expect(acoes[0].prepara!.rota).toBe("/faturas-de-venda");
  });

  it("só documento lançado gera o seguinte", () => {
    for (const rota of ORIGENS) {
      for (const acao of acoesQuePreparam(rota)) {
        expect(acao.disponivel?.({ status: "SUBMITTED" })).toBe(true);
        expect(acao.disponivel?.({ status: "DRAFT" })).toBe(false);
        expect(acao.disponivel?.({ status: "CANCELLED" })).toBe(false);
      }
    }
  });

  it("o destino de cada ação existe e tem formulário para abrir", () => {
    for (const rota of ORIGENS) {
      for (const acao of acoesQuePreparam(rota)) {
        const destino = recurso(acao.prepara!.rota);
        expect(destino.formulario, `${acao.prepara!.rota} sem formulário`).toBeDefined();
        expect(destino.linhas, `${acao.prepara!.rota} sem linhas de item`).toBeDefined();
      }
    }
  });
});
