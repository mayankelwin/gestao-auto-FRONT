import { defineStore } from "pinia";
import { ref } from "vue";
import { useSessao } from "@/auth/sessao";
import {
  resolverMensagem,
  type ChaveDeMensagem,
  type DestinoDeCorrecao,
  type Mensagem,
  type MensagemResolvida,
  type TomDeMensagem,
} from "./mensagens";

export type TomDeAviso = TomDeMensagem;

export interface Aviso {
  id: number;
  tom: TomDeAviso;
  titulo?: string;
  texto: string;
  orientacao?: string;
  destino?: DestinoDeCorrecao;
}

const DURACAO = 5000;

/** O que orienta uma correção fica até ser lido; o "salvo com sucesso" não precisa disso. */
const DURACAO_ORIENTADA = 12000;

export const useAvisos = defineStore("avisos", () => {
  const lista = ref<Aviso[]>([]);
  const dialogo = ref<MensagemResolvida | null>(null);
  let proximo = 0;

  function dispensar(id: number): void {
    lista.value = lista.value.filter((a) => a.id !== id);
  }

  function fecharDialogo(): void {
    dialogo.value = null;
  }

  function empilhar(aviso: Omit<Aviso, "id">, duracao: number): void {
    const id = ++proximo;
    lista.value = [...lista.value, { ...aviso, id }];
    if (duracao > 0) setTimeout(() => dispensar(id), duracao);
  }

  function mostrar(tom: TomDeAviso, texto: string): void {
    empilhar({ tom, texto }, DURACAO);
  }

  /**
   * A mensagem do catálogo, já adaptada ao papel de quem está logado.
   *
   * O que interrompe vai para o diálogo, e não para o canto da tela: um aviso que some sozinho
   * em cinco segundos não é lugar para dizer que a pessoa não pode continuar.
   */
  function mensagem(chave: ChaveDeMensagem, ajustes: Partial<Mensagem> = {}): MensagemResolvida {
    const resolvida = resolverMensagem(chave, useSessao().papeis, ajustes);

    if (resolvida.interrompe) {
      dialogo.value = resolvida;
      return resolvida;
    }

    empilhar(
      {
        tom: resolvida.tom,
        titulo: resolvida.titulo,
        texto: resolvida.texto,
        orientacao: resolvida.orientacao,
        destino: resolvida.destino,
      },
      resolvida.orientacao ? DURACAO_ORIENTADA : DURACAO,
    );

    return resolvida;
  }

  /** Força o diálogo, para a mensagem que interrompe só naquele ponto. */
  function interromper(chave: ChaveDeMensagem, ajustes: Partial<Mensagem> = {}): void {
    dialogo.value = resolverMensagem(chave, useSessao().papeis, ajustes);
  }

  return {
    lista,
    dialogo,
    dispensar,
    fecharDialogo,
    mensagem,
    interromper,
    sucesso: (texto: string) => mostrar("success", texto),
    falha: (texto: string) => mostrar("danger", texto),
    alerta: (texto: string) => mostrar("warning", texto),
    informa: (texto: string) => mostrar("info", texto),
  };
});
