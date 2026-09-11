import { api, mensagemDeErro } from "./client";
import type { components } from "./schema";

export type CatalogoDePermissoes = components["schemas"]["PermissionCatalogResponseDTO"];
export type RecursoDePermissoes = components["schemas"]["ResourcePermissionsDTO"];
export type Permissao = components["schemas"]["PermissionDTO"];

/**
 * O catálogo de permissões, direto da API.
 *
 * Nunca de uma cópia aqui. É o princípio do `ADR-0017`: a tela não pode oferecer um recorte sem
 * endpoint atrás, e a única forma de garantir isso é ela perguntar a quem sabe. Uma lista mantida
 * no front divergiria no primeiro endpoint novo — e divergiria em silêncio.
 */
export async function buscarCatalogoDePermissoes(): Promise<CatalogoDePermissoes> {
  const { data, error, response } = await api.GET("/authorization/permissions", {});

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}
