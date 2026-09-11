export interface RestricaoDoContrato {
  min?: number;
  max?: number;
  padrao?: RegExp;
  mensagem?: string;
}

const NAO_NEGATIVO: RestricaoDoContrato = { min: 0 };

export const DECLARADAS_PELA_API: Record<string, RestricaoDoContrato> = {
  allocatedAmount: NAO_NEGATIVO,
  amount: NAO_NEGATIVO,
  baseAmount: NAO_NEGATIVO,
  countedQty: NAO_NEGATIVO,
  countedRate: NAO_NEGATIVO,
  creditDays: NAO_NEGATIVO,
  creditLimit: NAO_NEGATIVO,
  creditMonths: NAO_NEGATIVO,
  deposit: NAO_NEGATIVO,
  exchangeRate: NAO_NEGATIVO,
  factor: NAO_NEGATIVO,
  fractionUnits: NAO_NEGATIVO,
  paidAmount: NAO_NEGATIVO,
  paymentTermsDays: NAO_NEGATIVO,
  quantity: NAO_NEGATIVO,
  rate: NAO_NEGATIVO,
  startFrom: NAO_NEGATIVO,
  weightPerUnit: NAO_NEGATIVO,
  withdrawal: NAO_NEGATIVO,
  writeOffLimit: NAO_NEGATIVO,

  padding: { min: 1, max: 12 },
  portion: { min: 0, max: 100 },
  taxRate: { min: 0, max: 100 },
  shelfLifeDays: { min: 1 },

  gtin: {
    padrao: /^(\d{8}|\d{12,14})$/,
    mensagem: "O GTIN tem 8, 12, 13 ou 14 dígitos.",
  },
  ibgeCityCode: {
    padrao: /^\d{7}$/,
    mensagem: "O código IBGE tem 7 dígitos.",
  },
  prefix: {
    padrao: /^[A-Za-z0-9]+$/,
    mensagem: "Use apenas letras e números, sem espaço.",
  },
};

export const DO_DOMINIO: Record<string, RestricaoDoContrato> = {
  credit: NAO_NEGATIVO,
  debit: NAO_NEGATIVO,
  sortOrder: NAO_NEGATIVO,
  scheduleNumber: { min: 1 },
  voucherId: { min: 1 },
};

export function restricaoDe(campo: string): RestricaoDoContrato | undefined {
  return DECLARADAS_PELA_API[campo] ?? DO_DOMINIO[campo];
}
