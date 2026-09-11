import { api, mensagemDeErro } from "./client";
import type { components } from "./schema";

export type LinhaDeRelatorio = components["schemas"]["FinancialStatementRowDTO"];
export type Balanco = components["schemas"]["BalanceSheetDTO"];
export type Dre = components["schemas"]["IncomeStatementDTO"];
export type Razao = components["schemas"]["GeneralLedgerDTO"];
export type LinhaDoRazao = components["schemas"]["GeneralLedgerRowDTO"];
export type ParceiroEmAberto = components["schemas"]["AgingPartyDTO"];
export type ParcelaEmAberto = components["schemas"]["AgingInstallmentDTO"];
export type NoDoPlano = components["schemas"]["AccountTreeNodeDTO"];

export async function buscarBalanco(companyId: number, asOf: string): Promise<Balanco> {
  const { data, error, response } = await api.GET("/financial-statements/balance-sheet", {
    params: { query: { companyId, asOf } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}

export async function buscarDre(
  companyId: number,
  fromDate: string,
  toDate: string,
): Promise<Dre> {
  const { data, error, response } = await api.GET("/financial-statements/income-statement", {
    params: { query: { companyId, fromDate, toDate } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}

export async function buscarRazao(
  companyId: number,
  accountId: number,
  fromDate: string,
  toDate: string,
): Promise<Razao> {
  const { data, error, response } = await api.GET("/financial-statements/general-ledger", {
    params: { query: { companyId, accountId, fromDate, toDate } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}

export async function buscarAReceber(
  companyId: number,
  asOf: string,
): Promise<ParceiroEmAberto[]> {
  const { data, error, response } = await api.GET("/aging/receivable", {
    params: { query: { companyId, asOf } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}

export async function buscarAPagar(companyId: number, asOf: string): Promise<ParceiroEmAberto[]> {
  const { data, error, response } = await api.GET("/aging/payable", {
    params: { query: { companyId, asOf } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}

export type LinhaDoBalancete = components["schemas"]["TrialBalanceRowDTO"];
export type SaldoDeConta = components["schemas"]["AccountBalanceDTO"];
export type ConferenciaDeSaldo = components["schemas"]["BinAuditDTO"];

export async function buscarBalancete(
  companyId: number,
  fromDate: string,
  toDate: string,
): Promise<LinhaDoBalancete[]> {
  const { data, error, response } = await api.GET("/ledger/trial-balance", {
    params: { query: { companyId, fromDate, toDate } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}

export async function buscarSaldoDaConta(
  companyId: number,
  accountId: number,
  asOfDate: string,
  includeDescendants: boolean,
): Promise<SaldoDeConta> {
  const { data, error, response } = await api.GET("/ledger/balance", {
    params: { query: { companyId, accountId, asOfDate, includeDescendants } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}

export async function conferirSaldo(
  companyId: number,
  itemId: number,
  warehouseId: number,
): Promise<ConferenciaDeSaldo> {
  const { data, error, response } = await api.GET("/stock/bin-audit", {
    params: { query: { companyId, itemId, warehouseId } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}

export async function buscarPlanoDeContas(companyId: number): Promise<NoDoPlano[]> {
  const { data, error, response } = await api.GET("/accounts/chart", {
    params: { query: { companyId } },
  });

  if (!data) throw new Error(mensagemDeErro(response.status, error));

  return data;
}
