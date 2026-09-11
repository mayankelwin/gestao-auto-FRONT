import type { TenantRole } from "./navigation";

export type TomDeMensagem = "success" | "danger" | "warning" | "info";

export interface DestinoDeCorrecao {
  rotulo: string;
  rota: string;
  /** Campo a destacar na chegada. A tela de destino lê `destacar` da query. */
  campo?: string;
}

export interface Mensagem {
  tom: TomDeMensagem;
  titulo: string;
  texto: string;
  /** Quem consegue resolver. Ausente significa "qualquer um". */
  papeis?: TenantRole[];
  /** O caminho da correção, para quem pode percorrê-lo. */
  comoResolver?: string;
  /** O que dizer a quem não pode: a quem pedir, e não como fazer. */
  semPermissao?: string;
  destino?: DestinoDeCorrecao;
  /** Interrompe em vez de avisar de lado. Para o que impede de continuar. */
  interrompe?: boolean;
}

/**
 * O catálogo. Mensagem que aparece em mais de um lugar mora aqui, para dizer a mesma coisa
 * em todos eles e para o texto ser revisado num lugar só.
 */
export const MENSAGENS = {
  "sessao-expirada": {
    tom: "danger",
    titulo: "Sua sessão expirou",
    texto: "O acesso venceu enquanto esta tela estava aberta.",
    comoResolver: "Entre novamente. O que você preencheu foi guardado como rascunho.",
    interrompe: true,
  },

  "sem-permissao": {
    tom: "danger",
    titulo: "Seu papel não permite esta ação",
    texto: "Este cliente não concede ao seu perfil a permissão necessária.",
    semPermissao: "Peça a um administrador do cliente para executar ou para ajustar seu perfil.",
    papeis: ["TENANT_ADMIN"],
    destino: { rotulo: "Abrir Perfis de acesso", rota: "/perfis-de-acesso" },
  },

  "nao-encontrado": {
    tom: "danger",
    titulo: "Registro não encontrado",
    texto: "Ele pode ter sido excluído por outra pessoa enquanto esta tela estava aberta.",
    comoResolver: "Recarregue a lista para ver o estado atual.",
  },

  conflito: {
    tom: "warning",
    titulo: "Conflito com o estado atual",
    texto: "O registro mudou desde que esta tela o carregou.",
    comoResolver: "Recarregue e refaça a alteração sobre a versão nova.",
  },

  "api-indisponivel": {
    tom: "danger",
    titulo: "A API não respondeu",
    texto: "O servidor não está acessível no momento.",
    comoResolver: "Tente de novo em instantes. Se persistir, avise quem cuida da infraestrutura.",
    interrompe: true,
  },

  "dados-invalidos": {
    tom: "danger",
    titulo: "Confira os campos destacados",
    texto: "O servidor recusou o que foi enviado.",
    comoResolver: "Os campos com problema estão marcados no formulário.",
  },

  "empresa-nao-selecionada": {
    tom: "warning",
    titulo: "Nenhuma empresa selecionada",
    texto: "Esta tela trabalha sempre dentro de uma empresa, e não há nenhuma escolhida.",
    comoResolver: "Cadastre uma empresa e selecione-a no topo da tela.",
    semPermissao: "Peça a um administrador do cliente para cadastrar a empresa.",
    papeis: ["TENANT_ADMIN"],
    destino: { rotulo: "Abrir Empresas", rota: "/empresas" },
    interrompe: true,
  },

  "moeda-padrao-ausente": {
    tom: "warning",
    titulo: "A empresa não tem moeda padrão",
    texto: "Sem ela, todo valor lançado fica sem moeda declarada.",
    comoResolver: "Defina a moeda padrão no cadastro da empresa.",
    semPermissao: "Peça a um administrador do cliente para definir a moeda padrão.",
    papeis: ["TENANT_ADMIN"],
    destino: { rotulo: "Abrir Empresas", rota: "/empresas", campo: "defaultCurrencyId" },
  },

  "deposito-padrao-ausente": {
    tom: "info",
    titulo: "Nenhum depósito principal definido",
    texto: "Os movimentos de estoque vão pedir o depósito a cada lançamento.",
    comoResolver: 'Cadastre um depósito analítico com o código "PRINCIPAL".',
    semPermissao: "Peça a um administrador do cliente para cadastrar o depósito principal.",
    papeis: ["TENANT_ADMIN"],
    destino: { rotulo: "Abrir Depósitos", rota: "/depositos" },
  },

  "natureza-sem-regra": {
    tom: "warning",
    titulo: "Esta natureza não resolve CFOP nenhum",
    texto: "Sem pelo menos uma regra, a emissão não sabe qual CFOP usar.",
    comoResolver: "Cadastre uma regra na natureza da operação.",
    semPermissao: "Peça a um administrador do cliente para cadastrar a regra.",
    papeis: ["TENANT_ADMIN"],
    destino: { rotulo: "Abrir Naturezas de operação", rota: "/naturezas-de-operacao" },
  },

  "regra-sem-aliquota": {
    tom: "warning",
    titulo: "Regra tributada sem alíquota",
    texto: "O perfil é tributado normalmente, e a alíquota de ICMS está vazia.",
    comoResolver: "Informe a alíquota na regra. Vazia, a emissão recusa.",
    semPermissao: "Peça a um administrador do cliente para completar a regra.",
    papeis: ["TENANT_ADMIN"],
    destino: {
      rotulo: "Abrir Naturezas de operação",
      rota: "/naturezas-de-operacao",
      campo: "icmsRate",
    },
  },

  "cfop-duplicado": {
    tom: "danger",
    titulo: "CFOP repetido nesta natureza",
    texto: "Já existe uma regra com este CFOP.",
    comoResolver: "Edite a regra existente em vez de criar outra.",
  },

  "documento-ja-atendido": {
    tom: "info",
    titulo: "Nada pendente neste documento",
    texto: "Ele já foi atendido por completo.",
  },

  "rascunho-recuperado": {
    tom: "info",
    titulo: "Recuperamos seu preenchimento",
    texto: "O que você estava digitando aqui foi guardado e devolvido.",
  },

  "estoque-em-conflito": {
    tom: "danger",
    titulo: "A entrada de estoque está em dois lugares",
    texto:
      "Esta nota está marcada para dar entrada no estoque, e a carga já entrou (ou vai entrar) por" +
      " um recebimento separado. Lançar as duas entraria com a mercadoria duas vezes, e por isso o" +
      " lançamento é recusado.",
    comoResolver:
      'Abra a nota e desligue "Atualizar estoque" — a entrada continua pelo recebimento. Se não' +
      " houver recebimento para esta carga, mantenha ligada e cancele o recebimento duplicado.",
    semPermissao: "Peça a quem cuida do financeiro para ajustar a entrada de estoque desta nota.",
    papeis: ["FINANCEIRO", "COMERCIAL"],
    destino: {
      rotulo: "Abrir Faturas de compra",
      rota: "/faturas-de-compra",
      campo: "updateStock",
    },
  },

  "periodo-fechado": {
    tom: "danger",
    titulo: "O período contábil está fechado",
    texto: "A data deste documento cai num período que já foi fechado, e nada mais entra nele.",
    comoResolver:
      "Mude a data para um período aberto, ou reabra o período contábil se ele fechou por engano.",
    semPermissao: "Peça a quem cuida da contabilidade para reabrir o período ou ajustar a data.",
    papeis: ["CONTADOR"],
    destino: { rotulo: "Abrir Períodos contábeis", rota: "/periodos-contabeis" },
  },

  "conta-faltando": {
    tom: "danger",
    titulo: "Falta a conta contábil",
    texto: "O lançamento precisa de uma conta que não está definida no documento nem na empresa.",
    comoResolver:
      "Informe a conta no documento, ou defina a conta padrão no cadastro da empresa para os" +
      " próximos.",
    semPermissao: "Peça a quem cuida da contabilidade para definir a conta.",
    papeis: ["CONTADOR"],
    destino: { rotulo: "Abrir Empresas", rota: "/empresas", campo: "defaultExpenseAccountId" },
  },

  "ja-lancado": {
    tom: "info",
    titulo: "Este documento já foi lançado",
    texto: "Ele saiu de rascunho antes desta tentativa — não há o que lançar de novo.",
    comoResolver: "Recarregue a lista para ver a situação atual.",
  },

  "lancamento-recusado": {
    tom: "danger",
    titulo: "O lançamento foi recusado",
    texto: "O servidor não aceitou este documento.",
    comoResolver: "O motivo informado está abaixo. Ajuste o documento e tente de novo.",
  },

  "boas-vindas": {
    tom: "info",
    titulo: "Bem-vindo ao Gestão Auto",
    texto: "Seu acesso está ativo. O menu à esquerda reúne cadastros, movimento e relatórios.",
  },
} as const satisfies Record<string, Mensagem>;

export type ChaveDeMensagem = keyof typeof MENSAGENS;

export interface MensagemResolvida {
  chave: string;
  tom: TomDeMensagem;
  titulo: string;
  texto: string;
  /** A orientação que cabe a quem está lendo — resolver ou pedir. */
  orientacao?: string;
  destino?: DestinoDeCorrecao;
  podeResolver: boolean;
  interrompe: boolean;
}

function podeComEsses(papeis: readonly string[], exigidos?: readonly TenantRole[]): boolean {
  if (!exigidos || exigidos.length === 0) return true;
  if (papeis.includes("TENANT_ADMIN")) return true;
  return exigidos.some((p) => papeis.includes(p));
}

/**
 * A mensagem adaptada a quem está lendo.
 *
 * Quem não pode resolver não precisa do passo a passo da correção: precisa saber a quem pedir.
 * Mandar alguém a uma tela que seu papel não abre é pior que não dizer nada — a pessoa vai,
 * esbarra, e volta sem entender.
 */
export function resolverMensagem(
  chave: ChaveDeMensagem,
  papeis: readonly string[],
  ajustes: Partial<Mensagem> = {},
): MensagemResolvida {
  const base = { ...MENSAGENS[chave], ...ajustes } as Mensagem;
  const podeResolver = podeComEsses(papeis, base.papeis);

  return {
    chave,
    tom: base.tom,
    titulo: base.titulo,
    texto: base.texto,
    orientacao: podeResolver ? base.comoResolver : (base.semPermissao ?? base.comoResolver),
    destino: podeResolver ? base.destino : undefined,
    podeResolver,
    interrompe: base.interrompe ?? false,
  };
}
