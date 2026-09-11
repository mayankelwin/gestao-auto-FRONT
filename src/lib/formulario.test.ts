import { describe, expect, it } from "vitest";
import { corpoDoFormulario, validarFormulario, valoresIniciais, type Formulario } from "./formulario";
import { naoAntesDe, naoNoFuturo } from "./validadores";

const formulario = (campos: Formulario[number]["campos"]): Formulario => [{ campos }];

describe("obrigatórios", () => {
  const f = formulario([{ campo: "name", label: "Nome", tipo: "texto", obrigatorio: true }]);

  it("acusa o vazio", () => {
    expect(validarFormulario(f, { name: "" })).toEqual({ name: "Obrigatório." });
  });

  it("aceita o preenchido", () => {
    expect(validarFormulario(f, { name: "Fazenda" })).toEqual({});
  });

  it("não acusa campo opcional vazio", () => {
    const opcional = formulario([{ campo: "nick", label: "Apelido", tipo: "texto" }]);
    expect(validarFormulario(opcional, { nick: "" })).toEqual({});
  });
});

describe("formato vindo do tipo", () => {
  it("recusa CPF/CNPJ inválido e aceita válido", () => {
    const f = formulario([{ campo: "taxId", label: "CPF/CNPJ", tipo: "cpfCnpj" }]);
    expect(validarFormulario(f, { taxId: "11144477736" })).toEqual({
      taxId: "CPF ou CNPJ inválido.",
    });
    expect(validarFormulario(f, { taxId: "12ABC34501DE35" })).toEqual({});
  });

  it("recusa e-mail e CEP malformados", () => {
    const f = formulario([
      { campo: "email", label: "E-mail", tipo: "email" },
      { campo: "postalCode", label: "CEP", tipo: "cep" },
    ]);
    const erros = validarFormulario(f, { email: "a@b", postalCode: "7855" });
    expect(Object.keys(erros)).toEqual(["email", "postalCode"]);
  });

  it("exige inteiro sem casas decimais", () => {
    const f = formulario([{ campo: "creditDays", label: "Dias", tipo: "inteiro" }]);
    expect(validarFormulario(f, { creditDays: 2.5 }).creditDays).toContain("inteiro");
    expect(validarFormulario(f, { creditDays: 30 })).toEqual({});
  });

  it("exige ISO 4217 na moeda", () => {
    const f = formulario([{ campo: "code", label: "Código ISO", tipo: "moeda" }]);
    expect(validarFormulario(f, { code: "REAL" }).code).toContain("ISO 4217");
    expect(validarFormulario(f, { code: "BRL" })).toEqual({});
  });
});

describe("limites do contrato da API", () => {
  it("aplica o mínimo declarado, sem o campo precisar declarar nada", () => {
    const f = formulario([{ campo: "quantity", label: "Quantidade", tipo: "decimal" }]);
    expect(validarFormulario(f, { quantity: -1 })).toEqual({
      quantity: "Não pode ser menor que 0.",
    });
    expect(validarFormulario(f, { quantity: 0 })).toEqual({});
  });

  it("aplica o teto de percentual", () => {
    const f = formulario([{ campo: "taxRate", label: "Alíquota (%)", tipo: "decimal" }]);
    expect(validarFormulario(f, { taxRate: 101 })).toEqual({
      taxRate: "Não pode ser maior que 100.",
    });
  });

  it("aplica faixa fechada em padding", () => {
    const f = formulario([{ campo: "padding", label: "Dígitos", tipo: "inteiro" }]);
    expect(validarFormulario(f, { padding: 0 }).padding).toContain("menor que 1");
    expect(validarFormulario(f, { padding: 13 }).padding).toContain("maior que 12");
    expect(validarFormulario(f, { padding: 6 })).toEqual({});
  });

  it("aplica padrão declarado por nome de campo", () => {
    const f = formulario([{ campo: "ibgeCityCode", label: "Código IBGE", tipo: "texto" }]);
    expect(validarFormulario(f, { ibgeCityCode: "123" }).ibgeCityCode).toContain("7 dígitos");
    expect(validarFormulario(f, { ibgeCityCode: "5108402" })).toEqual({});
  });

  it("o campo tem precedência sobre o contrato", () => {
    const f = formulario([{ campo: "quantity", label: "Quantidade", tipo: "decimal", min: -10 }]);
    expect(validarFormulario(f, { quantity: -1 })).toEqual({});
  });
});

describe("regras cruzadas", () => {
  const f = formulario([
    { campo: "startDate", label: "Início", tipo: "data", obrigatorio: true },
    {
      campo: "endDate",
      label: "Fim",
      tipo: "data",
      obrigatorio: true,
      validar: naoAntesDe("startDate", "O fim não pode ser anterior ao início."),
    },
  ]);

  it("recusa o fim antes do início", () => {
    const erros = validarFormulario(f, { startDate: "2026-01-31", endDate: "2026-01-01" });
    expect(erros.endDate).toBe("O fim não pode ser anterior ao início.");
  });

  it("aceita o fim igual ou depois", () => {
    expect(validarFormulario(f, { startDate: "2026-01-01", endDate: "2026-01-01" })).toEqual({});
    expect(validarFormulario(f, { startDate: "2026-01-01", endDate: "2026-12-31" })).toEqual({});
  });

  it("recusa data futura em naoNoFuturo", () => {
    const nascimento = formulario([
      {
        campo: "birthDate",
        label: "Nascimento",
        tipo: "data",
        validar: naoNoFuturo("A data de nascimento não pode ser futura."),
      },
    ]);
    expect(validarFormulario(nascimento, { birthDate: "2999-01-01" }).birthDate).toContain(
      "futura",
    );
    expect(validarFormulario(nascimento, { birthDate: "1980-05-20" })).toEqual({});
  });
});

describe("campos fora de cena", () => {
  const f = formulario([
    { campo: "taxpayerType", label: "Contribuinte", tipo: "opcoes" },
    {
      campo: "stateRegistration",
      label: "IE",
      tipo: "texto",
      obrigatorio: true,
      visivel: (valores) => valores.taxpayerType === "ICMS_CONTRIBUTOR",
    },
  ]);

  it("exige a IE quando é contribuinte de ICMS", () => {
    const erros = validarFormulario(f, { taxpayerType: "ICMS_CONTRIBUTOR", stateRegistration: "" });
    expect(erros.stateRegistration).toBe("Obrigatório.");
  });

  it("não exige nem valida quando o campo está invisível", () => {
    expect(validarFormulario(f, { taxpayerType: "EXEMPT", stateRegistration: "" })).toEqual({});
  });

  it("o corpo enviado omite o campo invisível, e o PUT limpa o valor no servidor", () => {
    const corpo = corpoDoFormulario(f, { taxpayerType: "EXEMPT", stateRegistration: "123" }, false);
    expect(corpo).not.toHaveProperty("stateRegistration");
  });

  it("não valida campo gerado pelo sistema", () => {
    const gerado = formulario([
      { campo: "code", label: "Referência", tipo: "moeda", geradoPeloSistema: true },
    ]);
    expect(validarFormulario(gerado, { code: "qualquer coisa" })).toEqual({});
  });
});

describe("valores iniciais por espécie", () => {
  it("dá o vazio certo para cada tipo", () => {
    const f = formulario([
      { campo: "nome", label: "Nome", tipo: "texto" },
      { campo: "ativo", label: "Ativo", tipo: "booleano" },
      { campo: "grupoId", label: "Grupo", tipo: "referencia" },
      { campo: "empresas", label: "Empresas", tipo: "referencias" },
      { campo: "uf", label: "UF", tipo: "uf" },
    ]);
    expect(valoresIniciais(f)).toEqual({
      nome: "",
      ativo: false,
      grupoId: null,
      empresas: [],
      uf: null,
    });
  });
});

describe("NCM e unidade tributável", () => {
  const item = formulario([
    { campo: "stockItem", label: "Item de estoque", tipo: "booleano" },
    {
      campo: "ncm",
      label: "NCM",
      tipo: "referenciaTexto",
      referencia: { endpoint: "/ncm", chave: "code", rotulo: () => "" },
      obrigatorio: true,
      visivel: (v) => v.stockItem !== false,
    },
  ]);

  it("cobra o NCM da mercadoria", () => {
    expect(validarFormulario(item, { stockItem: true, ncm: "" })).toEqual({
      ncm: "Obrigatório.",
    });
  });

  it("não cobra o NCM do serviço: quem numera serviço é a lista da LC 116", () => {
    expect(validarFormulario(item, { stockItem: false, ncm: "" })).toEqual({});
  });

  it("guarda o código como texto, e não como número — 01012100 não é 1012100", () => {
    const corpo = corpoDoFormulario(item, { stockItem: true, ncm: "01012100" }, true);
    expect(corpo.ncm).toBe("01012100");
  });
});
