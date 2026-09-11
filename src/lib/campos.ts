import type { SelectOption } from "@/types";
import { OPCOES_UF } from "./opcoes";
import {
  cepValido,
  cpfOuCnpjValido,
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

export type Controle =
  | "texto"
  | "textoLongo"
  | "numero"
  | "data"
  | "booleano"
  | "opcoes"
  | "referencia"
  | "referencias"
  | "documento";

export type TipoDeCampo =
  | "texto"
  | "textoLongo"
  | "inteiro"
  | "decimal"
  | "dinheiro"
  | "percentual"
  | "data"
  | "booleano"
  | "opcoes"
  | "referencia"
  | "referencias"
  | "cpfCnpj"
  | "cep"
  | "telefone"
  | "email"
  | "placa"
  | "uf"
  | "moeda"
  | "pais"
  | "ncm"
  | "referenciaTexto";

export interface EspecieDeCampo {
  controle: Controle;
  tipoDoInput?: string;
  inputmode?: "numeric" | "decimal" | "tel" | "email" | "text";
  maxlength?: number;
  min?: number;
  max?: number;
  passo?: number | "any";
  autocomplete?: string;
  opcoes?: SelectOption[];
  mascara?: (valor: unknown) => string;
  aoDigitar?: (valor: unknown) => unknown;
  validar?: (valor: unknown) => string | null;
  converter?: (valor: unknown) => unknown;
  normalizar?: (valor: unknown) => unknown;
  vazio?: () => unknown;
}

const numero = (valor: unknown): unknown => Number(valor);

const emCaixaAlta = (valor: unknown): unknown => String(valor ?? "").toUpperCase();

const texto: EspecieDeCampo = { controle: "texto" };

export const ESPECIES: Record<TipoDeCampo, EspecieDeCampo> = {
  texto,

  textoLongo: { controle: "textoLongo" },

  inteiro: {
    controle: "numero",
    tipoDoInput: "number",
    inputmode: "numeric",
    passo: 1,
    converter: numero,
    validar: (valor) =>
      Number.isInteger(Number(valor)) ? null : "Informe um número inteiro, sem casas decimais.",
  },

  decimal: {
    controle: "numero",
    tipoDoInput: "number",
    inputmode: "decimal",
    passo: "any",
    converter: numero,
    validar: (valor) => (Number.isFinite(Number(valor)) ? null : "Informe um número."),
  },

  dinheiro: {
    controle: "numero",
    tipoDoInput: "number",
    inputmode: "decimal",
    passo: 0.01,
    converter: numero,
    validar: (valor) => (Number.isFinite(Number(valor)) ? null : "Informe um valor."),
  },

  percentual: {
    controle: "numero",
    tipoDoInput: "number",
    inputmode: "decimal",
    passo: "any",
    min: 0,
    max: 100,
    converter: numero,
    validar: (valor) => (Number.isFinite(Number(valor)) ? null : "Informe um percentual."),
  },

  data: {
    controle: "data",
    tipoDoInput: "date",
    normalizar: (valor) => String(valor).slice(0, 10),
  },

  booleano: {
    controle: "booleano",
    converter: (valor) => Boolean(valor),
    normalizar: (valor) => Boolean(valor),
    vazio: () => false,
  },

  opcoes: {
    controle: "opcoes",
    vazio: () => null,
  },

  referencia: {
    controle: "referencia",
    converter: numero,
    vazio: () => null,
  },

  referenciaTexto: {
    controle: "referencia",
    vazio: () => null,
  },

  referencias: {
    controle: "referencias",
    converter: (valor) => (Array.isArray(valor) ? valor.map(Number) : []),
    vazio: () => [],
  },

  cpfCnpj: {
    controle: "documento",
    maxlength: 18,
    mascara: formatarCpfCnpj,
    aoDigitar: (valor) => soAlfanumerico(valor).slice(0, 14),
    validar: (valor) => (cpfOuCnpjValido(valor) ? null : "CPF ou CNPJ inválido."),
  },

  cep: {
    controle: "documento",
    inputmode: "numeric",
    maxlength: 9,
    autocomplete: "postal-code",
    mascara: formatarCep,
    aoDigitar: (valor) => soDigitos(valor).slice(0, 8),
    validar: (valor) => (cepValido(valor) ? null : "O CEP tem 8 dígitos."),
  },

  telefone: {
    controle: "texto",
    tipoDoInput: "tel",
    inputmode: "tel",
    maxlength: 15,
    autocomplete: "tel",
    mascara: formatarTelefone,
    aoDigitar: (valor) => soDigitos(valor).slice(0, 11),
    validar: (valor) => (telefoneValido(valor) ? null : "Informe DDD e número."),
  },

  email: {
    controle: "texto",
    tipoDoInput: "email",
    inputmode: "email",
    autocomplete: "email",
    aoDigitar: (valor) => String(valor ?? "").trim(),
    validar: (valor) => (emailValido(valor) ? null : "E-mail inválido."),
  },

  placa: {
    controle: "texto",
    maxlength: 8,
    mascara: formatarPlaca,
    aoDigitar: emCaixaAlta,
    validar: (valor) => (placaValida(valor) ? null : "Placa inválida (ABC-1234 ou ABC1D23)."),
  },

  uf: {
    controle: "opcoes",
    opcoes: OPCOES_UF,
    vazio: () => null,
  },

  moeda: {
    controle: "texto",
    maxlength: 3,
    aoDigitar: emCaixaAlta,
    validar: (valor) =>
      /^[A-Z]{3}$/.test(String(valor ?? "")) ? null : "Use o código ISO 4217, 3 letras (BRL, USD).",
  },

  pais: {
    controle: "texto",
    maxlength: 2,
    aoDigitar: emCaixaAlta,
    validar: (valor) =>
      /^[A-Z]{2}$/.test(String(valor ?? "")) ? null : "Use o código ISO de 2 letras (BR).",
  },

  ncm: {
    controle: "texto",
    inputmode: "numeric",
    maxlength: 8,
    aoDigitar: (valor) => soDigitos(valor).slice(0, 8),
    validar: (valor) => (soDigitos(valor).length === 8 ? null : "O NCM tem 8 dígitos."),
  },
};

export function especieDe(tipo: TipoDeCampo): EspecieDeCampo {
  return ESPECIES[tipo] ?? texto;
}
