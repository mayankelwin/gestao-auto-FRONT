import { describe, expect, it } from "vitest";
import {
  cepValido,
  cnpjAlfanumerico,
  cnpjValido,
  cpfOuCnpjValido,
  cpfValido,
  emailValido,
  formatarCep,
  formatarCpfCnpj,
  formatarPlaca,
  formatarTelefone,
  placaValida,
  soAlfanumerico,
  soDigitos,
  telefoneValido,
} from "./mascaras";

describe("CPF", () => {
  it.each(["111.444.777-35", "529.982.247-25", "12345678909"])("aceita %s", (valor) => {
    expect(cpfValido(valor)).toBe(true);
  });

  it.each(["111.444.777-36", "529.982.247-26", "5299822472"])("recusa %s", (valor) => {
    expect(cpfValido(valor)).toBe(false);
  });

  it.each([
    "00000000000",
    "11111111111",
    "22222222222",
    "33333333333",
    "44444444444",
    "55555555555",
    "66666666666",
    "77777777777",
    "88888888888",
    "99999999999",
  ])("recusa a sequência repetida %s", (valor) => {
    expect(cpfValido(valor)).toBe(false);
  });

  it("ignora a pontuação ao validar", () => {
    expect(cpfValido("529.982.247-25")).toBe(cpfValido("52998224725"));
  });
});

describe("CNPJ numérico", () => {
  it.each(["11.222.333/0001-81", "00.000.000/0001-91", "34028316000103"])(
    "aceita %s",
    (valor) => {
      expect(cnpjValido(valor)).toBe(true);
    },
  );

  it.each(["11.222.333/0001-82", "11111111111111", "1122233300018"])("recusa %s", (valor) => {
    expect(cnpjValido(valor)).toBe(false);
  });
});

describe("CNPJ alfanumérico (IN RFB 2.229/2024)", () => {
  it("aceita o exemplo oficial da Receita", () => {
    expect(cnpjValido("12.ABC.345/01DE-35")).toBe(true);
    expect(cnpjValido("12ABC34501DE35")).toBe(true);
  });

  it("recusa o mesmo número com dígito verificador errado", () => {
    expect(cnpjValido("12ABC34501DE36")).toBe(false);
  });

  it("exige que os dois dígitos verificadores sejam numéricos", () => {
    expect(cnpjValido("12ABC34501DEA5")).toBe(false);
    expect(cnpjValido("12ABC34501DE3A")).toBe(false);
  });

  it("normaliza minúsculas antes de validar", () => {
    expect(cnpjValido("12abc34501de35")).toBe(true);
  });

  it("distingue alfanumérico de numérico", () => {
    expect(cnpjAlfanumerico("12ABC34501DE35")).toBe(true);
    expect(cnpjAlfanumerico("34028316000103")).toBe(false);
  });

  it("é generalização estrita: todo CNPJ numérico válido continua válido", () => {
    for (const valor of ["11222333000181", "00000000000191", "34028316000103"]) {
      expect(cnpjValido(valor)).toBe(true);
    }
  });
});

describe("cpfOuCnpjValido", () => {
  it("resolve pelo tamanho", () => {
    expect(cpfOuCnpjValido("11144477735")).toBe(true);
    expect(cpfOuCnpjValido("11222333000181")).toBe(true);
    expect(cpfOuCnpjValido("12ABC34501DE35")).toBe(true);
  });

  it("não trata 11 posições com letra como CPF", () => {
    expect(cpfOuCnpjValido("1114447773A")).toBe(false);
  });

  it("recusa tamanhos que não são 11 nem 14", () => {
    expect(cpfOuCnpjValido("123")).toBe(false);
    expect(cpfOuCnpjValido("111444777351")).toBe(false);
  });
});

describe("máscaras", () => {
  it("formata CPF", () => {
    expect(formatarCpfCnpj("11144477735")).toBe("111.444.777-35");
  });

  it("formata CNPJ numérico e alfanumérico", () => {
    expect(formatarCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCpfCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
    expect(formatarCpfCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });

  it("formata enquanto se digita, sem exigir o valor completo", () => {
    expect(formatarCpfCnpj("111")).toBe("111");
    expect(formatarCpfCnpj("111444")).toBe("111.444");
    expect(formatarCpfCnpj("12ABC")).toBe("12.ABC");
  });

  it("não passa do tamanho do documento", () => {
    expect(formatarCpfCnpj("1122233300018199999")).toBe("11.222.333/0001-81");
  });

  it("formata CEP, telefone fixo e celular", () => {
    expect(formatarCep("78550000")).toBe("78550-000");
    expect(formatarTelefone("6533211234")).toBe("(65) 3321-1234");
    expect(formatarTelefone("65999887766")).toBe("(65) 99988-7766");
  });

  it("formata placa antiga e Mercosul", () => {
    expect(formatarPlaca("abc1234")).toBe("ABC-1234");
    expect(formatarPlaca("abc1d23")).toBe("ABC1D23");
  });
});

describe("normalizadores", () => {
  it("soDigitos descarta tudo que não é dígito", () => {
    expect(soDigitos("(65) 3321-1234")).toBe("6533211234");
    expect(soDigitos(null)).toBe("");
  });

  it("soAlfanumerico preserva letra e sobe para maiúscula", () => {
    expect(soAlfanumerico("12.abc.345/01de-35")).toBe("12ABC34501DE35");
    expect(soAlfanumerico(undefined)).toBe("");
  });
});

describe("predicados", () => {
  it("valida CEP por tamanho", () => {
    expect(cepValido("78550-000")).toBe(true);
    expect(cepValido("7855000")).toBe(false);
  });

  it("valida telefone por DDD e nono dígito", () => {
    expect(telefoneValido("6533211234")).toBe(true);
    expect(telefoneValido("65999887766")).toBe(true);
    expect(telefoneValido("65899887766")).toBe(false);
    expect(telefoneValido("0133211234")).toBe(false);
    expect(telefoneValido("653321123")).toBe(false);
  });

  it("valida e-mail", () => {
    expect(emailValido("a@b.co")).toBe(true);
    expect(emailValido(" contato@fazenda.com.br ")).toBe(true);
    expect(emailValido("a@b")).toBe(false);
    expect(emailValido("a b@c.co")).toBe(false);
  });

  it("valida placa nos dois padrões", () => {
    expect(placaValida("ABC-1234")).toBe(true);
    expect(placaValida("ABC1D23")).toBe(true);
    expect(placaValida("AB-1234")).toBe(false);
    expect(placaValida("ABCD123")).toBe(false);
  });
});
