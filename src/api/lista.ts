import { api, mensagemDeErro } from "./client";
import type { components } from "./schema";

export type MetadadosDePagina = components["schemas"]["PageMetadata"];

export interface Registro {
  [campo: string]: unknown;
}

export interface PaginaDeRegistros {
  content: Registro[];
  page?: MetadadosDePagina;
}

export interface Paginacao {
  page: number;
  size: number;
}

export interface OpcoesDeLista extends Paginacao {
  termo?: string;
  companyId?: number | null;
  [parametro: string]: unknown;
}

export async function listar(
  caminho: string,
  opcoes: OpcoesDeLista,
): Promise<PaginaDeRegistros> {
  const { page, size, termo, companyId, ...extras } = opcoes;
  const usaBusca = Boolean(termo);

  const query: Record<string, unknown> = { page, size };
  if (usaBusca) query.term = termo;
  if (companyId !== undefined && companyId !== null) query.companyId = companyId;

  for (const [nome, valor] of Object.entries(extras)) {
    if (valor !== undefined && valor !== null && valor !== "") query[nome] = valor;
  }

  const alvo = usaBusca ? `${caminho}/search` : caminho;

  const { data, error, response } = await api.GET(alvo as never, { params: { query } } as never);

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  if (Array.isArray(data)) return { content: data as Registro[] };

  return data as PaginaDeRegistros;
}
