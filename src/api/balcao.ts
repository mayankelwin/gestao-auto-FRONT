import { api, mensagemDeErro } from "./client";
import type { components } from "./schema";

export type ContaBancaria = components["schemas"]["BankAccountResponseDTO"];
export type LinhaDeExtrato = components["schemas"]["BankTransactionResponseDTO"];
export type ResumoDaConciliacao = components["schemas"]["BankReconciliationSummaryDTO"];
export type Sugestao = components["schemas"]["BankMatchSuggestionDTO"];
export type ResultadoDaImportacao = components["schemas"]["BankStatementImportResultDTO"];
export type LinhaImportada = components["schemas"]["BankStatementLineRequestDTO"];
export type LancamentoDireto = components["schemas"]["BankDirectPostingRequestDTO"];
export type Conciliacao = components["schemas"]["BankReconcileRequestDTO"];

export type PerfilDeCaixa = components["schemas"]["PosProfileResponseDTO"];
export type Turno = components["schemas"]["PosShiftResponseDTO"];
export type AberturaDeTurno = components["schemas"]["PosShiftOpenRequestDTO"];
export type FechamentoDeTurno = components["schemas"]["PosShiftCloseRequestDTO"];
export type VendaDeBalcao = components["schemas"]["PosSaleRequestDTO"];
export type CupomDaVenda = components["schemas"]["PosSaleResponseDTO"];

export type Prontidao = components["schemas"]["OnboardingStatusDTO"];
export type PassoDaProntidao = components["schemas"]["OnboardingStepDTO"];

function conferir<T>(data: T | undefined, status: number | undefined, erro: unknown): T {
  if (data === undefined) throw new Error(mensagemDeErro(status, erro));
  return data;
}

export async function buscarContasBancarias(companyId: number): Promise<ContaBancaria[]> {
  const { data, error, response } = await api.GET("/bank-accounts/by-company", {
    params: { query: { companyId } },
  });

  return conferir(data, response.status, error);
}

export async function buscarExtrato(
  bankAccountId: number,
  fromDate: string,
  toDate: string,
  onlyOpen: boolean,
): Promise<LinhaDeExtrato[]> {
  const { data, error, response } = await api.GET("/bank-transactions/statement", {
    params: { query: { bankAccountId, fromDate, toDate, onlyOpen } },
  });

  return conferir(data, response.status, error);
}

export async function buscarResumoDaConciliacao(
  bankAccountId: number,
  asOfDate: string,
): Promise<ResumoDaConciliacao> {
  const { data, error, response } = await api.GET("/bank-reconciliation/summary", {
    params: { query: { bankAccountId, asOfDate } },
  });

  return conferir(data, response.status, error);
}

export async function buscarSugestoes(id: number): Promise<Sugestao[]> {
  const { data, error, response } = await api.GET(
    "/bank-reconciliation/transactions/{id}/suggestions",
    { params: { path: { id } } },
  );

  return conferir(data, response.status, error);
}

export async function importarExtrato(
  bankAccountId: number,
  lines: LinhaImportada[],
): Promise<ResultadoDaImportacao> {
  const { data, error, response } = await api.POST("/bank-transactions/import", {
    body: { bankAccountId, lines },
  });

  return conferir(data, response.status, error);
}

export async function conciliar(id: number, corpo: Conciliacao): Promise<LinhaDeExtrato> {
  const { data, error, response } = await api.POST(
    "/bank-reconciliation/transactions/{id}/reconcile",
    { params: { path: { id } }, body: corpo },
  );

  return conferir(data, response.status, error);
}

export async function desconciliar(id: number): Promise<LinhaDeExtrato> {
  const { data, error, response } = await api.POST(
    "/bank-reconciliation/transactions/{id}/unreconcile",
    { params: { path: { id } } },
  );

  return conferir(data, response.status, error);
}

export async function lancarDireto(id: number, corpo: LancamentoDireto): Promise<LinhaDeExtrato> {
  const { data, error, response } = await api.POST(
    "/bank-reconciliation/transactions/{id}/direct-posting",
    { params: { path: { id } }, body: corpo },
  );

  return conferir(data, response.status, error);
}

export async function cancelarLinha(id: number, reason: string): Promise<LinhaDeExtrato> {
  const { data, error, response } = await api.POST("/bank-transactions/{id}/cancel", {
    params: { path: { id }, query: { reason } },
  });

  return conferir(data, response.status, error);
}

export async function buscarCaixas(companyId: number): Promise<PerfilDeCaixa[]> {
  const { data, error, response } = await api.GET("/pos-profiles/by-company", {
    params: { query: { companyId } },
  });

  return conferir(data, response.status, error);
}

export async function buscarTurnoAberto(posProfileId: number): Promise<Turno | null> {
  const { data, error, response } = await api.GET("/pos/profiles/{posProfileId}/current-shift", {
    params: { path: { posProfileId } },
  });

  if (response.status === 422) return null;

  return conferir(data, response.status, error);
}

export async function abrirTurno(corpo: AberturaDeTurno): Promise<Turno> {
  const { data, error, response } = await api.POST("/pos/shifts", { body: corpo });

  return conferir(data, response.status, error);
}

export async function cancelarTurno(id: number, reason: string): Promise<Turno> {
  const { data, error, response } = await api.POST("/pos/shifts/{id}/cancel", {
    params: { path: { id }, query: { reason } },
  });

  return conferir(data, response.status, error);
}

export async function fecharTurno(id: number, corpo: FechamentoDeTurno): Promise<Turno> {
  const { data, error, response } = await api.POST("/pos/shifts/{id}/close", {
    params: { path: { id } },
    body: corpo,
  });

  return conferir(data, response.status, error);
}

export async function venderNoBalcao(
  posProfileId: number,
  corpo: VendaDeBalcao,
): Promise<CupomDaVenda> {
  const { data, error, response } = await api.POST("/pos/profiles/{posProfileId}/sales", {
    params: { path: { posProfileId } },
    body: corpo,
  });

  return conferir(data, response.status, error);
}

export interface PrecoDaLista {
  rate: number | null;
  matchedBy: string;
}

export async function resolverPreco(
  priceListId: number,
  itemId: number,
  partyId?: number | null,
): Promise<PrecoDaLista> {
  const { data, error, response } = await api.GET("/item-prices/resolve", {
    params: {
      query: partyId
        ? { priceListId, itemId, partyType: "CUSTOMER" as const, partyId }
        : { priceListId, itemId },
    },
  });

  if (response.status === 404) throw new Error("A lista de preços do caixa não foi encontrada.");
  if (response.status === 422) throw new Error("A lista de preços do caixa está desativada.");
  if (!response.ok) throw new Error(mensagemDeErro(response.status, error));

  const rate = data?.rate;

  return {
    rate: rate === undefined || rate === null ? null : Number(rate),
    matchedBy: data?.matchedBy ?? "",
  };
}

export async function buscarProntidao(companyId: number): Promise<Prontidao> {
  const { data, error, response } = await api.GET("/onboarding", {
    params: { query: { companyId } },
  });

  return conferir(data, response.status, error);
}
