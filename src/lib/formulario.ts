import type { Registro } from "@/api/lista";
import type { SelectOption } from "@/types";
import { especieDe, type TipoDeCampo } from "./campos";
import { restricaoDe } from "./contrato";

export type { TipoDeCampo };

export type Valores = Record<string, unknown>;

export interface GrupoDaLista {
  chave: string;
  titulo: string;
  prefixo?: string;
}

export interface LinhaDaLista {
  prefixo?: string;
  titulo: string;
  etiqueta?: string;
}

export interface LinhaDePrevia {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}

export interface ReferenciaDeCampo {
  endpoint: string;
  endpointDe?: (contexto: Valores) => string | null;
  rotulo: (registro: Registro) => string;
  busca?: boolean;
  exigeEmpresa?: boolean;
  /**
   * Parametros fixos que a consulta leva, alem de pagina, termo e empresa.
   *
   * Recorte que o servidor faz, e nao o combo: filtrar aqui a pagina que voltou daria uma lista
   * com menos itens do que o tamanho pedido e sem como buscar o resto -- a pessoa procuraria
   * alguem que existe e nao acharia, porque ficou fora dos primeiros cinquenta.
   */
  parametros?: Record<string, unknown>;
  filtro?: (registro: Registro) => boolean;
  padrao?: () => unknown;
  chave?: string;
  parametroDaChave?: string;
  previa?: (registro: Registro) => LinhaDePrevia[];
  /** A linha em partes, quando uma string só não dá hierarquia ao que se lê. */
  linha?: (registro: Registro) => LinhaDaLista;
  /** O cabeçalho que agrupa linhas vizinhas; o caminho aparece nele, e não em cada linha. */
  grupo?: (registro: Registro) => GrupoDaLista | null;
  /** O que a escolha muda em outros campos. Recebe os valores atuais para saber o que mexe. */
  aoEscolher?: (
    registro: Registro,
    valores: Valores,
  ) => Promise<SugestaoDaEscolha> | SugestaoDaEscolha;
}

export interface SugestaoDaEscolha {
  valores: Valores;
  anuncio?: AnuncioDaEscolha;
}

/**
 * O aviso de que a escolha mexeu num campo que a pessoa já tinha preenchido.
 *
 * Preencher campo vazio não precisa de aviso — não havia nada a perder. Trocar o que ela escolheu,
 * sim: sem dizer, o valor mudaria sozinho passos atrás e ela só descobriria na conferência, ou
 * nunca. O `desfazer` é o que restaura, e existe para o aviso não ser só um comunicado.
 */
export interface AnuncioDaEscolha {
  titulo: string;
  mensagem: string;
  desfazer: Valores;
}

export interface ConsultaDeCampo {
  rotulo: string;
  endpoint: string;
  parametro: string;
  /** Busca própria, para a consulta que não sai pela API do sistema. */
  buscar?: (chave: string) => Promise<Registro>;
  chave: (valor: string) => string | null;
  mapear: (resposta: Registro) => Valores;
  aviso?: (resposta: Registro) => string | null;
  disponivel?: (valores: Valores) => boolean;
}

export interface CampoDeFormulario {
  campo: string;
  label: string;
  tipo: TipoDeCampo;
  obrigatorio?: boolean;
  ajuda?: string;
  /**
   * O texto do campo vazio. Função quando ele depende de algo que só se sabe em tempo de uso.
   *
   * É por aqui que um campo mostra o padrão que herdaria sem preenchê-lo — o método de custeio
   * herda o da empresa, e preencher congelaria o item naquele valor.
   */
  placeholder?: string | (() => string);
  opcoes?: SelectOption[];
  referencia?: ReferenciaDeCampo;
  padrao?: unknown | (() => unknown);
  semPadrao?: boolean;
  leDe?: string;
  chaveDoId?: string;
  inteira?: boolean;
  somenteNaCriacao?: boolean;
  geradoPeloSistema?: boolean;
  visivel?: (valores: Valores) => boolean;
  consulta?: ConsultaDeCampo;
  min?: number;
  max?: number;
  passo?: number | "any";
  inputmode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  validar?: (valor: unknown, valores: Valores) => string | null;
}

export interface SecaoDeFormulario {
  titulo?: string;
  campos: CampoDeFormulario[];
}

export type Formulario = SecaoDeFormulario[];

export interface LinhasDeFormulario {
  campo: string;
  titulo: string;
  rotuloNovo: string;
  colunas: CampoDeFormulario[];
  obrigatorio?: boolean;
  total?: (linha: Valores) => number;
  rotuloTotal?: string;
}

export function valoresDeLinha(definicao: LinhasDeFormulario, registro?: Registro): Valores {
  const valores: Valores = {};

  for (const coluna of definicao.colunas) {
    valores[coluna.campo] = registro
      ? normalizar(registro[coluna.leDe ?? coluna.campo], coluna)
      : vazioDe(coluna);
  }

  return valores;
}

export function linhasIniciais(
  definicoes: LinhasDeFormulario[],
  registro?: Registro | null,
): Record<string, Valores[]> {
  const mapa: Record<string, Valores[]> = {};

  for (const definicao of definicoes) {
    const bruto = registro?.[definicao.campo];
    mapa[definicao.campo] = Array.isArray(bruto)
      ? (bruto as Registro[]).map((linha) => valoresDeLinha(definicao, linha))
      : [];
  }

  return mapa;
}

export function corpoDasLinhas(
  definicoes: LinhasDeFormulario[],
  linhas: Record<string, Valores[]>,
): Record<string, unknown> {
  const corpo: Record<string, unknown> = {};

  for (const definicao of definicoes) {
    const lista = linhas[definicao.campo] ?? [];
    corpo[definicao.campo] = lista.map((linha) => {
      const saida: Record<string, unknown> = {};
      for (const coluna of definicao.colunas) {
        const valor = linha[coluna.campo];
        if (valor === "" || valor === null || valor === undefined) {
          if (coluna.tipo === "booleano") saida[coluna.campo] = Boolean(valor);
          continue;
        }
        saida[coluna.campo] = converter(valor, coluna);
      }
      return saida;
    });
  }

  return corpo;
}

function converter(valor: unknown, campo: CampoDeFormulario): unknown {
  const especie = especieDe(campo.tipo);
  return especie.converter ? especie.converter(valor) : valor;
}

export function camposDoFormulario(formulario: Formulario): CampoDeFormulario[] {
  return formulario.flatMap((secao) => secao.campos);
}

export function valoresIniciais(formulario: Formulario, registro?: Registro | null): Valores {
  const valores: Valores = {};

  for (const campo of camposDoFormulario(formulario)) {
    if (registro) {
      valores[campo.campo] = normalizar(registro[campo.leDe ?? campo.campo], campo);
      continue;
    }
    valores[campo.campo] = vazioDe(campo);
  }

  return valores;
}

function vazioDe(campo: CampoDeFormulario): unknown {
  const padrao = campo.padrao ?? (campo.semPadrao ? undefined : campo.referencia?.padrao);

  if (padrao !== undefined) {
    const valor = typeof padrao === "function" ? (padrao as () => unknown)() : padrao;
    if (valor !== null && valor !== undefined) return valor;
  }

  const especie = especieDe(campo.tipo);
  return especie.vazio ? especie.vazio() : "";
}

function normalizar(valor: unknown, campo: CampoDeFormulario): unknown {
  if (valor === null || valor === undefined) return vazioDe(campo);

  const chave = campo.chaveDoId ?? "id";

  if (campo.tipo === "referencias") {
    if (!Array.isArray(valor)) return [];
    return valor
      .map((v) => (v !== null && typeof v === "object" ? (v as Registro)[chave] : v))
      .filter((v) => v !== null && v !== undefined)
      .map(Number);
  }

  if (campo.tipo === "referencia") {
    if (typeof valor === "object") {
      const id = (valor as Registro)[chave];
      return id === undefined || id === null ? null : Number(id);
    }
    return Number(valor);
  }

  const especie = especieDe(campo.tipo);
  return especie.normalizar ? especie.normalizar(valor) : valor;
}

export function corpoDoFormulario(formulario: Formulario, valores: Valores, criando: boolean) {
  const corpo: Record<string, unknown> = {};

  for (const campo of camposDoFormulario(formulario)) {
    if (campo.geradoPeloSistema) continue;
    if (campo.somenteNaCriacao && !criando) continue;
    if (campo.visivel && !campo.visivel(valores)) continue;

    const valor = valores[campo.campo];

    if (valor === "" || valor === null || valor === undefined) {
      if (campo.tipo === "booleano") corpo[campo.campo] = Boolean(valor);
      continue;
    }

    if (campo.tipo === "referencias" && (!Array.isArray(valor) || valor.length === 0)) continue;

    corpo[campo.campo] = converter(valor, campo);
  }

  return corpo;
}

function vazio(valor: unknown, campo: CampoDeFormulario): boolean {
  if (campo.tipo === "referencias") return !Array.isArray(valor) || valor.length === 0;
  return valor === "" || valor === null || valor === undefined;
}

export function faltamObrigatorios(formulario: Formulario, valores: Valores): string[] {
  return camposDoFormulario(formulario)
    .filter((campo) => campo.obrigatorio)
    .filter((campo) => !campo.visivel || campo.visivel(valores))
    .filter((campo) => vazio(valores[campo.campo], campo))
    .map((campo) => campo.campo);
}

function erroDoCampo(campo: CampoDeFormulario, valores: Valores): string | null {
  const valor = valores[campo.campo];

  if (vazio(valor, campo)) return campo.obrigatorio ? "Obrigatório." : null;

  const especie = especieDe(campo.tipo);
  const contrato = restricaoDe(campo.campo);

  if (especie.validar) {
    const erro = especie.validar(valor);
    if (erro) return erro;
  }

  if (contrato?.padrao && !contrato.padrao.test(String(valor))) {
    return contrato.mensagem ?? "Formato inválido.";
  }

  if (especie.controle === "numero") {
    const numero = Number(valor);
    const min = campo.min ?? especie.min ?? contrato?.min;
    const max = campo.max ?? especie.max ?? contrato?.max;
    if (min !== undefined && numero < min) return `Não pode ser menor que ${min}.`;
    if (max !== undefined && numero > max) return `Não pode ser maior que ${max}.`;
  }

  return campo.validar ? campo.validar(valor, valores) : null;
}

export function validarFormulario(
  formulario: Formulario,
  valores: Valores,
): Record<string, string> {
  const erros: Record<string, string> = {};

  for (const campo of camposDoFormulario(formulario)) {
    if (campo.geradoPeloSistema) continue;
    if (campo.visivel && !campo.visivel(valores)) continue;

    const erro = erroDoCampo(campo, valores);
    if (erro) erros[campo.campo] = erro;
  }

  return erros;
}

export function validarLinhas(
  definicoes: LinhasDeFormulario[],
  linhas: Record<string, Valores[]>,
): Record<string, string> {
  const erros: Record<string, string> = {};

  for (const definicao of definicoes) {
    const lista = linhas[definicao.campo] ?? [];

    if (definicao.obrigatorio && lista.length === 0) {
      erros[definicao.campo] = "Acrescente ao menos uma linha.";
      continue;
    }

    for (const [indice, linha] of lista.entries()) {
      for (const coluna of definicao.colunas) {
        const erro = erroDoCampo(coluna, linha);
        if (erro) {
          erros[definicao.campo] = `Linha ${indice + 1}, ${coluna.label}: ${erro}`;
          break;
        }
      }
      if (erros[definicao.campo]) break;
    }
  }

  return erros;
}
