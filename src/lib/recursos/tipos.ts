import type { Component } from "vue";
import type { TenantRole } from "@/lib/navigation";
import type { BadgeTone } from "@/types";
import type { Registro } from "@/api/lista";
import type { Formulario, LinhasDeFormulario } from "@/lib/formulario";
import type { PainelDeRecurso } from "@/lib/subrecursos";

export type Formato =
  | "texto"
  | "codigo"
  | "numero"
  | "dinheiro"
  | "data"
  | "dataHora"
  | "booleano"
  | "situacao";

export interface ColunaRecurso {
  campo: string;
  label: string;
  formato?: Formato;
  valor?: (registro: Registro) => unknown;
  situacao?: (registro: Registro) => { texto: string; tom: BadgeTone } | null;
  /**
   * A segunda linha da célula, em tom menor. Existe para o código gerado: `NAT-0001` não diz nada
   * sozinho, e quem lê a lista precisa da descrição ao lado para saber qual natureza é qual.
   */
  descricao?: (registro: Registro) => string | null;
}

export interface AcaoDeRecurso {
  chave: string;
  rotulo: string;
  /**
   * O que a ação precisa perguntar antes de agir.
   *
   * Sem isto, a ação é um POST vazio atrás de uma confirmação — o caso de "lançar" e "cancelar".
   * Com isto, abre formulário: emitir nota precisa saber o modelo, e a confirmação não tem onde
   * receber essa resposta.
   */
  formulario?: Formulario;
  titulo?: string;
  icone?: Component;
  metodo?: "POST" | "PUT";
  perigo?: boolean;
  confirmacao: string;
  sucesso: string;
  papeis?: TenantRole[];
  disponivel?: (registro: Registro) => boolean;
  motivo?: string;
  /**
   * A ação que não age: lê o documento seguinte já montado e abre o formulário de criação dele.
   *
   * `origem` é a rota de preparação da API, que devolve o mesmo corpo que a criação recebe — com a
   * quantidade pendente e a linha de origem apontadas. `rota` é o recurso em que esse corpo vira
   * formulário. Nada é gravado até quem confere mandar de volta.
   */
  prepara?: { origem: (registro: Registro) => string; rota: string };
}

export interface AcaoDeTela {
  chave: string;
  rotulo: string;
  titulo: string;
  icone?: Component;
  papeis: TenantRole[];
  endpoint: string;
  metodo?: "POST" | "PUT";
  formulario: Formulario;
  linhas?: LinhasDeFormulario[];
  largura?: "media" | "larga" | "cheia";
  sucesso: string;
  porConsulta?: boolean;
  variante?: "primary" | "secondary";
  opcoesDinamicas?: OpcoesDinamicas[];
}

export interface OpcoesDinamicas {
  campo: string;
  endpoint: string;
  valor: (registro: Registro) => string | number;
  rotulo: (registro: Registro) => string;
}

export interface Recurso {
  rota: string;
  endpoint: string;
  temBusca: boolean;
  exigeEmpresa?: boolean;
  buscaPlaceholder?: string;
  papeisEscrita: TenantRole[];
  rotuloNovo?: string;
  singular?: string;
  chave?: string;
  colunas: ColunaRecurso[];
  formulario?: Formulario;
  linhas?: LinhasDeFormulario[];
  larguraDoFormulario?: "media" | "larga" | "cheia";
  acoes?: AcaoDeRecurso[];
  /** Ações como ícones na linha, em vez do menu. Para o fluxo que se percorre repetindo o mesmo passo. */
  acoesEmIcones?: boolean;
  /** O `sort` que a lista pede à API. Sem isto, vale a ordem que o servidor devolver. */
  ordenacao?: string;
  acoesDeTela?: AcaoDeTela[];
  exclusao?: {
    titulo: string;
    mensagem: (rotulo: string) => string;
    rotuloConfirmar: string;
    sucesso: string;
  };
  painel?: PainelDeRecurso;
  podeExcluir?: (registro: Registro) => boolean;
  podeEditar?: (registro: Registro) => boolean;
  carregarAntesDeEditar?: boolean;
  aoCarregar?: (registro: Registro) => Registro;
  rotulo?: (registro: Registro) => string;
}

export const SITUACAO_DO_DOCUMENTO: Record<string, { texto: string; tom: BadgeTone }> = {
  DRAFT: { texto: "Rascunho", tom: "neutral" },
  SUBMITTED: { texto: "Lançado", tom: "success" },
  CANCELLED: { texto: "Cancelado", tom: "danger" },
};

export function situacaoDoDocumento(registro: Registro) {
  const bruto = String(registro.status ?? "");
  if (registro.isReturn) {
    const base = SITUACAO_DO_DOCUMENTO[bruto];
    return { texto: base ? `Devolução · ${base.texto}` : "Devolução", tom: "warning" as BadgeTone };
  }
  return (
    SITUACAO_DO_DOCUMENTO[bruto] ?? (bruto ? { texto: bruto, tom: "neutral" as BadgeTone } : null)
  );
}

/**
 * O estado fiscal da fatura, que responde outra pergunta que o status.
 *
 * `status` diz "isto lançou?"; este diz "isto tem nota?". EMITINDO é o que mais importa mostrar:
 * a emissão é assíncrona, e sem ele a pessoa não sabe se a nota está a caminho ou parada — e
 * clica de novo.
 */
export const ESTADO_FISCAL: Record<string, { texto: string; tom: BadgeTone }> = {
  SEM_NOTA: { texto: "Sem nota", tom: "neutral" },
  EMITINDO: { texto: "Emitindo…", tom: "warning" },
  AUTORIZADA: { texto: "Autorizada", tom: "success" },
  REJEITADA: { texto: "Rejeitada", tom: "danger" },
  CANCELADA: { texto: "Nota cancelada", tom: "neutral" },
};

export function estadoFiscal(registro: Registro) {
  const bruto = String(registro.fiscalStatus ?? "");
  return ESTADO_FISCAL[bruto] ?? (bruto ? { texto: bruto, tom: "neutral" as BadgeTone } : null);
}

export function ativoOuInativo(registro: Registro) {
  return registro.disabled
    ? { texto: "Inativo", tom: "neutral" as BadgeTone }
    : { texto: "Ativo", tom: "success" as BadgeTone };
}

export function habilitadoOuNao(registro: Registro) {
  return registro.enabled === false
    ? { texto: "Inativo", tom: "neutral" as BadgeTone }
    : { texto: "Ativo", tom: "success" as BadgeTone };
}

export function ativoOuNao(registro: Registro) {
  return registro.active === false
    ? { texto: "Inativa", tom: "neutral" as BadgeTone }
    : { texto: "Ativa", tom: "success" as BadgeTone };
}

export const emRascunho = (registro: Registro): boolean => registro.status === "DRAFT";
export const lancado = (registro: Registro): boolean => registro.status === "SUBMITTED";
