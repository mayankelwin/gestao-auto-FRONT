import { api } from "./client";
import { erroDaResposta } from "./erro";
import type { Registro } from "./lista";

export type Corpo = Record<string, unknown>;

type Chave = number | string;

function alvo(endpoint: string, parametro: string): string {
  return `${endpoint}/{${parametro}}`;
}

function caminho(chave: Chave, parametro: string) {
  return { params: { path: { [parametro]: chave } } };
}

export async function buscarUm(
  endpoint: string,
  chave: Chave,
  parametro = "id",
): Promise<Registro> {
  const { data, error, response } = await api.GET(
    alvo(endpoint, parametro) as never,
    caminho(chave, parametro) as never,
  );

  if (!data) throw erroDaResposta(response.status, error);

  return data as Registro;
}

export async function criar(endpoint: string, corpo: Corpo): Promise<Registro> {
  const { data, error, response } = await api.POST(endpoint as never, { body: corpo } as never);

  if (!data) throw erroDaResposta(response.status, error);

  return data as Registro;
}

export async function atualizar(
  endpoint: string,
  chave: Chave,
  corpo: Corpo,
  parametro = "id",
): Promise<Registro> {
  const { data, error, response } = await api.PUT(
    alvo(endpoint, parametro) as never,
    {
      ...caminho(chave, parametro),
      body: corpo,
    } as never,
  );

  if (!data) throw erroDaResposta(response.status, error);

  return data as Registro;
}

export async function substituir(endpoint: string, corpo: Corpo): Promise<Registro> {
  const { data, error, response } = await api.PUT(endpoint as never, { body: corpo } as never);

  if (!data) throw erroDaResposta(response.status, error);

  return data as Registro;
}

export async function excluir(endpoint: string, chave: Chave, parametro = "id"): Promise<void> {
  const { error, response } = await api.DELETE(
    alvo(endpoint, parametro) as never,
    caminho(chave, parametro) as never,
  );

  if (!response.ok) throw erroDaResposta(response.status, error);
}

export async function executar(
  endpoint: string,
  chave: Chave,
  operacao: string,
  metodo: "POST" | "PUT" = "POST",
  parametro = "id",
): Promise<void> {
  const rota = `${endpoint}/{${parametro}}/${operacao}` as never;
  const opcoes = caminho(chave, parametro) as never;

  const { error, response } =
    metodo === "PUT" ? await api.PUT(rota, opcoes) : await api.POST(rota, opcoes);

  if (!response.ok) throw erroDaResposta(response.status, error);
}

export async function postarComConsulta(
  endpoint: string,
  consulta: Corpo,
  metodo: "POST" | "PUT" = "POST",
): Promise<Registro | null> {
  const opcoes = { params: { query: consulta } } as never;

  const { data, error, response } =
    metodo === "PUT"
      ? await api.PUT(endpoint as never, opcoes)
      : await api.POST(endpoint as never, opcoes);

  if (!response.ok) throw erroDaResposta(response.status, error);

  return (data as Registro | undefined) ?? null;
}

/** Lê um corpo já montado pela API — as rotas `prepare-*` da compra. Não grava nada. */
export async function preparar(rota: string): Promise<Registro> {
  const { data, error, response } = await api.GET(rota as never, {} as never);

  if (!data) throw erroDaResposta(response.status, error);

  return data as Registro;
}
