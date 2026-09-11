import type { SelectOption } from "@/types";

function opcoes(mapa: Record<string, string>): SelectOption[] {
  return Object.entries(mapa).map(([value, label]) => ({ value, label }));
}

export const METODO_DE_CUSTEIO = {
  MOVING_AVERAGE: "Médio móvel",
  FIFO: "PEPS (primeiro que entra, primeiro que sai)",
};

export const NATUREZA_DE_CONTA = {
  ASSET: "Ativo",
  LIABILITY: "Passivo",
  EQUITY: "Patrimônio líquido",
  INCOME: "Receita",
  EXPENSE: "Despesa",
};

export const TIPO_DE_CONTA = {
  BANK: "Banco",
  CASH: "Caixa",
  RECEIVABLE: "A receber",
  PAYABLE: "A pagar",
  STOCK: "Estoque",
  STOCK_ADJUSTMENT: "Ajuste de estoque",
  STOCK_RECEIVED_BUT_NOT_BILLED: "Estoque recebido não faturado",
  SERVICE_RECEIVED_BUT_NOT_BILLED: "Serviço recebido não faturado",
  ASSET_RECEIVED_BUT_NOT_BILLED: "Ativo recebido não faturado",
  FIXED_ASSET: "Imobilizado",
  CURRENT_ASSET: "Ativo circulante",
  CURRENT_LIABILITY: "Passivo circulante",
  CAPITAL_WORK_IN_PROGRESS: "Imobilizado em andamento",
  ACCUMULATED_DEPRECIATION: "Depreciação acumulada",
  DEPRECIATION: "Depreciação",
  COST_OF_GOODS_SOLD: "Custo da mercadoria vendida",
  DIRECT_INCOME: "Receita direta",
  INDIRECT_INCOME: "Receita indireta",
  INCOME_ACCOUNT: "Conta de receita",
  DIRECT_EXPENSE: "Despesa direta",
  INDIRECT_EXPENSE: "Despesa indireta",
  EXPENSE_ACCOUNT: "Conta de despesa",
  EXPENSES_INCLUDED_IN_VALUATION: "Despesa inclusa na valoração",
  EXPENSES_INCLUDED_IN_ASSET_VALUATION: "Despesa inclusa na valoração do ativo",
  EQUITY: "Patrimônio líquido",
  LIABILITY: "Passivo",
  TAX: "Imposto",
  CHARGEABLE: "Faturável",
  ROUND_OFF: "Arredondamento",
  ROUND_OFF_FOR_OPENING: "Arredondamento de abertura",
  TEMPORARY: "Transitória",
};

export const NATUREZA_DO_SALDO = { DEBIT: "Devedor", CREDIT: "Credor" };

export const ESPECIE_DE_PARCEIRO = { INDIVIDUAL: "Pessoa física", COMPANY: "Pessoa jurídica" };

export const SEXO = { FEMALE: "Feminino", MALE: "Masculino" };

export const TIPO_DE_EMPRESA = { PRIVATE: "Privado", PUBLIC: "Público" };

export const ESFERA_PUBLICA = { FEDERAL: "Federal", STATE: "Estadual", MUNICIPAL: "Municipal" };

export const TIPO_DE_CONTRIBUINTE = {
  ICMS_CONTRIBUTOR: "1 - Contribuinte de ICMS",
  EXEMPT: "2 - Contribuinte isento de inscrição",
  NON_CONTRIBUTOR: "9 - Não contribuinte",
};

export const BASE_DO_VENCIMENTO = {
  INVOICE_DATE: "Data da fatura",
  MONTH_END: "Fim do mês da fatura",
};

export const TIPO_DE_PAGAMENTO = { RECEIVE: "Recebimento", PAY: "Pagamento" };

export const ESPECIE_DE_PARTE = {
  CUSTOMER: "Cliente",
  SUPPLIER: "Fornecedor",
  EMPLOYEE: "Funcionário",
  SHAREHOLDER: "Sócio",
};

export const SOMA_OU_SUBTRAI = { ADD: "Soma", DEDUCT: "Subtrai" };

export const ESPECIE_DE_REFERENCIA = {
  SALES_INVOICE: "Fatura de venda",
  PURCHASE_INVOICE: "Fatura de compra",
};

export const ESPECIE_DE_MEIO_DE_PAGAMENTO = {
  CASH: "Dinheiro",
  CARD: "Cartão",
  PIX: "Pix",
  CHECK: "Cheque",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

export const SITUACAO_DO_TURNO = {
  OPEN: "Aberto",
  CLOSED: "Fechado",
  CANCELLED: "Cancelado",
};

export const SITUACAO_DA_LINHA_DE_EXTRATO = {
  UNRECONCILED: "Não conciliada",
  PARTIALLY_RECONCILED: "Parcial",
  RECONCILED: "Conciliada",
  CANCELLED: "Cancelada",
};

export const SITUACAO_DA_UNIDADE = {
  AVAILABLE: "Disponível",
  DELIVERED: "Entregue",
  CONSUMED: "Consumida",
  SCRAPPED: "Descartada",
};

export const UNIDADE_DA_FEDERACAO = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export const opcoesDe = opcoes;

export const OPCOES_UF = opcoes(UNIDADE_DA_FEDERACAO);

export const OPCOES_METODO_DE_CUSTEIO = opcoes(METODO_DE_CUSTEIO);
export const OPCOES_NATUREZA_DE_CONTA = opcoes(NATUREZA_DE_CONTA);
export const OPCOES_TIPO_DE_CONTA = opcoes(TIPO_DE_CONTA);
export const OPCOES_NATUREZA_DO_SALDO = opcoes(NATUREZA_DO_SALDO);
export const OPCOES_ESPECIE_DE_PARCEIRO = opcoes(ESPECIE_DE_PARCEIRO);
export const OPCOES_TIPO_DE_CONTRIBUINTE = opcoes(TIPO_DE_CONTRIBUINTE);
export const OPCOES_SEXO = opcoes(SEXO);
export const OPCOES_TIPO_DE_EMPRESA = opcoes(TIPO_DE_EMPRESA);
/**
 * A origem da mercadoria na nota (a primeira parte do CST).
 *
 * Fica no item, e nao na natureza da operacao, porque nao depende do destino: o item importado
 * continua importado sendo vendido para dentro ou para fora do estado.
 *
 * Nao tem padrao de proposito. "0" e o caso da esmagadora maioria, e por isso mesmo e o padrao
 * perigoso: marcaria como nacional, em silencio, todo item importado que ninguem revisou.
 */
export const ORIGEM_DA_MERCADORIA = {
  "0": "0 — Nacional",
  "1": "1 — Estrangeira, importação direta",
  "2": "2 — Estrangeira, adquirida no mercado interno",
  "3": "3 — Nacional, com mais de 40% e até 70% de conteúdo importado",
  "4": "4 — Nacional, com processo produtivo básico",
  "5": "5 — Nacional, com até 40% de conteúdo importado",
  "6": "6 — Estrangeira, importação direta, sem similar nacional (CAMEX)",
  "7": "7 — Estrangeira, mercado interno, sem similar nacional (CAMEX)",
  "8": "8 — Nacional, com mais de 70% de conteúdo importado",
};

/**
 * O `tPag` da NF-e -- a forma de pagamento como a nota a declara.
 *
 * Nao e derivado da especie do meio de pagamento, e por isso e campo proprio: de "cartao" nao se
 * sabe se e credito (03) ou debito (04), e escolher em silencio daria nota AUTORIZADA com a forma
 * errada -- que nao falha, nao avisa, e so aparece na conferencia fiscal meses depois.
 */
export const FORMA_DE_PAGAMENTO_NA_NOTA = {
  "01": "01 — Dinheiro",
  "02": "02 — Cheque",
  "03": "03 — Cartão de crédito",
  "04": "04 — Cartão de débito",
  "05": "05 — Crédito da loja",
  "10": "10 — Vale alimentação",
  "11": "11 — Vale refeição",
  "12": "12 — Vale presente",
  "13": "13 — Vale combustível",
  "15": "15 — Boleto bancário",
  "16": "16 — Depósito bancário",
  "17": "17 — PIX dinâmico",
  "18": "18 — Transferência bancária",
  "19": "19 — Programa de fidelidade",
  "20": "20 — PIX estático",
  "90": "90 — Sem pagamento",
  "99": "99 — Outros",
};

/** Se a operacao e de saida (venda, remessa) ou de entrada (compra, devolucao). */
export const SENTIDO_DA_OPERACAO = {
  SAIDA: "Saída",
  ENTRADA: "Entrada",
};

/**
 * A relacao entre a UF de quem emite e a de quem recebe.
 *
 * Nao se digita: e derivada das duas UFs. Aqui ela aparece porque a REGRA e cadastrada por
 * relacao -- "quando for interestadual, o CFOP e este".
 */
export const RELACAO_DE_UF = {
  INTERNA: "Dentro do estado",
  INTERESTADUAL: "Para outro estado",
  EXTERIOR: "Exterior",
};

/** O regime tributario a que a regra se aplica. Em branco, vale para qualquer um. */
export const REGIME_TRIBUTARIO = {
  SIMPLES: "Simples Nacional",
  SIMPLES_EXCEDENTE: "Simples, acima do sublimite",
  NORMAL: "Regime normal",
  MEI: "MEI",
};

/**
 * Como o ICMS e tratado na linha da nota.
 *
 * REGULAR_TAXED e o unico que exige aliquota -- e ela nao tem padrao de proposito: errada, gera
 * nota autorizada com imposto errado.
 */
export const PERFIL_TRIBUTARIO = {
  SIMPLES_NO_CREDIT: "Simples, sem crédito de ICMS",
  REGULAR_TAXED: "Tributado normalmente",
  EXPORT: "Exportação",
};

/** Qual documento fiscal a fatura vira. */
export const MODELO_FISCAL = {
  NFE: "NF-e (modelo 55)",
  NFCE: "NFC-e (modelo 65)",
};

export const OPCOES_ESFERA_PUBLICA = opcoes(ESFERA_PUBLICA);
export const OPCOES_ORIGEM_DA_MERCADORIA = opcoes(ORIGEM_DA_MERCADORIA);
export const OPCOES_FORMA_DE_PAGAMENTO_NA_NOTA = opcoes(FORMA_DE_PAGAMENTO_NA_NOTA);
export const OPCOES_SENTIDO_DA_OPERACAO = opcoes(SENTIDO_DA_OPERACAO);
export const OPCOES_RELACAO_DE_UF = opcoes(RELACAO_DE_UF);
export const OPCOES_REGIME_TRIBUTARIO = opcoes(REGIME_TRIBUTARIO);
export const OPCOES_PERFIL_TRIBUTARIO = opcoes(PERFIL_TRIBUTARIO);
export const OPCOES_MODELO_FISCAL = opcoes(MODELO_FISCAL);
export const OPCOES_BASE_DO_VENCIMENTO = opcoes(BASE_DO_VENCIMENTO);
export const OPCOES_TIPO_DE_PAGAMENTO = opcoes(TIPO_DE_PAGAMENTO);
export const OPCOES_ESPECIE_DE_PARTE = opcoes(ESPECIE_DE_PARTE);
export const OPCOES_SOMA_OU_SUBTRAI = opcoes(SOMA_OU_SUBTRAI);
export const OPCOES_ESPECIE_DE_REFERENCIA = opcoes(ESPECIE_DE_REFERENCIA);
export const OPCOES_ESPECIE_DE_MEIO_DE_PAGAMENTO = opcoes(ESPECIE_DE_MEIO_DE_PAGAMENTO);

export const PERFIL_DE_ACESSO = {
  TENANT_ADMIN: "Administrador",
  CONTADOR: "Contador",
  FINANCEIRO: "Financeiro",
  COMERCIAL: "Comercial",
  OPERADOR: "Operador",
};

export const SITUACAO_DO_USUARIO = {
  ACTIVE: "Ativo",
  INVITED: "Convite enviado",
  DISABLED: "Desativado",
};

export const OPCOES_PERFIL_DE_ACESSO = opcoes(PERFIL_DE_ACESSO);

export function rotuloDe(mapa: Record<string, string>, valor: unknown): string {
  const chave = String(valor ?? "");
  return mapa[chave] ?? chave;
}
