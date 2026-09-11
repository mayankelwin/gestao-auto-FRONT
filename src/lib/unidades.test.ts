import { describe, expect, it } from "vitest";
import { trocaDeUnidadePeloNcm, type UnidadeDoCliente, type UnidadeFiscal } from "./unidades";

const unidades: UnidadeDoCliente[] = [
  { id: 1, nome: "Quilograma", unidadeFiscal: "KG", fator: 1 },
  { id: 2, nome: "Tonelada", unidadeFiscal: "KG", fator: 1000 },
  { id: 3, nome: "Grama", unidadeFiscal: "G", fator: 1 },
  { id: 4, nome: "Litro", unidadeFiscal: "LT", fator: 1 },
];

const fiscais: UnidadeFiscal[] = [
  { codigo: "KG", base: "KG" },
  { codigo: "G", base: "KG" },
  { codigo: "TON", base: "KG" },
  { codigo: "LT", base: "LT" },
];

const troca = (atualId: unknown) =>
  trocaDeUnidadePeloNcm("KG", atualId, unidades, fiscais);

describe("a unidade que o NCM impõe", () => {
  it("campo vazio é preenchido calado: não havia nada a perder", () => {
    const r = troca(null);

    expect(r.valores).toEqual({ stockUomId: 1 });
    expect(r.anuncio).toBeUndefined();
  });

  it("prefere a que mede a unidade fiscal em si: quilo antes de tonelada", () => {
    expect(troca(undefined).valores).toEqual({ stockUomId: 1 });
  });

  it("já na unidade do NCM, não mexe nem avisa", () => {
    expect(troca(1)).toEqual({ valores: {} });
  });

  it("tonelada fica: ela já é da unidade tributável, e trocar seria mudar a régua à toa", () => {
    expect(troca(2)).toEqual({ valores: {} });
  });

  it("grama vira quilo, com aviso e desfazer", () => {
    const r = troca(3);

    expect(r.valores).toEqual({ stockUomId: 1 });
    expect(r.anuncio?.desfazer).toEqual({ stockUomId: 3 });
    expect(r.anuncio?.mensagem).toContain("é só desfazer");
  });

  it("litro vira quilo, e a mensagem manda revisar o NCM", () => {
    const r = troca(4);

    expect(r.valores).toEqual({ stockUomId: 1 });
    expect(r.anuncio?.mensagem).toContain("não se convertem");
    expect(r.anuncio?.mensagem).toContain("o NCM é que precisa mudar");
  });

  it("sem unidade do cliente para a unidade tributável, não inventa", () => {
    expect(trocaDeUnidadePeloNcm("M2", 3, unidades, fiscais)).toEqual({ valores: {} });
  });

  it("unidade atual que sumiu da lista não é trocada às cegas", () => {
    expect(troca(999)).toEqual({ valores: {} });
  });
});
