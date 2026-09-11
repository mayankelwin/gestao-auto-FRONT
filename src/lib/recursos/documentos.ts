import type { Component } from "vue";
import { Ban, Check, FileCheck, PackagePlus, ReceiptText } from "lucide-vue-next";
import type { TenantRole } from "@/lib/navigation";
import type { CampoDeFormulario, LinhasDeFormulario, Valores } from "@/lib/formulario";
import {
  OPCOES_ESPECIE_DE_PARTE,
  OPCOES_ESPECIE_DE_REFERENCIA,
  OPCOES_SOMA_OU_SUBTRAI,
  OPCOES_MODELO_FISCAL,
  OPCOES_TIPO_DE_PAGAMENTO,
} from "@/lib/opcoes";
import {
  refCentroDeCusto,
  refCliente,
  refCondicaoDePagamento,
  refContaAnalitica,
  refDeposito,
  refDepositoAnalitico,
  refEmpresa,
  refFornecedor,
  refItem,
  refListaDeVenda,
  refMeioDePagamento,
  refMoeda,
  refUnidade,
  refNaturezaDaOperacao,
} from "@/lib/referencias";
import { hoje } from "@/lib/formato";
import {
  emRascunho,
  estadoFiscal,
  lancado,
  situacaoDoDocumento,
  type AcaoDeRecurso,
  type Recurso,
} from "./tipos";

const empresa: CampoDeFormulario = {
  campo: "companyId",
  label: "Empresa",
  tipo: "referencia",
  obrigatorio: true,
  referencia: refEmpresa,
};

const numero: CampoDeFormulario = {
  campo: "number",
  label: "Número",
  tipo: "texto",
  ajuda: "Gerado pela série.",
  geradoPeloSistema: true,
};

const observacoes: CampoDeFormulario = {
  campo: "remarks",
  label: "Observações",
  tipo: "textoLongo",
  inteira: true,
};

const moeda: CampoDeFormulario[] = [
  { campo: "currencyId", label: "Moeda", tipo: "referencia", referencia: refMoeda },
  { campo: "exchangeRate", label: "Câmbio", tipo: "decimal" },
];

const centroDeCusto: CampoDeFormulario = {
  campo: "costCenterId",
  label: "Centro de custo",
  tipo: "referencia",
  referencia: refCentroDeCusto,
};

function acoesDeDocumento(papeis: TenantRole[], nome: string): AcaoDeRecurso[] {
  return [
    {
      chave: "submit",
      rotulo: "Lançar",
      icone: Check,
      confirmacao: `Lançar ${nome} gera os movimentos definitivos. Depois disso, só cancelando.`,
      sucesso: "Documento lançado.",
      papeis,
      disponivel: emRascunho,
      motivo: "Só rascunho pode ser lançado.",
    },
    {
      chave: "cancel",
      rotulo: "Cancelar documento",
      icone: Ban,
      perigo: true,
      confirmacao: `Cancelar ${nome} estorna os movimentos que o lançamento gerou.`,
      sucesso: "Documento cancelado.",
      papeis,
      disponivel: lancado,
      motivo: "Só documento lançado pode ser cancelado.",
    },
  ];
}

/** O endpoint que monta o rascunho de cada destino. */
const ENDPOINT_DE_PREPARACAO: Record<string, string> = {
  "/recebimentos": "/purchase-receipts",
  "/faturas-de-compra": "/purchase-invoices",
  "/entregas": "/delivery-notes",
  "/faturas-de-venda": "/sales-invoices",
};

/**
 * Gerar o documento seguinte a partir deste.
 *
 * A rota devolve o corpo montado — quantidade pendente e linha de origem já apontadas — e a tela
 * abre o formulário de criação do destino preenchido. Nada é gravado até quem confere mandar de
 * volta: a carga que chega raramente é a que foi pedida, e foi por isso que a `§48` recusou gravar
 * o rascunho do lado da API.
 *
 * Vale nos dois módulos. O que muda entre eles é só o nome do parâmetro de origem, porque em
 * compras a carga chega por recebimento e em vendas ela sai por entrega (`§59`).
 */
function gerarSeguinte(
  parametro: "fromOrders" | "fromReceipts" | "fromDeliveries",
  rotulo: string,
  icone: Component,
  rota: string,
  papeis: TenantRole[],
): AcaoDeRecurso {
  const destino = ENDPOINT_DE_PREPARACAO[rota];

  return {
    chave: `${parametro}-para-${rota.slice(1)}`,
    rotulo,
    icone,
    confirmacao: "",
    sucesso: "",
    papeis,
    disponivel: lancado,
    motivo: "Só documento lançado gera o seguinte.",
    prepara: {
      origem: (r) => `${destino}/prepare?${parametro}=${Number(r.id)}`,
      rota,
    },
  };
}

const colunaSituacao = {
  campo: "status",
  label: "Situação",
  formato: "situacao" as const,
  situacao: situacaoDoDocumento,
};

const totalDaLinha = (linha: Valores): number =>
  Number(linha.quantity ?? 0) * Number(linha.rate ?? 0);

const refLote = {
  endpoint: "/tracking/items/0/batches",
  endpointDe: (linha: Valores) =>
    linha.itemId ? `/tracking/items/${Number(linha.itemId)}/batches` : null,
  rotulo: (r: Record<string, unknown>) => String(r.code ?? r.id),
};

function linhasDeItens(opcoes: {
  comPreco: boolean;
  precoObrigatorio?: boolean;
  precoDaLista?: boolean;
  comDeposito?: boolean;
  comLote?: boolean;
}): LinhasDeFormulario {
  const colunas: CampoDeFormulario[] = [
    { campo: "itemId", label: "Item", tipo: "referencia", obrigatorio: true, referencia: refItem },
    { campo: "description", label: "Descrição", tipo: "texto" },
    { campo: "quantity", label: "Quantidade", tipo: "decimal", obrigatorio: true, padrao: 1 },
    { campo: "uomId", label: "Unidade", tipo: "referencia", referencia: refUnidade },
  ];

  if (opcoes.comPreco) {
    colunas.push({
      campo: "rate",
      label: "Preço unitário",
      tipo: "dinheiro",
      obrigatorio: opcoes.precoObrigatorio,
      placeholder: opcoes.precoDaLista ? "Da lista" : undefined,
    });
  }

  if (opcoes.comDeposito) {
    colunas.push({
      campo: "warehouseId",
      label: "Depósito",
      tipo: "referencia",
      referencia: refDepositoAnalitico,
    });
  }

  if (opcoes.comLote) {
    colunas.push({ campo: "batchId", label: "Lote", tipo: "referencia", referencia: refLote });
  }

  return {
    campo: "items",
    titulo: "Itens",
    rotuloNovo: "Nova linha",
    obrigatorio: true,
    colunas,
    total: opcoes.comPreco ? totalDaLinha : undefined,
    rotuloTotal: "Total dos itens",
  };
}

const linhasDeImpostos: LinhasDeFormulario = {
  campo: "taxes",
  titulo: "Impostos e encargos",
  rotuloNovo: "Nova linha",
  colunas: [
    {
      campo: "accountId",
      label: "Conta",
      tipo: "referencia",
      obrigatorio: true,
      referencia: refContaAnalitica,
    },
    { campo: "description", label: "Descrição", tipo: "texto", obrigatorio: true },
    {
      campo: "addDeduct",
      label: "Soma ou subtrai",
      tipo: "opcoes",
      opcoes: OPCOES_SOMA_OU_SUBTRAI,
      padrao: "ADD",
    },
    { campo: "rate", label: "Alíquota (%)", tipo: "decimal" },
    { campo: "baseAmount", label: "Base", tipo: "dinheiro" },
    { campo: "amount", label: "Valor", tipo: "dinheiro", obrigatorio: true },
    {
      campo: "includeInValuation",
      label: "Entra no custo",
      tipo: "booleano",
    },
  ],
  total: (linha) => Number(linha.amount ?? 0),
  rotuloTotal: "Total de impostos",
};

const devolucao = (endpoint: string): CampoDeFormulario[] => [
  { campo: "isReturn", label: "É devolução", tipo: "booleano" },
  {
    campo: "returnAgainstId",
    label: "Devolução de",
    tipo: "referencia",
    visivel: (v) => Boolean(v.isReturn),
    referencia: {
      endpoint,
      rotulo: (r) => String(r.number ?? r.id),
      filtro: (r) => r.status === "SUBMITTED" && !r.isReturn,
    },
    inteira: true,
  },
];

export const documentos: Recurso[] = [
  {
    rota: "/pedidos-de-venda",
    endpoint: "/sales-orders",
    temBusca: false,
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo pedido",
    singular: "pedido de venda",
    larguraDoFormulario: "cheia",
    carregarAntesDeEditar: true,
    podeEditar: emRascunho,
    podeExcluir: emRascunho,
    acoes: [
      ...acoesDeDocumento(["COMERCIAL"], "o pedido"),
      gerarSeguinte("fromOrders", "Gerar entrega", PackagePlus, "/entregas", [
        "COMERCIAL",
        "OPERADOR",
      ]),
      gerarSeguinte("fromOrders", "Gerar nota", ReceiptText, "/faturas-de-venda", [
        "COMERCIAL",
        "FINANCEIRO",
      ]),
    ],
    colunas: [
      { campo: "number", label: "Número", formato: "codigo" },
      { campo: "customerName", label: "Cliente" },
      { campo: "transactionDate", label: "Data", formato: "data" },
      { campo: "netTotal", label: "Total", formato: "dinheiro" },
      colunaSituacao,
    ],
    formulario: [
      {
        campos: [
          empresa,
          numero,
          {
            campo: "customerId",
            label: "Cliente",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refCliente,
          },
          { campo: "customerOrderNumber", label: "Pedido do cliente", tipo: "texto" },
          {
            campo: "transactionDate",
            label: "Data",
            tipo: "data",
            obrigatorio: true,
            padrao: hoje,
          },
          { campo: "deliveryDate", label: "Entrega prevista", tipo: "data" },
          {
            campo: "setWarehouseId",
            label: "Depósito de origem",
            tipo: "referencia",
            referencia: refDeposito,
          },
          centroDeCusto,
          ...moeda,
          observacoes,
        ],
      },
    ],
    linhas: [linhasDeItens({ comPreco: true, precoObrigatorio: true, comDeposito: true })],
  },
  {
    rota: "/entregas",
    endpoint: "/delivery-notes",
    temBusca: false,
    papeisEscrita: ["OPERADOR"],
    rotuloNovo: "Nova entrega",
    singular: "entrega",
    larguraDoFormulario: "cheia",
    carregarAntesDeEditar: true,
    podeEditar: emRascunho,
    podeExcluir: emRascunho,
    acoes: [
      ...acoesDeDocumento(["OPERADOR"], "a entrega"),
      gerarSeguinte("fromDeliveries", "Gerar nota", ReceiptText, "/faturas-de-venda", [
        "OPERADOR",
        "FINANCEIRO",
      ]),
    ],
    colunas: [
      { campo: "number", label: "Número", formato: "codigo" },
      { campo: "customerName", label: "Cliente" },
      { campo: "postingDate", label: "Data", formato: "data" },
      colunaSituacao,
    ],
    formulario: [
      {
        campos: [
          empresa,
          numero,
          {
            campo: "customerId",
            label: "Cliente",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refCliente,
          },
          { campo: "postingDate", label: "Data", tipo: "data", obrigatorio: true, padrao: hoje },
          {
            campo: "setWarehouseId",
            label: "Depósito de saída",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refDepositoAnalitico,
          },
          centroDeCusto,
        ],
      },
      {
        titulo: "Transporte",
        campos: [
          { campo: "vehiclePlate", label: "Placa do veículo", tipo: "placa" },
          { campo: "driverName", label: "Motorista", tipo: "texto" },
        ],
      },
      { titulo: "Devolução", campos: [...devolucao("/delivery-notes"), observacoes] },
    ],
    linhas: [linhasDeItens({ comPreco: true, comDeposito: true, comLote: true })],
  },
  {
    rota: "/faturas-de-venda",
    endpoint: "/sales-invoices",
    temBusca: false,
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Nova fatura",
    singular: "fatura de venda",
    larguraDoFormulario: "cheia",
    carregarAntesDeEditar: true,
    podeEditar: emRascunho,
    podeExcluir: emRascunho,
    acoes: [
      ...acoesDeDocumento(["COMERCIAL"], "a fatura"),
      {
        chave: "issue",
        rotulo: "Emitir nota",
        titulo: "Emitir a nota desta fatura",
        icone: FileCheck,
        papeis: ["COMERCIAL"],
        confirmacao: "",
        sucesso: "Pedido de emissão enviado. Acompanhe pelo estado fiscal.",
        disponivel: (r) => r.status === "SUBMITTED" && r.fiscalStatus !== "AUTORIZADA",
        motivo: "Só fatura lançada e sem nota autorizada pode emitir.",
        formulario: [
          {
            campos: [
              {
                campo: "model",
                label: "Modelo",
                tipo: "opcoes",
                obrigatorio: true,
                opcoes: OPCOES_MODELO_FISCAL,
                padrao: "NFE",
                inteira: true,
                ajuda:
                  "A mesma venda pode virar uma ou outra: quem compra no balcão e depois pede" +
                  " nota com CNPJ leva NF-e sobre a mesma fatura.",
              },
              {
                campo: "paymentMethodId",
                label: "Forma de pagamento a declarar",
                tipo: "referencia",
                referencia: refMeioDePagamento,
                inteira: true,
                ajuda:
                  "Só quando a fatura ainda não tem baixa. Havendo pagamento, a nota declara o" +
                  " que de fato pagou e este campo é ignorado.",
              },
            ],
          },
        ],
      },
    ],
    colunas: [
      { campo: "number", label: "Número", formato: "codigo" },
      { campo: "customerName", label: "Cliente" },
      { campo: "postingDate", label: "Data", formato: "data" },
      { campo: "grandTotal", label: "Total", formato: "dinheiro" },
      colunaSituacao,
      { campo: "fiscalStatus", label: "Nota", formato: "situacao", situacao: estadoFiscal },
    ],
    formulario: [
      {
        campos: [
          empresa,
          numero,
          {
            campo: "customerId",
            label: "Cliente",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refCliente,
          },
          { campo: "postingDate", label: "Data", tipo: "data", obrigatorio: true, padrao: hoje },
          { campo: "dueDate", label: "Vencimento", tipo: "data" },
          {
            campo: "paymentTermId",
            label: "Condição de pagamento",
            tipo: "referencia",
            referencia: refCondicaoDePagamento,
          },
          {
            campo: "priceListId",
            label: "Lista de preços",
            tipo: "referencia",
            referencia: refListaDeVenda,
            ajuda: "A linha que ficar sem preço busca aqui. A lista tem de ser da moeda da fatura.",
          },
          ...moeda,
          centroDeCusto,
          {
            campo: "operationNatureId",
            label: "Natureza da operação",
            tipo: "referencia",
            referencia: refNaturezaDaOperacao,
            ajuda:
              "De onde saem CFOP, perfil e alíquota da nota. Pode ficar em branco: nem toda" +
              " fatura vira nota, e quem cobra é a emissão.",
          },
        ],
      },
      {
        titulo: "Estoque",
        campos: [
          {
            campo: "updateStock",
            label: "Baixa estoque nesta fatura",
            tipo: "booleano",
            ajuda: "Marque quando não houver entrega separada.",
          },
          {
            campo: "setWarehouseId",
            label: "Depósito",
            tipo: "referencia",
            referencia: refDepositoAnalitico,
            visivel: (v) => Boolean(v.updateStock),
          },
        ],
      },
      { titulo: "Devolução", campos: [...devolucao("/sales-invoices"), observacoes] },
    ],
    linhas: [
      linhasDeItens({ comPreco: true, precoDaLista: true, comDeposito: true, comLote: true }),
      linhasDeImpostos,
    ],
  },
  {
    rota: "/pedidos-de-compra",
    endpoint: "/purchase-orders",
    temBusca: false,
    acoesEmIcones: true,
    ordenacao: "id,desc",
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo pedido",
    singular: "pedido de compra",
    larguraDoFormulario: "cheia",
    carregarAntesDeEditar: true,
    podeEditar: emRascunho,
    podeExcluir: emRascunho,
    acoes: [
      ...acoesDeDocumento(["COMERCIAL"], "o pedido"),
      gerarSeguinte("fromOrders", "Gerar recebimento", PackagePlus, "/recebimentos", [
        "COMERCIAL",
        "OPERADOR",
      ]),
      gerarSeguinte("fromOrders", "Gerar nota", ReceiptText, "/faturas-de-compra", [
        "COMERCIAL",
        "FINANCEIRO",
      ]),
    ],
    colunas: [
      { campo: "number", label: "Número", formato: "codigo" },
      { campo: "supplierName", label: "Fornecedor" },
      { campo: "submittedAt", label: "Lançado em", formato: "dataHora" },
      { campo: "netTotal", label: "Total", formato: "dinheiro" },
      colunaSituacao,
    ],
    formulario: [
      {
        campos: [
          empresa,
          numero,
          {
            campo: "supplierId",
            label: "Fornecedor",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refFornecedor,
          },
          { campo: "supplierQuotationNumber", label: "Cotação do fornecedor", tipo: "texto" },
          {
            campo: "transactionDate",
            label: "Data",
            tipo: "data",
            obrigatorio: true,
            padrao: hoje,
          },
          { campo: "scheduleDate", label: "Entrega prevista", tipo: "data" },
          {
            campo: "setWarehouseId",
            label: "Depósito de destino",
            tipo: "referencia",
            referencia: refDeposito,
          },
          centroDeCusto,
          ...moeda,
          observacoes,
        ],
      },
    ],
    linhas: [linhasDeItens({ comPreco: true, precoObrigatorio: true, comDeposito: true })],
  },
  {
    rota: "/recebimentos",
    endpoint: "/purchase-receipts",
    temBusca: false,
    acoesEmIcones: true,
    ordenacao: "id,desc",
    papeisEscrita: ["OPERADOR"],
    rotuloNovo: "Novo recebimento",
    singular: "recebimento",
    larguraDoFormulario: "cheia",
    carregarAntesDeEditar: true,
    podeEditar: emRascunho,
    podeExcluir: emRascunho,
    acoes: [
      ...acoesDeDocumento(["OPERADOR"], "o recebimento"),
      gerarSeguinte("fromReceipts", "Gerar nota", ReceiptText, "/faturas-de-compra", [
        "OPERADOR",
        "FINANCEIRO",
      ]),
    ],
    colunas: [
      { campo: "number", label: "Número", formato: "codigo" },
      { campo: "supplierName", label: "Fornecedor" },
      { campo: "submittedAt", label: "Lançado em", formato: "dataHora" },
      colunaSituacao,
    ],
    formulario: [
      {
        campos: [
          empresa,
          numero,
          {
            campo: "supplierId",
            label: "Fornecedor",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refFornecedor,
          },
          { campo: "supplierDeliveryNumber", label: "Nota do fornecedor", tipo: "texto" },
          { campo: "postingDate", label: "Data", tipo: "data", obrigatorio: true, padrao: hoje },
          {
            campo: "setWarehouseId",
            label: "Depósito de entrada",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refDepositoAnalitico,
          },
          centroDeCusto,
        ],
      },
      {
        titulo: "Transporte",
        campos: [
          { campo: "vehiclePlate", label: "Placa do veículo", tipo: "placa" },
          { campo: "driverName", label: "Motorista", tipo: "texto" },
        ],
      },
      { titulo: "Devolução", campos: [...devolucao("/purchase-receipts"), observacoes] },
    ],
    linhas: [linhasDeItens({ comPreco: true, comDeposito: true, comLote: true })],
  },
  {
    rota: "/faturas-de-compra",
    endpoint: "/purchase-invoices",
    temBusca: false,
    acoesEmIcones: true,
    ordenacao: "id,desc",
    papeisEscrita: ["FINANCEIRO"],
    rotuloNovo: "Nova fatura",
    singular: "fatura de compra",
    larguraDoFormulario: "cheia",
    carregarAntesDeEditar: true,
    podeEditar: emRascunho,
    podeExcluir: emRascunho,
    acoes: acoesDeDocumento(["FINANCEIRO"], "a fatura"),
    colunas: [
      { campo: "number", label: "Número", formato: "codigo" },
      { campo: "supplierName", label: "Fornecedor" },
      { campo: "submittedAt", label: "Lançado em", formato: "dataHora" },
      { campo: "grandTotal", label: "Total", formato: "dinheiro" },
      colunaSituacao,
    ],
    formulario: [
      {
        campos: [
          empresa,
          numero,
          {
            campo: "supplierId",
            label: "Fornecedor",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refFornecedor,
          },
          { campo: "supplierInvoiceNumber", label: "Nota do fornecedor", tipo: "texto" },
          { campo: "supplierInvoiceDate", label: "Data da nota", tipo: "data" },
          {
            campo: "postingDate",
            label: "Data de lançamento",
            tipo: "data",
            obrigatorio: true,
            padrao: hoje,
          },
          { campo: "dueDate", label: "Vencimento", tipo: "data" },
          {
            campo: "paymentTermId",
            label: "Condição de pagamento",
            tipo: "referencia",
            referencia: refCondicaoDePagamento,
          },
          ...moeda,
          centroDeCusto,
        ],
      },
      {
        titulo: "Estoque",
        campos: [
          {
            campo: "updateStock",
            label: "Dá entrada no estoque nesta fatura",
            tipo: "booleano",
            ajuda: "Marque quando não houver recebimento separado.",
          },
          {
            campo: "setWarehouseId",
            label: "Depósito",
            tipo: "referencia",
            referencia: refDepositoAnalitico,
            visivel: (v) => Boolean(v.updateStock),
          },
        ],
      },
      { titulo: "Devolução", campos: [...devolucao("/purchase-invoices"), observacoes] },
    ],
    linhas: [
      linhasDeItens({ comPreco: true, precoObrigatorio: true, comDeposito: true, comLote: true }),
      linhasDeImpostos,
    ],
  },
  {
    rota: "/inventario-fisico",
    endpoint: "/physical-inventories",
    temBusca: false,
    papeisEscrita: ["OPERADOR"],
    rotuloNovo: "Nova contagem",
    singular: "contagem",
    larguraDoFormulario: "cheia",
    carregarAntesDeEditar: true,
    podeEditar: emRascunho,
    podeExcluir: emRascunho,
    acoes: acoesDeDocumento(["OPERADOR"], "a contagem"),
    colunas: [
      { campo: "number", label: "Número", formato: "codigo" },
      { campo: "postingDate", label: "Data", formato: "data" },
      { campo: "countedAt", label: "Contagem em", formato: "data" },
      colunaSituacao,
    ],
    formulario: [
      {
        campos: [
          empresa,
          numero,
          {
            campo: "postingDate",
            label: "Data de lançamento",
            tipo: "data",
            obrigatorio: true,
            padrao: hoje,
          },
          { campo: "countedAt", label: "Contado em", tipo: "data" },
          {
            campo: "setWarehouseId",
            label: "Depósito",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refDepositoAnalitico,
          },
          centroDeCusto,
          observacoes,
        ],
      },
    ],
    linhas: [
      {
        campo: "items",
        titulo: "Contagem",
        rotuloNovo: "Novo item",
        obrigatorio: true,
        colunas: [
          {
            campo: "itemId",
            label: "Item",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refItem,
          },
          { campo: "countedQty", label: "Quantidade contada", tipo: "decimal" },
          { campo: "countedRate", label: "Custo unitário", tipo: "dinheiro" },
        ],
      },
    ],
  },
  {
    rota: "/pagamentos",
    endpoint: "/payments",
    temBusca: false,
    papeisEscrita: ["FINANCEIRO"],
    rotuloNovo: "Novo pagamento",
    singular: "pagamento",
    larguraDoFormulario: "cheia",
    carregarAntesDeEditar: true,
    podeEditar: emRascunho,
    podeExcluir: emRascunho,
    acoes: acoesDeDocumento(["FINANCEIRO"], "o pagamento"),
    aoCarregar: (registro) => ({
      ...registro,
      bankAccountId:
        registro.paymentType === "PAY" ? registro.paidFromAccountId : registro.paidToAccountId,
    }),
    colunas: [
      { campo: "number", label: "Número", formato: "codigo" },
      { campo: "paymentType", label: "Tipo" },
      { campo: "postingDate", label: "Data", formato: "data" },
      { campo: "paidAmount", label: "Valor", formato: "dinheiro" },
      { campo: "unallocatedAmount", label: "Não alocado", formato: "dinheiro" },
      { campo: "clearanceDate", label: "Compensado em", formato: "data" },
      colunaSituacao,
    ],
    formulario: [
      {
        campos: [
          empresa,
          numero,
          {
            campo: "paymentType",
            label: "Tipo",
            tipo: "opcoes",
            obrigatorio: true,
            opcoes: OPCOES_TIPO_DE_PAGAMENTO,
            padrao: "RECEIVE",
          },
          {
            campo: "partyType",
            label: "Espécie do parceiro",
            tipo: "opcoes",
            opcoes: OPCOES_ESPECIE_DE_PARTE,
            padrao: "CUSTOMER",
          },
          {
            campo: "partyId",
            label: "Parceiro",
            tipo: "referencia",
            obrigatorio: true,
            referencia: {
              endpoint: "/customers",
              busca: true,
              rotulo: (r) => String(r.name),
              endpointDe: (v) => (v.partyType === "SUPPLIER" ? "/suppliers" : "/customers"),
            },
          },
          { campo: "postingDate", label: "Data", tipo: "data", obrigatorio: true, padrao: hoje },
          {
            campo: "bankAccountId",
            label: "Conta bancária",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refContaAnalitica,
          },
          {
            campo: "paymentMethodId",
            label: "Meio de pagamento",
            tipo: "referencia",
            referencia: refMeioDePagamento,
            ajuda:
              "É por ele que o fechamento de turno e a conciliação separam dinheiro de cartão.",
          },
          { campo: "paidAmount", label: "Valor", tipo: "dinheiro", obrigatorio: true },
          ...moeda,
        ],
      },
      {
        titulo: "Referência",
        campos: [
          { campo: "referenceNumber", label: "Documento", tipo: "texto" },
          { campo: "referenceDate", label: "Data do documento", tipo: "data" },
          centroDeCusto,
          observacoes,
        ],
      },
    ],
    linhas: [
      {
        campo: "allocations",
        titulo: "Alocação em faturas",
        rotuloNovo: "Nova alocação",
        colunas: [
          {
            campo: "referenceType",
            label: "Espécie",
            tipo: "opcoes",
            obrigatorio: true,
            opcoes: OPCOES_ESPECIE_DE_REFERENCIA,
            padrao: "SALES_INVOICE",
          },
          {
            campo: "referenceId",
            label: "Fatura",
            tipo: "referencia",
            obrigatorio: true,
            referencia: {
              endpoint: "/sales-invoices",
              rotulo: (r) => String(r.number ?? r.id),
              endpointDe: (linha) =>
                linha.referenceType === "PURCHASE_INVOICE"
                  ? "/purchase-invoices"
                  : "/sales-invoices",
              filtro: (r) => r.status === "SUBMITTED",
            },
          },
          { campo: "scheduleNumber", label: "Parcela", tipo: "inteiro" },
          {
            campo: "allocatedAmount",
            label: "Valor alocado",
            tipo: "dinheiro",
            obrigatorio: true,
          },
        ],
        total: (linha) => Number(linha.allocatedAmount ?? 0),
        rotuloTotal: "Total alocado",
      },
    ],
  },
];
