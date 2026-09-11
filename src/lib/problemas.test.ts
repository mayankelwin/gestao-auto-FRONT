import { describe, expect, it } from "vitest";
import { ErroDaApi } from "@/api/erro";
import { interpretarFalha } from "./problemas";
import { dataHora } from "./formato";

describe("interpretarFalha", () => {
  it("reconhece o conflito de entrada de estoque", () => {
    const erro = new Error("A carga já entrou pelo recebimento; o estoque seria movimentado duas vezes.");
    expect(interpretarFalha(erro)).toBe("estoque-em-conflito");
  });

  it("reconhece período fechado", () => {
    expect(interpretarFalha(new Error("O período contábil está fechado."))).toBe("periodo-fechado");
  });

  it("usa a regra do servidor quando ela vem", () => {
    const erro = new ErroDaApi("Recusado.", 422, {}, "ACCOUNTING_PERIOD_CLOSED");
    expect(interpretarFalha(erro)).toBe("periodo-fechado");
  });

  it("cai no genérico em vez de inventar causa", () => {
    expect(interpretarFalha(new Error("Falha desconhecida."))).toBe("lancamento-recusado");
  });
});

describe("dataHora", () => {
  it("mostra data e hora quando o valor carrega horário", () => {
    expect(dataHora("2026-09-09T14:30:00")).toMatch(/09\/09\/2026.*14:30/);
  });

  it("cai para só a data quando não há horário", () => {
    expect(dataHora("2026-09-09")).toBe("09/09/2026");
  });

  it("vazio vira travessão", () => {
    expect(dataHora(null)).toBe("—");
  });
});
