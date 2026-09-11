import { reactive } from "vue";
import type { Registro } from "@/api/lista";
import { useSessao } from "@/auth/sessao";
import { camposDoFormulario } from "./formulario";
import { recursos, type Recurso } from "./recursos";

export interface PedidoDeCriacao {
  id: number;
  recurso: Recurso;
  texto: string;
  resolver: (registro: Registro | null) => void;
}

const porEndpoint = new Map<string, Recurso>();

for (const recurso of recursos) {
  if (recurso.formulario) porEndpoint.set(recurso.endpoint, recurso);
}

export const pedidosDeCriacao = reactive<PedidoDeCriacao[]>([]);

let proximo = 0;

export function recursoCriavel(endpoint: string): Recurso | null {
  const recurso = porEndpoint.get(endpoint);
  if (!recurso) return null;
  return useSessao().temPapel(...recurso.papeisEscrita) ? recurso : null;
}

export function pedirCriacao(endpoint: string, texto: string): Promise<Registro | null> {
  const recurso = recursoCriavel(endpoint);
  if (!recurso) return Promise.resolve(null);

  return new Promise((resolver) => {
    pedidosDeCriacao.push({ id: ++proximo, recurso, texto: texto.trim(), resolver });
  });
}

export function concluirCriacao(id: number, registro: Registro | null): void {
  const posicao = pedidosDeCriacao.findIndex((p) => p.id === id);
  if (posicao === -1) return;

  const [pedido] = pedidosDeCriacao.splice(posicao, 1);
  pedido.resolver(registro);
}

export function inicioDoFormulario(recurso: Recurso, texto: string): Registro | null {
  if (!texto) return null;

  const campo = camposDoFormulario(recurso.formulario ?? []).find(
    (c) => c.tipo === "texto" && c.obrigatorio,
  );

  return campo ? { [campo.campo]: texto } : null;
}
