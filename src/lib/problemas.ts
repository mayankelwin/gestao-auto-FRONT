import { defineStore } from "pinia";
import { ref } from "vue";
import { ErroDaApi } from "@/api/erro";
import type { ChaveDeMensagem } from "./mensagens";

const CHAVE = "gs.problemas";

export interface ProblemaRegistrado {
  chave: ChaveDeMensagem;
  detalhe: string;
  acao: string;
  em: number;
}

type Mapa = Record<string, ProblemaRegistrado>;

/**
 * O que a API recusou, traduzido para uma entrada do catálogo.
 *
 * A recusa vem como texto do servidor; o `rule` chega quando ele o informa. Casar por texto é
 * frágil de propósito ser explícito: sem `rule`, é o que há — e o genérico preserva a mensagem
 * original em vez de inventar uma causa.
 */
export function interpretarFalha(erro: unknown): ChaveDeMensagem {
  const regra = erro instanceof ErroDaApi ? (erro.regra ?? "") : "";
  const texto = `${regra} ${erro instanceof Error ? erro.message : String(erro)}`.toLowerCase();

  if (/estoque|stock|movimenta|recebimento j/.test(texto)) return "estoque-em-conflito";
  if (/per.odo|exerc.cio|fechado|closed/.test(texto)) return "periodo-fechado";
  if (/conta|account/.test(texto)) return "conta-faltando";
  if (/j. lan.ad|already submitted/.test(texto)) return "ja-lancado";

  return "lancamento-recusado";
}

function ler(): Mapa {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Mapa) : {};
  } catch {
    return {};
  }
}

function gravar(mapa: Mapa): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(mapa));
  } catch {
    return;
  }
}

/**
 * A última recusa de cada documento, guardada no navegador.
 *
 * A API não guarda a tentativa que falhou: quem tenta lançar e é recusado perde o motivo assim que
 * o aviso some. Guardar aqui é o que permite voltar ao documento depois e ler com calma o que
 * impediu — que é a diferença entre "deu erro" e saber o que fazer.
 */
export const useProblemas = defineStore("problemas", () => {
  const mapa = ref<Mapa>(ler());

  function chaveDe(rota: string, id: unknown): string {
    return `${rota}:${String(id)}`;
  }

  function registrar(rota: string, id: unknown, acao: string, erro: unknown): void {
    const problema: ProblemaRegistrado = {
      chave: interpretarFalha(erro),
      detalhe: erro instanceof Error ? erro.message : String(erro),
      acao,
      em: Date.now(),
    };

    mapa.value = { ...mapa.value, [chaveDe(rota, id)]: problema };
    gravar(mapa.value);
  }

  function limpar(rota: string, id: unknown): void {
    const chave = chaveDe(rota, id);
    if (!(chave in mapa.value)) return;

    const { [chave]: _removido, ...resto } = mapa.value;
    mapa.value = resto;
    gravar(mapa.value);
  }

  function doRegistro(rota: string, id: unknown): ProblemaRegistrado | null {
    return mapa.value[chaveDe(rota, id)] ?? null;
  }

  return { registrar, limpar, doRegistro };
});
