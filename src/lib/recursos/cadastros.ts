import { CheckCheck, Copy, Layers, RotateCcw } from "lucide-vue-next";
import type { CampoDeFormulario, ConsultaDeCampo, Valores } from "@/lib/formulario";
import type { Registro } from "@/api/lista";
import type { BadgeTone } from "@/types";
import { dataCurta } from "@/lib/formato";
import { padraoDeMetodoDeCusteio } from "@/lib/padroes";
import SaldoDaConta from "@/components/form/SaldoDaConta.vue";
import VariantesDoModelo from "@/components/form/VariantesDoModelo.vue";
import DadosFiscaisDaNatureza from "@/components/form/DadosFiscaisDaNatureza.vue";
import {
  paineisDeCliente,
  paineisDeFornecedor,
  paineisDeItem,
  precosDaLista,
  valoresDoEixo,
  paineisDeNaturezaDeOperacao,
} from "@/lib/subrecursos";
import {
  ESPECIE_DE_MEIO_DE_PAGAMENTO,
  OPCOES_BASE_DO_VENCIMENTO,
  OPCOES_ESPECIE_DE_MEIO_DE_PAGAMENTO,
  OPCOES_ESFERA_PUBLICA,
  OPCOES_FORMA_DE_PAGAMENTO_NA_NOTA,
  OPCOES_SENTIDO_DA_OPERACAO,
  SENTIDO_DA_OPERACAO,
  OPCOES_ORIGEM_DA_MERCADORIA,
  OPCOES_ESPECIE_DE_PARCEIRO,
  OPCOES_SEXO,
  OPCOES_TIPO_DE_CONTRIBUINTE,
  OPCOES_TIPO_DE_EMPRESA,
  METODO_DE_CUSTEIO,
  OPCOES_METODO_DE_CUSTEIO,
  OPCOES_NATUREZA_DE_CONTA,
  OPCOES_NATUREZA_DO_SALDO,
  OPCOES_TIPO_DE_CONTA,
  rotuloDe,
} from "@/lib/opcoes";
import {
  refCategoriaDeUnidade,
  refCentroDeCusto,
  refCliente,
  refConta,
  refContaAnalitica,
  refContaDeDinheiro,
  refDepositoAnalitico,
  refEmpresa,
  refFornecedor,
  refFuncionarioComAcesso,
  refGrupoDeCliente,
  refGrupoDeFornecedor,
  refGrupoDeItem,
  refItem,
  refItemModelo,
  refListaDePrecos,
  refListaDeVenda,
  refMeioDePagamento,
  refMoeda,
  refNcm,
  refUnidade,
  refUnidadeTributavel,
  refNaturezaDaOperacao,
} from "@/lib/referencias";
import { soAlfanumerico } from "@/lib/mascaras";
import { naoAntesDe, naoNoFuturo } from "@/lib/validadores";
import { ativoOuInativo, ativoOuNao, habilitadoOuNao, type Recurso } from "./tipos";

const empresa = {
  campo: "companyId",
  label: "Empresa",
  tipo: "referencia" as const,
  obrigatorio: true,
  referencia: refEmpresa,
};

const situacaoDoItem = (registro: Registro) => {
  if (registro.disabled && registro.activateOn) {
    return { texto: `Entra em ${dataCurta(registro.activateOn)}`, tom: "warning" as BadgeTone };
  }
  return ativoOuInativo(registro);
};

const custeioDaEmpresa = (): string => {
  const metodo = padraoDeMetodoDeCusteio();
  return metodo ? `Segue a empresa — ${rotuloDe(METODO_DE_CUSTEIO, metodo)}` : "Segue a empresa";
};

const ehPessoaJuridica = (valores: Valores) => String(valores.partyKind ?? "COMPANY") === "COMPANY";

const ehPessoaFisica = (valores: Valores) => !ehPessoaJuridica(valores);

const consultaDeCnpj: ConsultaDeCampo = {
  rotulo: "Consultar CNPJ",
  endpoint: "/cnpj",
  parametro: "cnpj",
  chave: (valor) => (soAlfanumerico(valor).length === 14 ? soAlfanumerico(valor) : null),
  disponivel: ehPessoaJuridica,
  mapear: (resposta) => {
    const sugerido: Valores = {};
    if (resposta.legalName) sugerido.name = resposta.legalName;
    if (resposta.tradeName) sugerido.tradeName = resposta.tradeName;
    if (resposta.email) sugerido.email = resposta.email;
    if (resposta.phone) sugerido.phoneNumber = resposta.phone;
    if (resposta.openedOn) sugerido.openedOn = resposta.openedOn;
    if (resposta.mainCnae)
      sugerido.notes = `CNAE ${resposta.mainCnae} ${resposta.mainCnaeDescription ?? ""}`.trim();
    return sugerido;
  },
  aviso: (resposta) => {
    const pendencias = Array.isArray(resposta.pending) ? (resposta.pending as string[]) : [];
    if (pendencias.length > 0) return pendencias[0];
    if (resposta.source === "CACHE" || resposta.source === "CACHE_VENCIDO") {
      return "Dados da última consulta guardada.";
    }
    return null;
  },
};

/** A empresa guarda os mesmos dados da Receita em campos de nome próprio. */
const consultaDeCnpjDaEmpresa: ConsultaDeCampo = {
  ...consultaDeCnpj,
  disponivel: undefined,
  mapear: (resposta) => {
    const sugerido: Valores = {};
    if (resposta.legalName) sugerido.name = resposta.legalName;
    if (resposta.email) sugerido.email = resposta.email;
    if (resposta.phone) sugerido.phoneNumber = resposta.phone;
    if (resposta.openedOn) sugerido.dateOfEstablishment = resposta.openedOn;
    if (resposta.mainCnae)
      sugerido.description = `CNAE ${resposta.mainCnae} ${resposta.mainCnaeDescription ?? ""}`.trim();
    return sugerido;
  },
};

const camposDoPerfil = (): CampoDeFormulario[] => [
  {
    campo: "partyKind",
    label: "Tipo de pessoa",
    tipo: "opcoes",
    obrigatorio: true,
    opcoes: OPCOES_ESPECIE_DE_PARCEIRO,
    padrao: "COMPANY",
  },
  {
    campo: "companyType",
    label: "Tipo de empresa",
    tipo: "opcoes",
    opcoes: OPCOES_TIPO_DE_EMPRESA,
    visivel: ehPessoaJuridica,
  },
  {
    campo: "publicSphere",
    label: "Esfera pública",
    tipo: "opcoes",
    opcoes: OPCOES_ESFERA_PUBLICA,
    ajuda: "Só faz sentido em órgão público.",
    visivel: ehPessoaJuridica,
  },
  {
    campo: "taxId",
    label: "CPF/CNPJ",
    tipo: "cpfCnpj",
    consulta: consultaDeCnpj,
  },
  { campo: "legalName", label: "Razão social", tipo: "texto", visivel: ehPessoaJuridica },
  { campo: "tradeName", label: "Nome fantasia", tipo: "texto", visivel: ehPessoaJuridica },
  { campo: "tradeName", label: "Apelido", tipo: "texto", visivel: ehPessoaFisica },
  { campo: "gender", label: "Sexo", tipo: "opcoes", opcoes: OPCOES_SEXO, visivel: ehPessoaFisica },
  {
    campo: "birthDate",
    label: "Data de nascimento",
    tipo: "data",
    visivel: ehPessoaFisica,
    validar: naoNoFuturo("A data de nascimento não pode ser futura."),
  },
  { campo: "openedOn", label: "Data de abertura", tipo: "data", visivel: ehPessoaJuridica },
];

const camposFiscaisDoParceiro = (): CampoDeFormulario[] => [
  {
    campo: "taxpayerType",
    label: "Tipo de contribuinte",
    tipo: "opcoes",
    opcoes: OPCOES_TIPO_DE_CONTRIBUINTE,
    ajuda: "Contribuinte exige inscrição estadual; isento e não contribuinte não podem ter.",
  },
  {
    campo: "stateRegistration",
    label: "IE/RG",
    tipo: "texto",
    obrigatorio: true,
    visivel: (valores) => valores.taxpayerType === "ICMS_CONTRIBUTOR",
  },
  { campo: "municipalRegistration", label: "Inscrição municipal", tipo: "texto" },
  {
    campo: "suframaCode",
    label: "SUFRAMA",
    tipo: "texto",
    inputmode: "numeric",
    ajuda: "Só dígitos. Vale para operações com Área de Livre Comércio.",
    visivel: ehPessoaJuridica,
    validar: (valor) => (/^\d+$/.test(String(valor)) ? null : "Só dígitos."),
  },
];

export const cadastros: Recurso[] = [
  {
    rota: "/itens",
    endpoint: "/items",
    temBusca: true,
    buscaPlaceholder: "Buscar por REF, nome ou código de barras",
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo item",
    singular: "item",
    painel: {
      rotulo: "Detalhes do item",
      icone: Layers,
      abas: [
        ...paineisDeItem.map((definicao) => ({ titulo: definicao.titulo, definicao })),
        {
          titulo: "Similares",
          componente: VariantesDoModelo,
          atalho: {
            rotulo: "Novo similar",
            icone: Copy,
            disponivel: (r) => Boolean(r.template),
          },
        },
      ],
    },
    colunas: [
      { campo: "code", label: "REF", formato: "codigo" },
      { campo: "name", label: "Nome" },
      { campo: "itemGroupName", label: "Grupo" },
      { campo: "stockUomName", label: "Unidade" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: situacaoDoItem },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "code",
            label: "REF",
            tipo: "texto",
            ajuda: "Gerada pelo sistema.",
            geradoPeloSistema: true,
            inteira: true,
          },
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          { campo: "description", label: "Descrição", tipo: "textoLongo", inteira: true },
          { campo: "itemGroupId", label: "Grupo", tipo: "referencia", referencia: refGrupoDeItem },
          {
            campo: "stockUomId",
            label: "Unidade de medida",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refUnidade,
          },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
          {
            campo: "activateOn",
            label: "Entra em uso em",
            tipo: "data",
            visivel: (v) => Boolean(v.disabled),
            ajuda:
              "Deixe em branco para o item ficar parado até você mesmo ativá-lo. Com dia marcado," +
              " ele entra sozinho de madrugada.",
          },
        ],
      },
      {
        titulo: "Controle",
        campos: [
          { campo: "stockItem", label: "Controla estoque", tipo: "booleano", padrao: true },
          { campo: "purchaseItem", label: "Pode ser comprado", tipo: "booleano", padrao: true },
          { campo: "salesItem", label: "Pode ser vendido", tipo: "booleano", padrao: true },
          {
            campo: "fixedAsset",
            label: "Bem de uso da empresa",
            tipo: "booleano",
            ajuda:
              "Trator, galpão, balança: comprado para usar, e não para vender nem consumir." +
              " É o que a contabilidade chama de imobilizado.",
          },
          {
            campo: "valuationMethod",
            label: "Método de custeio",
            tipo: "opcoes",
            opcoes: OPCOES_METODO_DE_CUSTEIO,
            placeholder: custeioDaEmpresa,
            ajuda: "Vazio, o item segue a empresa — e acompanha quando ela mudar.",
          },
          { campo: "batchTracked", label: "Controla lote", tipo: "booleano" },
          { campo: "serialTracked", label: "Controla número de série", tipo: "booleano" },
          { campo: "expiryTracked", label: "Controla validade", tipo: "booleano" },
          {
            campo: "shelfLifeDays",
            label: "Prazo de validade (dias)",
            tipo: "inteiro",
            visivel: (v) => Boolean(v.expiryTracked),
            ajuda:
              "A data de validade fica em cada lote, e é um calendário lá. Este prazo é o que a" +
              " calcula sozinha a partir da fabricação, para não digitar a data lote a lote.",
          },
        ],
      },
      {
        titulo: "Similares",
        campos: [
          { campo: "template", label: "É modelo de similares", tipo: "booleano" },
          {
            campo: "variantOfId",
            label: "Similar de",
            tipo: "referencia",
            referencia: refItemModelo,
            visivel: (v) => !v.template,
          },
        ],
      },
      {
        titulo: "Fiscal e logística",
        campos: [
          { campo: "gtin", label: "Código de barras (GTIN)", tipo: "texto", inputmode: "numeric" },
          {
            campo: "ncm",
            label: "NCM",
            tipo: "referenciaTexto",
            referencia: refNcm,
            obrigatorio: true,
            inteira: true,
            visivel: (v) => v.stockItem !== false,
            ajuda:
              "A classificação fiscal da mercadoria. É dela que sai a unidade em que a nota mede a" +
              " quantidade. Serviço não tem NCM.",
          },
          {
            campo: "fiscalOrigin",
            label: "Origem da mercadoria",
            tipo: "opcoes",
            opcoes: OPCOES_ORIGEM_DA_MERCADORIA,
            visivel: (v) => v.stockItem !== false,
            ajuda:
              'A primeira parte do CST na nota. Sem padrão de propósito: "nacional" por padrão' +
              " marcaria como nacional, em silêncio, todo item importado. A emissão cobra.",
          },
          { campo: "weightPerUnit", label: "Peso por unidade", tipo: "decimal" },
          {
            campo: "weightUomId",
            label: "Unidade de peso",
            tipo: "referencia",
            referencia: refUnidade,
          },
        ],
      },
    ],
  },
  {
    rota: "/grupos-de-item",
    endpoint: "/item-groups",
    temBusca: false,
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo grupo",
    singular: "grupo de item",
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "parentItemGroupName", label: "Pertence a" },
      { campo: "group", label: "Agrupador", formato: "booleano" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "parentItemGroupId",
            label: "Pertence a",
            tipo: "referencia",
            referencia: refGrupoDeItem,
          },
          { campo: "group", label: "É agrupador", tipo: "booleano" },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/depositos",
    endpoint: "/warehouses",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Novo depósito",
    singular: "depósito",
    colunas: [
      { campo: "code", label: "Código", formato: "codigo" },
      { campo: "name", label: "Nome" },
      { campo: "parentWarehouseName", label: "Pertence a" },
      { campo: "group", label: "Agrupador", formato: "booleano" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          empresa,
          { campo: "code", label: "Código", tipo: "texto" },
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "parentWarehouseId",
            label: "Pertence a",
            tipo: "referencia",
            referencia: { endpoint: "/warehouses", rotulo: (r) => String(r.name) },
          },
          {
            campo: "accountId",
            label: "Conta de estoque",
            tipo: "referencia",
            referencia: refContaAnalitica,
          },
          { campo: "group", label: "É agrupador", tipo: "booleano" },
          {
            campo: "allowNegativeStock",
            label: "Permite saldo negativo",
            tipo: "booleano",
            ajuda: "Deixa o saldo ficar abaixo de zero neste depósito.",
          },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/unidades",
    endpoint: "/uoms",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Nova unidade",
    singular: "unidade de medida",
    colunas: [
      { campo: "symbol", label: "Símbolo", formato: "codigo" },
      { campo: "name", label: "Nome" },
      { campo: "categoryName", label: "Categoria" },
      { campo: "mustBeWholeNumber", label: "Só inteiros", formato: "booleano" },
      { campo: "enabled", label: "Situação", formato: "situacao", situacao: habilitadoOuNao },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true },
          { campo: "symbol", label: "Símbolo", tipo: "texto" },
          { campo: "commonCode", label: "Código comum", tipo: "texto" },
          {
            campo: "fiscalUnitCode",
            label: "Unidade tributável",
            tipo: "referenciaTexto",
            referencia: refUnidadeTributavel,
            obrigatorio: true,
            ajuda:
              "A unidade da Receita a que esta corresponde. São treze, e toda unidade precisa de" +
              " uma: é ela que vai no campo que o fisco cruza.",
          },
          {
            campo: "fiscalFactor",
            label: "Quantas unidades tributáveis cabem em uma desta",
            tipo: "decimal",
            ajuda:
              "Mililitro para litro é 0,001. Em branco, o fator é do item — é o caso da saca, que" +
              " tem 60 kg na soja e 50 no arroz.",
          },
          {
            campo: "categoryId",
            label: "Categoria",
            tipo: "referencia",
            referencia: refCategoriaDeUnidade,
            leDe: "category",
          },
          { campo: "description", label: "Descrição", tipo: "texto", inteira: true },
          { campo: "mustBeWholeNumber", label: "Aceita só número inteiro", tipo: "booleano" },
          { campo: "enabled", label: "Ativa", tipo: "booleano", padrao: true },
        ],
      },
    ],
  },
  {
    rota: "/categorias-de-unidade",
    endpoint: "/uom-categories",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Nova categoria",
    singular: "categoria de unidade",
    colunas: [{ campo: "name", label: "Nome", formato: "codigo" }],
    formulario: [
      {
        campos: [{ campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true }],
      },
    ],
  },
  {
    rota: "/conversoes-de-unidade",
    endpoint: "/uom-conversions",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Nova conversão",
    singular: "fator de conversão",
    colunas: [
      { campo: "fromUomName", label: "De", formato: "codigo" },
      { campo: "toUomName", label: "Para" },
      { campo: "factor", label: "Fator", formato: "numero" },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "fromUomId",
            label: "De",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refUnidade,
            leDe: "fromUom",
          },
          {
            campo: "toUomId",
            label: "Para",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refUnidade,
            leDe: "toUom",
          },
          {
            campo: "factor",
            label: "Fator",
            tipo: "decimal",
            obrigatorio: true,
            ajuda: "Quantas unidades de destino cabem em uma de origem.",
            inteira: true,
          },
        ],
      },
    ],
  },
  {
    rota: "/clientes",
    endpoint: "/customers",
    temBusca: true,
    buscaPlaceholder: "Buscar por nome ou CPF/CNPJ",
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo cliente",
    singular: "cliente",
    painel: {
      rotulo: "Detalhes do cliente",
      icone: Layers,
      abas: paineisDeCliente.map((definicao) => ({ titulo: definicao.titulo, definicao })),
    },
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "legalName", label: "Razão social" },
      { campo: "taxIdFormatted", label: "CPF/CNPJ" },
      { campo: "customerGroupName", label: "Grupo" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          ...camposDoPerfil(),
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true },
          {
            campo: "customerGroupId",
            label: "Grupo",
            tipo: "referencia",
            referencia: refGrupoDeCliente,
          },
        ],
      },
      {
        titulo: "Informações fiscais",
        campos: camposFiscaisDoParceiro(),
      },
      {
        titulo: "Contato",
        campos: [
          { campo: "email", label: "E-mail", tipo: "email" },
          { campo: "phoneNumber", label: "Telefone", tipo: "telefone" },
          { campo: "website", label: "Site", tipo: "texto", inteira: true },
        ],
      },
      {
        titulo: "Comercial",
        campos: [
          {
            campo: "defaultCurrencyId",
            label: "Moeda padrão",
            tipo: "referencia",
            referencia: refMoeda,
          },
          { campo: "creditLimit", label: "Limite de crédito", tipo: "dinheiro" },
          { campo: "paymentTermsDays", label: "Prazo de pagamento (dias)", tipo: "inteiro" },
          { campo: "onHold", label: "Bloqueado", tipo: "booleano" },
          {
            campo: "holdReason",
            label: "Motivo do bloqueio",
            tipo: "texto",
            visivel: (v) => Boolean(v.onHold),
            inteira: true,
          },
          { campo: "notes", label: "Observações", tipo: "textoLongo", inteira: true },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/fornecedores",
    endpoint: "/suppliers",
    temBusca: true,
    buscaPlaceholder: "Buscar por nome ou CPF/CNPJ",
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo fornecedor",
    singular: "fornecedor",
    painel: {
      rotulo: "Detalhes do fornecedor",
      icone: Layers,
      abas: paineisDeFornecedor.map((definicao) => ({ titulo: definicao.titulo, definicao })),
    },
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "legalName", label: "Razão social" },
      { campo: "taxIdFormatted", label: "CPF/CNPJ" },
      { campo: "supplierGroupName", label: "Grupo" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          ...camposDoPerfil(),
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true },
          {
            campo: "supplierGroupId",
            label: "Grupo",
            tipo: "referencia",
            referencia: refGrupoDeFornecedor,
          },
        ],
      },
      {
        titulo: "Informações fiscais",
        campos: camposFiscaisDoParceiro(),
      },
      {
        titulo: "Contato",
        campos: [
          { campo: "email", label: "E-mail", tipo: "email" },
          { campo: "phoneNumber", label: "Telefone", tipo: "telefone" },
          { campo: "website", label: "Site", tipo: "texto", inteira: true },
        ],
      },
      {
        titulo: "Comercial",
        campos: [
          {
            campo: "defaultCurrencyId",
            label: "Moeda padrão",
            tipo: "referencia",
            referencia: refMoeda,
          },
          { campo: "paymentTermsDays", label: "Prazo de pagamento (dias)", tipo: "inteiro" },
          { campo: "onHold", label: "Bloqueado", tipo: "booleano" },
          {
            campo: "holdReason",
            label: "Motivo do bloqueio",
            tipo: "texto",
            visivel: (v) => Boolean(v.onHold),
            inteira: true,
          },
          { campo: "notes", label: "Observações", tipo: "textoLongo", inteira: true },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/grupos",
    endpoint: "/party-groups/customers",
    temBusca: false,
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo grupo",
    singular: "grupo de clientes",
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "parentGroupName", label: "Pertence a" },
      { campo: "group", label: "Agrupador", formato: "booleano" },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "defaultReceivableAccountId",
            label: "Conta a receber padrão",
            tipo: "referencia",
            referencia: refContaAnalitica,
          },
          { campo: "creditLimit", label: "Limite de crédito", tipo: "dinheiro" },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/grupos-de-fornecedor",
    endpoint: "/party-groups/suppliers",
    temBusca: false,
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo grupo",
    singular: "grupo de fornecedores",
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "parentGroupName", label: "Pertence a" },
      { campo: "group", label: "Agrupador", formato: "booleano" },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "defaultPayableAccountId",
            label: "Conta a pagar padrão",
            tipo: "referencia",
            referencia: refContaAnalitica,
          },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/plano-de-contas",
    endpoint: "/accounts",
    temBusca: false,
    papeisEscrita: ["CONTADOR"],
    rotuloNovo: "Nova conta",
    singular: "conta",
    painel: {
      rotulo: "Saldo da conta",
      icone: Layers,
      abas: [{ titulo: "Saldo", componente: SaldoDaConta }],
    },
    colunas: [
      { campo: "accountNumber", label: "Código", formato: "codigo" },
      { campo: "name", label: "Nome" },
      { campo: "accountType", label: "Tipo" },
      { campo: "rootType", label: "Natureza" },
      { campo: "group", label: "Agrupadora", formato: "booleano" },
    ],
    formulario: [
      {
        campos: [
          empresa,
          { campo: "accountNumber", label: "Código contábil", tipo: "texto" },
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "parentAccountId",
            label: "Conta superior",
            tipo: "referencia",
            referencia: refConta,
            leDe: "parentAccount",
          },
          {
            campo: "rootType",
            label: "Natureza",
            tipo: "opcoes",
            opcoes: OPCOES_NATUREZA_DE_CONTA,
          },
          { campo: "accountType", label: "Tipo", tipo: "opcoes", opcoes: OPCOES_TIPO_DE_CONTA },
          { campo: "group", label: "É conta sintética", tipo: "booleano" },
        ],
      },
      {
        titulo: "Comportamento",
        campos: [
          { campo: "accountCurrencyId", label: "Moeda", tipo: "referencia", referencia: refMoeda },
          { campo: "taxRate", label: "Alíquota (%)", tipo: "decimal" },
          {
            campo: "balanceMustBe",
            label: "Saldo deve ser",
            tipo: "opcoes",
            opcoes: OPCOES_NATUREZA_DO_SALDO,
          },
          { campo: "frozen", label: "Congelada", tipo: "booleano" },
          { campo: "includeInGross", label: "Entra no lucro bruto", tipo: "booleano" },
          { campo: "disabled", label: "Inativa", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/centros-de-custo",
    endpoint: "/cost-centers",
    temBusca: false,
    papeisEscrita: ["CONTADOR"],
    rotuloNovo: "Novo centro de custo",
    singular: "centro de custo",
    colunas: [
      { campo: "costCenterNumber", label: "Código", formato: "codigo" },
      { campo: "name", label: "Nome" },
      { campo: "parentCostCenterName", label: "Pertence a" },
      { campo: "group", label: "Agrupador", formato: "booleano" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          empresa,
          { campo: "costCenterNumber", label: "Código", tipo: "texto" },
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "parentCostCenterId",
            label: "Pertence a",
            tipo: "referencia",
            referencia: refCentroDeCusto,
            leDe: "parentCostCenter",
          },
          { campo: "group", label: "É agrupador", tipo: "booleano" },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/empresas",
    endpoint: "/companies",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Nova empresa",
    singular: "empresa",
    colunas: [
      { campo: "abbreviation", label: "Sigla", formato: "codigo" },
      { campo: "name", label: "Nome" },
      { campo: "taxId", label: "CNPJ" },
      { campo: "defaultCurrency", label: "Moeda" },
      { campo: "enabled", label: "Situação", formato: "situacao", situacao: habilitadoOuNao },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true },
          { campo: "abbreviation", label: "Sigla", tipo: "texto", obrigatorio: true },
          {
            campo: "taxId",
            label: "CNPJ",
            tipo: "cpfCnpj",
            consulta: consultaDeCnpjDaEmpresa,
            ajuda: "Informe o CNPJ e consulte para preencher o cadastro.",
          },
          { campo: "countryCode", label: "País", tipo: "pais", obrigatorio: true, padrao: "BR" },
          {
            campo: "parentCompanyId",
            label: "Empresa superior",
            tipo: "referencia",
            referencia: refEmpresa,
            leDe: "parentCompany",
          },
          { campo: "group", label: "É agrupadora", tipo: "booleano" },
        ],
      },
      {
        titulo: "Contabilidade",
        campos: [
          {
            campo: "defaultCurrencyId",
            label: "Moeda padrão",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refMoeda,
            leDe: "defaultCurrency",
          },
          {
            campo: "reportingCurrencyId",
            label: "Moeda de relatório",
            tipo: "referencia",
            referencia: refMoeda,
            leDe: "reportingCurrency",
          },
          {
            campo: "valuationMethod",
            label: "Método de custeio",
            tipo: "opcoes",
            opcoes: OPCOES_METODO_DE_CUSTEIO,
          },
          {
            campo: "defaultIncomeAccountId",
            label: "Conta de receita padrão",
            tipo: "referencia",
            referencia: refContaAnalitica,
            leDe: "defaultIncomeAccount",
            ajuda: "Onde a venda entra quando o item não diz outra.",
          },
          {
            campo: "defaultExpenseAccountId",
            label: "Conta de custo padrão",
            tipo: "referencia",
            referencia: refContaAnalitica,
            leDe: "defaultExpenseAccount",
            ajuda: "Onde o custo da venda sai quando o item não diz outra.",
          },
          {
            campo: "perpetualInventory",
            label: "Inventário permanente",
            tipo: "booleano",
            ajuda: "Movimento de estoque gera lançamento contábil na hora.",
          },
          { campo: "accountsFrozenTillDate", label: "Contabilidade congelada até", tipo: "data" },
        ],
      },
      {
        titulo: "Informações fiscais",
        campos: camposFiscaisDoParceiro(),
      },
      {
        titulo: "Contato",
        campos: [
          { campo: "email", label: "E-mail", tipo: "email" },
          { campo: "phoneNumber", label: "Telefone", tipo: "telefone" },
          { campo: "website", label: "Site", tipo: "texto" },
          { campo: "dateOfEstablishment", label: "Fundada em", tipo: "data" },
          { campo: "description", label: "Descrição", tipo: "textoLongo", inteira: true },
          { campo: "enabled", label: "Ativa", tipo: "booleano", padrao: true },
        ],
      },
    ],
  },
  {
    rota: "/moedas",
    endpoint: "/currencies",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Nova moeda",
    singular: "moeda",
    colunas: [
      { campo: "code", label: "Código", formato: "codigo" },
      { campo: "name", label: "Nome" },
      { campo: "symbol", label: "Símbolo" },
      { campo: "fractionUnits", label: "Casas", formato: "numero" },
      { campo: "enabled", label: "Situação", formato: "situacao", situacao: habilitadoOuNao },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "code",
            label: "Código ISO",
            tipo: "moeda",
            obrigatorio: true,
            placeholder: "BRL",
          },
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true },
          { campo: "symbol", label: "Símbolo", tipo: "texto", placeholder: "R$" },
          { campo: "symbolOnRight", label: "Símbolo à direita", tipo: "booleano" },
          { campo: "fraction", label: "Nome da fração", tipo: "texto", placeholder: "Centavo" },
          { campo: "fractionUnits", label: "Unidades da fração", tipo: "inteiro", padrao: 100 },
          { campo: "numberFormat", label: "Formato numérico", tipo: "texto" },
          { campo: "enabled", label: "Ativa", tipo: "booleano", padrao: true },
        ],
      },
    ],
  },
  {
    rota: "/configuracoes",
    endpoint: "/naming-series",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Nova série",
    singular: "série de numeração",
    colunas: [
      { campo: "prefix", label: "Prefixo", formato: "codigo" },
      { campo: "description", label: "Descrição" },
      { campo: "currentValue", label: "Atual", formato: "numero" },
      { campo: "padding", label: "Dígitos", formato: "numero" },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "prefix",
            label: "Prefixo",
            tipo: "texto",
            obrigatorio: true,
            placeholder: "PV",
            somenteNaCriacao: true,
          },
          { campo: "description", label: "Descrição", tipo: "texto" },
          {
            campo: "startFrom",
            label: "Começa em",
            tipo: "inteiro",
            padrao: 1,
            somenteNaCriacao: true,
          },
          { campo: "padding", label: "Dígitos", tipo: "inteiro", padrao: 5 },
          { campo: "separator", label: "Separador", tipo: "texto", padrao: "-" },
        ],
      },
    ],
  },
  {
    rota: "/exercicios",
    endpoint: "/fiscal-years",
    temBusca: false,
    papeisEscrita: ["CONTADOR"],
    rotuloNovo: "Novo exercício",
    singular: "exercício",
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "startDate", label: "Início", formato: "data" },
      { campo: "endDate", label: "Fim", formato: "data" },
      { campo: "closed", label: "Encerrado", formato: "booleano" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, placeholder: "2026" },
          { campo: "startDate", label: "Início", tipo: "data", obrigatorio: true },
          {
            campo: "endDate",
            label: "Fim",
            tipo: "data",
            obrigatorio: true,
            validar: naoAntesDe("startDate", "O fim não pode ser anterior ao início."),
          },
          {
            campo: "companyIds",
            label: "Empresas",
            tipo: "referencias",
            obrigatorio: true,
            referencia: refEmpresa,
            leDe: "companies",
            chaveDoId: "companyId",
            inteira: true,
          },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
    acoes: [
      {
        chave: "close",
        rotulo: "Encerrar exercício",
        icone: CheckCheck,
        confirmacao:
          "Encerrar o exercício impede novos lançamentos no período. Só um contador reabre.",
        sucesso: "Exercício encerrado.",
        papeis: ["CONTADOR"],
        disponivel: (r) => !r.closed,
        motivo: "Já encerrado.",
      },
      {
        chave: "reopen",
        rotulo: "Reabrir exercício",
        icone: RotateCcw,
        perigo: true,
        confirmacao: "Reabrir volta a aceitar lançamentos no período já encerrado.",
        sucesso: "Exercício reaberto.",
        papeis: ["CONTADOR"],
        disponivel: (r) => Boolean(r.closed),
        motivo: "Ainda não foi encerrado.",
      },
    ],
  },
  {
    rota: "/periodos-contabeis",
    endpoint: "/accounting-periods",
    temBusca: false,
    papeisEscrita: ["CONTADOR"],
    rotuloNovo: "Novo período",
    singular: "período contábil",
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "startDate", label: "Início", formato: "data" },
      { campo: "endDate", label: "Fim", formato: "data" },
      { campo: "closed", label: "Fechado", formato: "booleano" },
    ],
    formulario: [
      {
        campos: [
          empresa,
          {
            campo: "name",
            label: "Nome",
            tipo: "texto",
            obrigatorio: true,
            placeholder: "Janeiro/2026",
          },
          { campo: "startDate", label: "Início", tipo: "data", obrigatorio: true },
          {
            campo: "endDate",
            label: "Fim",
            tipo: "data",
            obrigatorio: true,
            validar: naoAntesDe("startDate", "O fim não pode ser anterior ao início."),
          },
        ],
      },
    ],
    acoes: [
      {
        chave: "close",
        rotulo: "Fechar período",
        icone: CheckCheck,
        metodo: "PUT",
        confirmacao: "Fechar o período impede lançamentos com data dentro dele.",
        sucesso: "Período fechado.",
        papeis: ["CONTADOR"],
        disponivel: (r) => !r.closed,
        motivo: "Já está fechado.",
      },
      {
        chave: "reopen",
        rotulo: "Reabrir período",
        icone: RotateCcw,
        metodo: "PUT",
        perigo: true,
        confirmacao: "Reabrir volta a aceitar lançamentos no período.",
        sucesso: "Período reaberto.",
        papeis: ["CONTADOR"],
        disponivel: (r) => Boolean(r.closed),
        motivo: "Não está fechado.",
      },
    ],
  },
  {
    rota: "/eixos-de-variante",
    endpoint: "/item-variants/attributes",
    temBusca: false,
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo eixo",
    singular: "eixo de similar",
    painel: {
      rotulo: "Valores do eixo",
      icone: Layers,
      abas: [{ titulo: valoresDoEixo.titulo, definicao: valoresDoEixo }],
    },
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
  {
    rota: "/condicoes-de-pagamento",
    endpoint: "/payment-terms",
    temBusca: false,
    papeisEscrita: ["FINANCEIRO"],
    rotuloNovo: "Nova condição",
    singular: "condição de pagamento",
    carregarAntesDeEditar: true,
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "description", label: "Descrição" },
      {
        campo: "lines",
        label: "Parcelas",
        formato: "numero",
        valor: (r) => (Array.isArray(r.lines) ? r.lines.length : 0),
      },
      { campo: "active", label: "Situação", formato: "situacao", situacao: ativoOuNao },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true },
          { campo: "active", label: "Ativa", tipo: "booleano", padrao: true },
          { campo: "description", label: "Descrição", tipo: "texto", inteira: true },
        ],
      },
    ],
    linhas: [
      {
        campo: "lines",
        titulo: "Parcelas",
        rotuloNovo: "Nova parcela",
        obrigatorio: true,
        colunas: [
          { campo: "description", label: "Descrição", tipo: "texto" },
          {
            campo: "portion",
            label: "Percentual",
            tipo: "decimal",
            obrigatorio: true,
            padrao: 100,
          },
          {
            campo: "dueDateBasis",
            label: "Conta a partir de",
            tipo: "opcoes",
            opcoes: OPCOES_BASE_DO_VENCIMENTO,
            padrao: "INVOICE_DATE",
          },
          { campo: "creditDays", label: "Dias", tipo: "inteiro", padrao: 0 },
          { campo: "creditMonths", label: "Meses", tipo: "inteiro", padrao: 0 },
        ],
      },
    ],
  },
  {
    rota: "/contas-bancarias",
    endpoint: "/bank-accounts",
    temBusca: false,
    papeisEscrita: ["FINANCEIRO"],
    rotuloNovo: "Nova conta",
    singular: "conta bancária",
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "bankName", label: "Banco" },
      { campo: "branchCode", label: "Agência" },
      { campo: "accountNumber", label: "Conta" },
      { campo: "accountName", label: "Conta contábil" },
      { campo: "lastStatementDate", label: "Extrato até", formato: "data" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          empresa,
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "accountId",
            label: "Conta contábil",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refContaDeDinheiro,
            ajuda: "Só conta de banco ou de caixa. É o saldo que a conciliação confronta.",
          },
          { campo: "currencyId", label: "Moeda", tipo: "referencia", referencia: refMoeda },
          { campo: "disabled", label: "Inativa", tipo: "booleano" },
        ],
      },
      {
        titulo: "Onde o dinheiro fica",
        campos: [
          { campo: "bankName", label: "Banco", tipo: "texto" },
          { campo: "branchCode", label: "Agência", tipo: "texto" },
          { campo: "accountNumber", label: "Número da conta", tipo: "texto" },
          { campo: "pixKey", label: "Chave PIX", tipo: "texto", inteira: true },
        ],
      },
    ],
  },
  {
    rota: "/naturezas-de-operacao",
    endpoint: "/operation-natures",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Nova natureza",
    singular: "natureza da operação",
    painel: {
      rotulo: "Regras da natureza",
      icone: Layers,
      abas: paineisDeNaturezaDeOperacao.map((definicao) => ({
        titulo: definicao.titulo,
        definicao,
        abaixo: definicao.chave === "regras-natureza" ? DadosFiscaisDaNatureza : undefined,
      })),
    },
    colunas: [
      {
        campo: "code",
        label: "Natureza",
        formato: "codigo",
        descricao: (r) => (r.name ? String(r.name) : null),
      },
      {
        campo: "direction",
        label: "Sentido",
        valor: (r) => rotuloDe(SENTIDO_DA_OPERACAO, r.direction),
      },
      { campo: "enabled", label: "Situação", formato: "situacao", situacao: habilitadoOuNao },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "direction",
            label: "Sentido",
            tipo: "opcoes",
            obrigatorio: true,
            opcoes: OPCOES_SENTIDO_DA_OPERACAO,
            padrao: "SAIDA",
          },
          {
            campo: "name",
            label: "Nome",
            tipo: "texto",
            obrigatorio: true,
            inteira: true,
            placeholder: "Venda de mercadoria",
            ajuda: "É este texto que sai impresso na nota, como natureza da operação.",
          },
          { campo: "enabled", label: "Ativa", tipo: "booleano", padrao: true },
        ],
      },
    ],
  },
  {
    rota: "/meios-de-pagamento",
    endpoint: "/payment-methods",
    temBusca: false,
    papeisEscrita: ["FINANCEIRO"],
    rotuloNovo: "Novo meio",
    singular: "meio de pagamento",
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      {
        campo: "kind",
        label: "Espécie",
        valor: (r) => rotuloDe(ESPECIE_DE_MEIO_DE_PAGAMENTO, r.kind),
      },
      { campo: "enabled", label: "Situação", formato: "situacao", situacao: habilitadoOuNao },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "kind",
            label: "Espécie",
            tipo: "opcoes",
            obrigatorio: true,
            opcoes: OPCOES_ESPECIE_DE_MEIO_DE_PAGAMENTO,
            padrao: "CASH",
            ajuda: "Decide como o meio é conferido no fechamento do turno.",
          },
          {
            campo: "nfeCode",
            label: "Forma na nota (tPag)",
            tipo: "opcoes",
            opcoes: OPCOES_FORMA_DE_PAGAMENTO_NA_NOTA,
            ajuda:
              'Como a nota declara este meio. Não sai da espécie: de "cartão" não se sabe se é' +
              " crédito ou débito, e a emissão para até alguém dizer.",
          },
          { campo: "enabled", label: "Ativo", tipo: "booleano", padrao: true },
        ],
      },
    ],
  },
  {
    rota: "/listas-de-preco",
    endpoint: "/price-lists",
    temBusca: false,
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Nova lista",
    singular: "lista de preços",
    painel: {
      rotulo: "Preços da lista",
      icone: Layers,
      abas: [{ titulo: precosDaLista.titulo, definicao: precosDaLista }],
    },
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      { campo: "currencyCode", label: "Moeda" },
      { campo: "selling", label: "Venda", formato: "booleano" },
      { campo: "buying", label: "Compra", formato: "booleano" },
      { campo: "enabled", label: "Situação", formato: "situacao", situacao: habilitadoOuNao },
    ],
    formulario: [
      {
        campos: [
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "currencyId",
            label: "Moeda",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refMoeda,
            ajuda: "A fatura só aceita lista da mesma moeda dela.",
          },
          { campo: "selling", label: "Vale na venda", tipo: "booleano", padrao: true },
          { campo: "buying", label: "Vale na compra", tipo: "booleano" },
          { campo: "enabled", label: "Ativa", tipo: "booleano", padrao: true },
        ],
      },
    ],
  },
  {
    rota: "/precos-de-item",
    endpoint: "/item-prices",
    temBusca: false,
    papeisEscrita: ["COMERCIAL"],
    rotuloNovo: "Novo preço",
    singular: "preço de item",
    colunas: [
      { campo: "priceListName", label: "Lista" },
      { campo: "itemCode", label: "Item", formato: "codigo" },
      { campo: "rate", label: "Preço", formato: "dinheiro" },
      { campo: "validFrom", label: "Vale de", formato: "data" },
      { campo: "validUpto", label: "Vale até", formato: "data" },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "priceListId",
            label: "Lista de preços",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refListaDePrecos,
          },
          {
            campo: "itemId",
            label: "Item",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refItem,
          },
          { campo: "rate", label: "Preço unitário", tipo: "dinheiro", obrigatorio: true },
          {
            campo: "uomId",
            label: "Unidade",
            tipo: "referencia",
            referencia: refUnidade,
            ajuda: "Em branco, o preço vale para qualquer unidade.",
          },
        ],
      },
      {
        titulo: "Para quem, e quando",
        campos: [
          {
            campo: "customerId",
            label: "Só deste cliente",
            tipo: "referencia",
            referencia: refCliente,
            ajuda: "O preço mais específico ganha do mais geral, mesmo que o geral seja mais novo.",
          },
          {
            campo: "supplierId",
            label: "Só deste fornecedor",
            tipo: "referencia",
            referencia: refFornecedor,
          },
          { campo: "validFrom", label: "Vale a partir de", tipo: "data" },
          { campo: "validUpto", label: "Vale até", tipo: "data" },
          { campo: "note", label: "Observação", tipo: "texto", inteira: true },
        ],
      },
    ],
  },
  {
    rota: "/caixas",
    endpoint: "/pos-profiles",
    temBusca: false,
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Novo caixa",
    singular: "caixa",
    larguraDoFormulario: "larga",
    carregarAntesDeEditar: true,
    colunas: [
      { campo: "name", label: "Nome", formato: "codigo" },
      {
        campo: "payments",
        label: "Meios aceitos",
        formato: "numero",
        valor: (r) => (Array.isArray(r.payments) ? r.payments.length : 0),
      },
      { campo: "writeOffLimit", label: "Tolerância", formato: "dinheiro" },
      { campo: "disabled", label: "Situação", formato: "situacao", situacao: ativoOuInativo },
    ],
    formulario: [
      {
        campos: [
          empresa,
          {
            campo: "todosPodemAbrir",
            label: "Qualquer pessoa pode abrir turno",
            tipo: "booleano",
            padrao: true,
            ajuda:
              "Desmarque para escolher quem responde por este caixa. Marcado não deixa o turno" +
              " anônimo: quem abriu continua gravado.",
          },
          { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true, inteira: true },
          {
            campo: "operationNatureId",
            label: "Natureza da operação",
            tipo: "referencia",
            inteira: true,
            referencia: refNaturezaDaOperacao,
            ajuda:
              "As vendas deste caixa herdam esta natureza — é dela que sai o CFOP da NFC-e. Em" +
              " branco, a venda lança mas não vira nota.",
          },
          {
            campo: "employeeIds",
            label: "Responsáveis",
            tipo: "referencias",
            obrigatorio: true,
            inteira: true,
            referencia: refFuncionarioComAcesso,
            leDe: "employees",
            chaveDoId: "employeeId",
            visivel: (v) => v.todosPodemAbrir === false,
            ajuda:
              "Quem abre turno neste caixa sem permissão especial — o do turno da manhã e o da" +
              " tarde, por exemplo. Só aparece quem tem conta de acesso, porque responder pelo" +
              " caixa é operá-lo.",
          },
          {
            campo: "warehouseId",
            label: "Depósito de saída",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refDepositoAnalitico,
          },
          {
            campo: "priceListId",
            label: "Lista de preços",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refListaDeVenda,
          },
          {
            campo: "customerId",
            label: "Cliente padrão",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refCliente,
            ajuda: "O consumidor do varejo: quem a venda usa quando ninguém se identifica.",
          },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
      {
        titulo: "Fechamento",
        campos: [
          {
            campo: "changeAccountId",
            label: "Conta do troco",
            tipo: "referencia",
            referencia: refContaAnalitica,
          },
          {
            campo: "writeOffLimit",
            label: "Tolerância de contagem",
            tipo: "dinheiro",
            ajuda: "Diferença que o fechamento absorve sem virar pendência.",
          },
          {
            campo: "writeOffAccountId",
            label: "Conta da diferença",
            tipo: "referencia",
            referencia: refContaAnalitica,
            ajuda: "Para onde vai a quebra de caixa absorvida.",
          },
          {
            campo: "costCenterId",
            label: "Centro de custo",
            tipo: "referencia",
            referencia: refCentroDeCusto,
          },
        ],
      },
    ],
    linhas: [
      {
        campo: "payments",
        titulo: "Meios aceitos",
        rotuloNovo: "Novo meio",
        obrigatorio: true,
        colunas: [
          {
            campo: "paymentMethodId",
            label: "Meio de pagamento",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refMeioDePagamento,
          },
          {
            campo: "accountId",
            label: "Conta que recebe",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refContaDeDinheiro,
          },
          { campo: "isDefault", label: "Padrão", tipo: "booleano" },
        ],
      },
    ],
  },
];
