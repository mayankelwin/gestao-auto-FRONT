import { BookUp, PackageOpen, RefreshCw, Scale, Undo2, Upload } from "lucide-vue-next";
import AuditoriaDeSaldo from "@/components/form/AuditoriaDeSaldo.vue";
import { OPCOES_ESPECIE_DE_PARTE, opcoesDe } from "@/lib/opcoes";
import {
  refCentroDeCusto,
  refContaAnalitica,
  refDepositoAnalitico,
  refEmpresa,
  refItem,
  refUnidade,
} from "@/lib/referencias";
import { hoje } from "@/lib/formato";
import type { CampoDeFormulario } from "@/lib/formulario";
import type { AcaoDeTela, Recurso } from "./tipos";

const empresa: CampoDeFormulario = {
  campo: "companyId",
  label: "Empresa",
  tipo: "referencia",
  obrigatorio: true,
  referencia: refEmpresa,
};

const documentoDeOrigem: CampoDeFormulario[] = [
  {
    campo: "voucherType",
    label: "Espécie do documento",
    tipo: "texto",
    obrigatorio: true,
    placeholder: "SALES_INVOICE",
    ajuda: "A API exige o par espécie + identificador do documento que originou o lançamento.",
  },
  { campo: "voucherId", label: "Identificador do documento", tipo: "inteiro", obrigatorio: true },
  { campo: "voucherNumber", label: "Número do documento", tipo: "texto" },
];

const OPCOES_MOVIMENTO = opcoesDe({
  RECEIPT: "Entrada",
  ISSUE: "Saída",
  TRANSFER: "Transferência",
  OPENING: "Saldo inicial",
  REVALUATION: "Reavaliação",
});

export const leitura: Recurso[] = [
  {
    rota: "/saldos",
    endpoint: "/stock/balances",
    exigeEmpresa: true,
    temBusca: false,
    papeisEscrita: [],
    painel: {
      rotulo: "Conferir contra o razão",
      icone: Scale,
      abas: [{ titulo: "Conferência", componente: AuditoriaDeSaldo }],
    },
    colunas: [
      { campo: "itemCode", label: "Item", formato: "codigo" },
      { campo: "itemName", label: "Descrição" },
      { campo: "warehouseName", label: "Depósito" },
      { campo: "actualQty", label: "Quantidade", formato: "numero" },
      { campo: "valuationRate", label: "Custo médio", formato: "dinheiro" },
      { campo: "stockValue", label: "Valor", formato: "dinheiro" },
    ],
    acoesDeTela: [
      {
        chave: "bin-rebuild",
        rotulo: "Refazer saldo",
        titulo: "Refazer o saldo a partir do razão",
        icone: RefreshCw,
        papeis: ["TENANT_ADMIN"],
        endpoint: "/stock/bin-rebuild",
        porConsulta: true,
        variante: "secondary",
        sucesso: "Saldo refeito a partir do razão.",
        largura: "media",
        formulario: [
          {
            campos: [
              empresa,
              {
                campo: "itemId",
                label: "Item",
                tipo: "referencia",
                obrigatorio: true,
                referencia: refItem,
              },
              {
                campo: "warehouseId",
                label: "Depósito",
                tipo: "referencia",
                obrigatorio: true,
                referencia: refDepositoAnalitico,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rota: "/movimentos",
    endpoint: "/stock/ledger",
    exigeEmpresa: true,
    temBusca: false,
    papeisEscrita: [],
    colunas: [
      { campo: "postingDate", label: "Data", formato: "data" },
      { campo: "itemCode", label: "Item", formato: "codigo" },
      { campo: "warehouseName", label: "Depósito" },
      { campo: "batchCode", label: "Lote" },
      { campo: "actualQty", label: "Movimento", formato: "numero" },
      { campo: "qtyAfterTransaction", label: "Saldo", formato: "numero" },
      { campo: "valuationRate", label: "Custo médio", formato: "dinheiro" },
    ],
    acoesDeTela: [
      {
        chave: "movimento",
        rotulo: "Movimentar estoque",
        titulo: "Movimentação de estoque",
        icone: PackageOpen,
        papeis: ["OPERADOR"],
        endpoint: "/stock/movements",
        sucesso: "Movimento registrado.",
        largura: "cheia",
        formulario: [
          {
            campos: [
              empresa,
              { campo: "postingDate", label: "Data", tipo: "data", obrigatorio: true, padrao: hoje },
              {
                campo: "type",
                label: "Tipo",
                tipo: "opcoes",
                obrigatorio: true,
                opcoes: OPCOES_MOVIMENTO,
                padrao: "RECEIPT",
              },
              {
                campo: "counterAccountId",
                label: "Conta de contrapartida",
                tipo: "referencia",
                referencia: refContaAnalitica,
              },
              ...documentoDeOrigem,
              { campo: "remarks", label: "Observações", tipo: "textoLongo", inteira: true },
            ],
          },
        ],
        linhas: [
          {
            campo: "lines",
            titulo: "Linhas do movimento",
            rotuloNovo: "Nova linha",
            obrigatorio: true,
            colunas: [
              {
                campo: "itemId",
                label: "Item",
                tipo: "referencia",
                obrigatorio: true,
                referencia: refItem,
              },
              {
                campo: "sourceWarehouseId",
                label: "Depósito de origem",
                tipo: "referencia",
                referencia: refDepositoAnalitico,
                semPadrao: true,
              },
              {
                campo: "targetWarehouseId",
                label: "Depósito de destino",
                tipo: "referencia",
                referencia: refDepositoAnalitico,
                semPadrao: true,
              },
              { campo: "quantity", label: "Quantidade", tipo: "decimal", obrigatorio: true },
              { campo: "uomId", label: "Unidade", tipo: "referencia", referencia: refUnidade },
              { campo: "rate", label: "Custo unitário", tipo: "dinheiro" },
              {
                campo: "batchId",
                label: "Lote",
                tipo: "referencia",
                referencia: {
                  endpoint: "/tracking/items/0/batches",
                  endpointDe: (linha) =>
                    linha.itemId ? `/tracking/items/${Number(linha.itemId)}/batches` : null,
                  rotulo: (r) => String(r.code ?? r.id),
                },
              },
              { campo: "remarks", label: "Observação", tipo: "texto" },
            ],
          },
        ],
      },
      {
        chave: "estorno-de-estoque",
        rotulo: "Estornar movimento",
        titulo: "Estorno de movimento de estoque",
        icone: Undo2,
        papeis: ["OPERADOR"],
        endpoint: "/stock/reversals",
        sucesso: "Movimento estornado.",
        largura: "media",
        variante: "secondary",
        formulario: [
          {
            campos: [
              empresa,
              ...documentoDeOrigem.slice(0, 2),
              { campo: "postingDate", label: "Data do estorno", tipo: "data", padrao: hoje },
              {
                campo: "reason",
                label: "Motivo",
                tipo: "textoLongo",
                obrigatorio: true,
                inteira: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rota: "/lancamentos",
    endpoint: "/ledger/entries",
    exigeEmpresa: true,
    temBusca: false,
    papeisEscrita: [],
    colunas: [
      { campo: "postingDate", label: "Data", formato: "data" },
      { campo: "accountNumber", label: "Conta", formato: "codigo" },
      { campo: "accountName", label: "Descrição" },
      { campo: "debit", label: "Débito", formato: "dinheiro" },
      { campo: "credit", label: "Crédito", formato: "dinheiro" },
    ],
    acoesDeTela: [
      {
        chave: "lancamento",
        rotulo: "Novo lançamento",
        titulo: "Lançamento no razão",
        icone: BookUp,
        papeis: ["CONTADOR"],
        endpoint: "/ledger/entries",
        sucesso: "Lançamento registrado.",
        largura: "cheia",
        formulario: [
          {
            campos: [
              empresa,
              { campo: "postingDate", label: "Data", tipo: "data", obrigatorio: true, padrao: hoje },
              ...documentoDeOrigem,
              {
                campo: "opening",
                label: "É lançamento de abertura",
                tipo: "booleano",
                ajuda: "Entra no saldo de abertura do razão, qualquer que seja a data.",
              },
              { campo: "remarks", label: "Histórico", tipo: "textoLongo", inteira: true },
            ],
          },
        ],
        linhas: [
          {
            campo: "lines",
            titulo: "Partidas",
            rotuloNovo: "Nova partida",
            obrigatorio: true,
            colunas: [
              {
                campo: "accountId",
                label: "Conta",
                tipo: "referencia",
                obrigatorio: true,
                referencia: refContaAnalitica,
              },
              { campo: "debit", label: "Débito", tipo: "dinheiro" },
              { campo: "credit", label: "Crédito", tipo: "dinheiro" },
              {
                campo: "costCenterId",
                label: "Centro de custo",
                tipo: "referencia",
                referencia: refCentroDeCusto,
              },
              {
                campo: "partyType",
                label: "Espécie do parceiro",
                tipo: "opcoes",
                opcoes: OPCOES_ESPECIE_DE_PARTE,
              },
              {
                campo: "partyId",
                label: "Parceiro",
                tipo: "referencia",
                referencia: {
                  endpoint: "/customers",
                  busca: true,
                  rotulo: (r) => String(r.name),
                  endpointDe: (linha) =>
                    linha.partyType === "SUPPLIER" ? "/suppliers" : "/customers",
                },
              },
              { campo: "remarks", label: "Histórico", tipo: "texto" },
            ],
          },
        ],
      },
      {
        chave: "estorno",
        rotulo: "Estornar documento",
        titulo: "Estorno contábil",
        icone: Undo2,
        papeis: ["CONTADOR"],
        endpoint: "/ledger/reversals",
        sucesso: "Documento estornado.",
        largura: "media",
        variante: "secondary",
        formulario: [
          {
            campos: [
              empresa,
              ...documentoDeOrigem.slice(0, 2),
              { campo: "postingDate", label: "Data do estorno", tipo: "data", padrao: hoje },
              {
                campo: "reason",
                label: "Motivo",
                tipo: "textoLongo",
                obrigatorio: true,
                inteira: true,
              },
            ],
          },
        ],
      },
    ],
  },
];

export const importarPlanoDeContas: AcaoDeTela = {
  chave: "importar-plano",
  rotulo: "Importar plano",
  titulo: "Importar plano de contas de um modelo",
  icone: Upload,
  papeis: ["CONTADOR"],
  endpoint: "/chart-of-accounts/import",
  porConsulta: true,
  variante: "secondary",
  sucesso: "Plano de contas importado.",
  largura: "media",
  formulario: [
    {
      campos: [
        empresa,
        {
          campo: "templateCode",
          label: "Modelo",
          tipo: "opcoes",
          obrigatorio: true,
          opcoes: [],
          ajuda: "O modelo cria a árvore inteira de contas da empresa de uma vez.",
        },
      ],
    },
  ],
  opcoesDinamicas: [
    {
      campo: "templateCode",
      endpoint: "/chart-of-accounts/templates",
      valor: (r) => String(r.code),
      rotulo: (r) => `${r.name} (${r.accountCount} contas)`,
    },
  ],
};
