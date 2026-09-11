import { cadastros } from "./cadastros";
import { documentos } from "./documentos";
import { importarPlanoDeContas, leitura } from "./leitura";
import { rh } from "./rh";
import type { Recurso } from "./tipos";

export * from "./tipos";

const todos: Recurso[] = [...cadastros, ...documentos, ...leitura, ...rh];

for (const recurso of todos) {
  if (recurso.rota === "/plano-de-contas") {
    recurso.acoesDeTela = [importarPlanoDeContas];
  }
}

export const recursos = todos;

export const recursoPorRota = new Map(recursos.map((r) => [r.rota, r]));
