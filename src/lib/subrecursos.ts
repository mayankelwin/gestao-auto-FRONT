import type { Component } from "vue";
import type { Registro } from "@/api/lista";
import type { TenantRole } from "./navigation";
import type { Formulario } from "./formulario";
import { consultaDeCep } from "./cep";
import { MENSAGENS } from "./mensagens";
import type { BadgeTone } from "@/types";
import type { ColunaRecurso } from "./recursos/tipos";
import {
  OPCOES_PERFIL_TRIBUTARIO,
  OPCOES_REGIME_TRIBUTARIO,
  PERFIL_TRIBUTARIO,
  REGIME_TRIBUTARIO,
  RELACAO_DE_UF,
  opcoesDe,
  rotuloDe,
} from "./opcoes";
import {
  refCentroDeCusto,
  refCfop,
  refContaAnalitica,
  refDepositoAnalitico,
  refEmpresa,
  refFornecedor,
  refGrupoDeItem,
  refItem,
  refUnidade,
} from "./referencias";

export interface AbaDePainel {
  titulo: string;
  definicao?: SubRecursoDefinicao;
  componente?: Component;
  /** Componente que entra logo abaixo da tabela, na mesma aba. */
  abaixo?: Component;
  atalho?: AtalhoDeAba;
}

/**
 * Abre esta aba direto do menu da linha, sem passar pelo painel.
 *
 * O painel é o lugar certo para olhar um registro inteiro, e continua sendo. O atalho existe para
 * a aba que a pessoa procura repetidamente sabendo de antemão o que vai fazer — cadastrar variante
 * de um modelo é o caso —, onde abrir o painel e caçar a aba é trabalho que não decide nada. O
 * `disponivel` é o que impede o atalho de aparecer na linha em que ele não serviria para nada.
 */
export interface AtalhoDeAba {
  rotulo: string;
  icone?: Component;
  disponivel?: (registro: Registro) => boolean;
  motivo?: string;
}

export interface PainelDeRecurso {
  rotulo: string;
  icone?: Component;
  abas: AbaDePainel[];
}

export interface SubRecursoDefinicao {
  chave: string;
  titulo: string;
  singular: string;
  descricao: string;
  vazio: string;
  rotuloNovo: string;
  papeis: TenantRole[];
  lista: (registro: Registro) => string;
  criacao?: (registro: Registro) => string;
  item?: string;
  metodo?: "POST" | "PUT";
  consulta?: (registro: Registro) => Record<string, unknown>;
  corpo?: (registro: Registro) => Record<string, unknown>;
  colunas: ColunaRecurso[];
  formulario?: Formulario;
  chaveDoId?: string;
  /**
   * Combinacao que nao pode repetir entre as linhas do mesmo pai.
   *
   * O servidor e quem tem a palavra final, mas recusar so la devolve a pessoa ao formulario
   * depois de ela ter terminado de preencher. Aqui a recusa acontece no campo, antes do envio.
   */
  duplicado?: { campos: string[]; mensagem: string };
}

const OPCOES_TIPO_DE_ENDERECO = opcoesDe({
  BILLING: "Cobrança",
  SHIPPING: "Entrega",
  BOTH: "Cobrança e entrega",
});

const formularioDeEndereco: Formulario = [
  {
    campos: [
      {
        campo: "label",
        label: "Identificação",
        tipo: "texto",
        obrigatorio: true,
        placeholder: "Matriz",
      },
      {
        campo: "addressType",
        label: "Tipo",
        tipo: "opcoes",
        opcoes: OPCOES_TIPO_DE_ENDERECO,
        padrao: "BOTH",
      },
      { campo: "postalCode", label: "CEP", tipo: "cep", consulta: consultaDeCep },
      { campo: "street", label: "Logradouro", tipo: "texto", obrigatorio: true },
      { campo: "streetNumber", label: "Número", tipo: "texto" },
      { campo: "complement", label: "Complemento", tipo: "texto" },
      { campo: "district", label: "Bairro", tipo: "texto" },
      { campo: "city", label: "Cidade", tipo: "texto", obrigatorio: true },
      { campo: "stateCode", label: "UF", tipo: "uf", obrigatorio: true },
      { campo: "countryCode", label: "País", tipo: "pais", padrao: "BR" },
      { campo: "ibgeCityCode", label: "Código IBGE", tipo: "texto" },
      { campo: "primary", label: "Endereço principal", tipo: "booleano" },
    ],
  },
];

const formularioDeContato: Formulario = [
  {
    campos: [
      { campo: "name", label: "Nome", tipo: "texto", obrigatorio: true },
      { campo: "jobTitle", label: "Cargo", tipo: "texto" },
      { campo: "email", label: "E-mail", tipo: "email" },
      { campo: "phoneNumber", label: "Telefone", tipo: "telefone" },
      { campo: "mobileNumber", label: "Celular", tipo: "telefone" },
      { campo: "primary", label: "Contato principal", tipo: "booleano" },
      { campo: "notes", label: "Observações", tipo: "textoLongo", inteira: true },
    ],
  },
];

const colunasDeEndereco: ColunaRecurso[] = [
  { campo: "label", label: "Identificação" },
  { campo: "street", label: "Logradouro" },
  { campo: "city", label: "Cidade" },
  { campo: "stateCode", label: "UF" },
  { campo: "primary", label: "Principal", formato: "booleano" },
];

const colunasDeContato: ColunaRecurso[] = [
  { campo: "name", label: "Nome" },
  { campo: "jobTitle", label: "Cargo" },
  { campo: "email", label: "E-mail" },
  { campo: "phoneNumber", label: "Telefone" },
  { campo: "primary", label: "Principal", formato: "booleano" },
];

function contaDoParceiro(especie: "CUSTOMER" | "SUPPLIER"): SubRecursoDefinicao {
  return {
    chave: `conta-${especie}`,
    titulo: "Conta contábil",
    singular: "vínculo de conta",
    descricao: "Em que conta este parceiro lança, por empresa. Sem vínculo, vale a conta do grupo.",
    vazio: "Nenhuma conta configurada — o lançamento usa a do grupo.",
    rotuloNovo: "Configurar conta",
    papeis: ["CONTADOR"],
    lista: () => "/party-accounts",
    criacao: () => "/party-accounts",
    item: "/party-accounts",
    metodo: "PUT",
    consulta: (registro) => ({ partyType: especie, partyId: Number(registro.id) }),
    corpo: (registro) => ({ partyType: especie, partyId: Number(registro.id) }),
    colunas: [
      { campo: "companyName", label: "Empresa" },
      { campo: "accountNumber", label: "Conta", formato: "codigo" },
      { campo: "accountName", label: "Descrição" },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "companyId",
            label: "Empresa",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refEmpresa,
          },
          {
            campo: "accountId",
            label: "Conta",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refContaAnalitica,
          },
        ],
      },
    ],
  };
}

export const paineisDeCliente: SubRecursoDefinicao[] = [
  {
    chave: "enderecos-cliente",
    titulo: "Endereços",
    singular: "endereço",
    descricao: "Endereços de cobrança e de entrega deste cliente.",
    vazio: "Nenhum endereço cadastrado.",
    rotuloNovo: "Novo endereço",
    papeis: ["COMERCIAL"],
    lista: (r) => `/customers/${Number(r.id)}/addresses`,
    item: "/party-contacts/addresses",
    colunas: colunasDeEndereco,
    formulario: formularioDeEndereco,
  },
  {
    chave: "contatos-cliente",
    titulo: "Contatos",
    singular: "contato",
    descricao: "Pessoas de contato deste cliente.",
    vazio: "Nenhum contato cadastrado.",
    rotuloNovo: "Novo contato",
    papeis: ["COMERCIAL"],
    lista: (r) => `/customers/${Number(r.id)}/contacts`,
    item: "/party-contacts/contacts",
    colunas: colunasDeContato,
    formulario: formularioDeContato,
  },
  contaDoParceiro("CUSTOMER"),
];

export const paineisDeFornecedor: SubRecursoDefinicao[] = [
  {
    chave: "enderecos-fornecedor",
    titulo: "Endereços",
    singular: "endereço",
    descricao: "Endereços deste fornecedor.",
    vazio: "Nenhum endereço cadastrado.",
    rotuloNovo: "Novo endereço",
    papeis: ["COMERCIAL"],
    lista: (r) => `/suppliers/${Number(r.id)}/addresses`,
    item: "/party-contacts/addresses",
    colunas: colunasDeEndereco,
    formulario: formularioDeEndereco,
  },
  {
    chave: "contatos-fornecedor",
    titulo: "Contatos",
    singular: "contato",
    descricao: "Pessoas de contato deste fornecedor.",
    vazio: "Nenhum contato cadastrado.",
    rotuloNovo: "Novo contato",
    papeis: ["COMERCIAL"],
    lista: (r) => `/suppliers/${Number(r.id)}/contacts`,
    item: "/party-contacts/contacts",
    colunas: colunasDeContato,
    formulario: formularioDeContato,
  },
  contaDoParceiro("SUPPLIER"),
];

export const paineisDeItem: SubRecursoDefinicao[] = [
  {
    chave: "unidades-do-item",
    titulo: "Unidades alternativas",
    singular: "unidade alternativa",
    descricao: "Quantas unidades de estoque cabem em cada unidade alternativa deste item.",
    vazio: "Só a unidade de estoque.",
    rotuloNovo: "Nova unidade",
    papeis: ["COMERCIAL"],
    lista: (r) => `/items/${Number(r.id)}/uom-conversions`,
    criacao: (r) => `/items/${Number(r.id)}/uom-conversions`,
    item: "/items/uom-conversions",
    metodo: "PUT",
    colunas: [
      { campo: "uomName", label: "Unidade" },
      { campo: "factor", label: "Fator", formato: "numero" },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "uomId",
            label: "Unidade",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refUnidade,
          },
          {
            campo: "factor",
            label: "Fator",
            tipo: "decimal",
            obrigatorio: true,
            ajuda: "Quantas unidades de estoque cabem em uma desta unidade.",
          },
        ],
      },
    ],
  },
  {
    chave: "padroes-do-item",
    titulo: "Padrões por empresa",
    singular: "conjunto de padrões",
    descricao: "Depósito e contas que o sistema assume para este item em cada empresa.",
    vazio: "Nenhum padrão gravado — valem os do grupo.",
    rotuloNovo: "Novo padrão",
    papeis: ["COMERCIAL"],
    lista: (r) => `/items/${Number(r.id)}/defaults/configured`,
    criacao: () => "/items/defaults",
    item: "/items/defaults",
    metodo: "PUT",
    corpo: (r) => ({ itemId: Number(r.id) }),
    colunas: [
      { campo: "companyName", label: "Empresa" },
      { campo: "defaultWarehouseName", label: "Depósito" },
      { campo: "incomeAccountName", label: "Conta de receita" },
      { campo: "expenseAccountName", label: "Conta de despesa" },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "companyId",
            label: "Empresa",
            tipo: "referencia",
            obrigatorio: true,
            referencia: refEmpresa,
          },
          {
            campo: "itemGroupId",
            label: "Grupo (em vez do item)",
            tipo: "referencia",
            referencia: refGrupoDeItem,
            ajuda: "Deixe vazio para valer só para este item.",
          },
          {
            campo: "defaultWarehouseId",
            label: "Depósito padrão",
            tipo: "referencia",
            referencia: refDepositoAnalitico,
          },
          {
            campo: "incomeAccountId",
            label: "Conta de receita",
            tipo: "referencia",
            referencia: refContaAnalitica,
          },
          {
            campo: "expenseAccountId",
            label: "Conta de despesa",
            tipo: "referencia",
            referencia: refContaAnalitica,
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
  },
  {
    chave: "lotes-do-item",
    titulo: "Lotes",
    singular: "lote",
    descricao: "Lotes deste item, do que vence primeiro para o último.",
    vazio: "Nenhum lote cadastrado.",
    rotuloNovo: "Novo lote",
    papeis: ["OPERADOR"],
    lista: (r) => `/tracking/items/${Number(r.id)}/batches`,
    criacao: (r) => `/tracking/items/${Number(r.id)}/batches`,
    item: "/tracking/batches",
    colunas: [
      { campo: "code", label: "Lote", formato: "codigo" },
      { campo: "manufacturingDate", label: "Fabricação", formato: "data" },
      { campo: "expiryDate", label: "Validade", formato: "data" },
      { campo: "supplierBatchCode", label: "Lote do fornecedor" },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "code",
            label: "Referência",
            tipo: "texto",
            ajuda: "Gerada pelo sistema.",
            geradoPeloSistema: true,
          },
          { campo: "manufacturingDate", label: "Fabricação", tipo: "data" },
          {
            campo: "expiryDate",
            label: "Validade",
            tipo: "data",
            validar: (valor, valores) =>
              valores.manufacturingDate && String(valor) < String(valores.manufacturingDate)
                ? "A validade não pode ser anterior à fabricação."
                : null,
          },
          {
            campo: "supplierId",
            label: "Fornecedor",
            tipo: "referencia",
            referencia: refFornecedor,
          },
          { campo: "supplierBatchCode", label: "Lote do fornecedor", tipo: "texto" },
          { campo: "notes", label: "Observações", tipo: "textoLongo", inteira: true },
          { campo: "disabled", label: "Inativo", tipo: "booleano" },
        ],
      },
    ],
  },
];

export const precosDaLista: SubRecursoDefinicao = {
  chave: "precos-da-lista",
  titulo: "Preços",
  singular: "preço",
  descricao: "Os preços vigentes nesta lista. O mais específico ganha do mais geral.",
  vazio: "Nenhum preço nesta lista.",
  rotuloNovo: "Novo preço",
  papeis: ["COMERCIAL"],
  lista: () => "/item-prices/by-price-list",
  criacao: () => "/item-prices",
  item: "/item-prices",
  consulta: (r) => ({ priceListId: Number(r.id) }),
  corpo: (r) => ({ priceListId: Number(r.id) }),
  colunas: [
    { campo: "itemCode", label: "Item", formato: "codigo" },
    { campo: "rate", label: "Preço", formato: "dinheiro" },
    { campo: "validFrom", label: "Vale de", formato: "data" },
    { campo: "validUpto", label: "Vale até", formato: "data" },
  ],
  formulario: [
    {
      campos: [
        {
          campo: "itemId",
          label: "Item",
          tipo: "referencia",
          obrigatorio: true,
          referencia: refItem,
        },
        { campo: "rate", label: "Preço unitário", tipo: "dinheiro", obrigatorio: true },
        { campo: "uomId", label: "Unidade", tipo: "referencia", referencia: refUnidade },
        { campo: "validFrom", label: "Vale a partir de", tipo: "data" },
        { campo: "validUpto", label: "Vale até", tipo: "data" },
        { campo: "note", label: "Observação", tipo: "texto" },
      ],
    },
  ],
};

export const valoresDoEixo: SubRecursoDefinicao = {
  chave: "valores-do-eixo",
  titulo: "Valores",
  singular: "valor",
  descricao: "Os valores possíveis deste eixo — é deles que o similar é montado.",
  vazio: "Nenhum valor cadastrado.",
  rotuloNovo: "Novo valor",
  papeis: ["COMERCIAL"],
  lista: (r) => `/item-variants/attributes/${Number(r.id)}/values`,
  criacao: (r) => `/item-variants/attributes/${Number(r.id)}/values`,
  colunas: [
    { campo: "value", label: "Valor", formato: "codigo" },
    { campo: "abbreviation", label: "Abreviação" },
    { campo: "sortOrder", label: "Ordem", formato: "numero" },
  ],
  formulario: [
    {
      campos: [
        { campo: "value", label: "Valor", tipo: "texto", obrigatorio: true },
        { campo: "abbreviation", label: "Abreviação", tipo: "texto" },
        { campo: "sortOrder", label: "Ordem", tipo: "inteiro" },
      ],
    },
  ],
};

/**
 * As regras de uma natureza de operacao.
 *
 * Uma natureza sozinha nao resolve nada: "Venda de mercadoria" nao diz qual CFOP sai. Quem diz e a
 * REGRA, e ela e cadastrada por combinacao -- relacao de UF x regime. Vender dentro do estado e
 * vender para fora sao CFOP diferentes, e a mesma natureza cobre os dois.
 *
 * Relacao de UF e regime em branco significam "vale para qualquer um". E a regra mais especifica
 * que ganha, entao um padrao geral convive com a excecao sem precisar cobrir todas as combinacoes.
 */
export const paineisDeNaturezaDeOperacao: SubRecursoDefinicao[] = [
  {
    chave: "regras-natureza",
    titulo: "Regras",
    singular: "regra",
    descricao:
      "O CFOP, o perfil e a alíquota que valem para cada combinação de relação de UF e regime." +
      " Em branco, a regra vale para qualquer um — e a mais específica ganha.",
    vazio: "Nenhuma regra cadastrada. Sem pelo menos uma, esta natureza não resolve CFOP nenhum.",
    rotuloNovo: "Nova regra",
    papeis: ["TENANT_ADMIN"],
    lista: (r) => `/operation-natures/${Number(r.id)}/rules`,
    item: "/operation-natures/rules",
    duplicado: {
      campos: ["cfop"],
      mensagem: MENSAGENS["cfop-duplicado"].texto,
    },
    colunas: [
      { campo: "cfop", label: "CFOP", formato: "codigo" },
      {
        campo: "ufScope",
        label: "Relação de UF",
        valor: (r) => rotuloDe(RELACAO_DE_UF, r.ufScope),
      },
      {
        campo: "regime",
        label: "Regime",
        valor: (r) => (r.regime ? rotuloDe(REGIME_TRIBUTARIO, r.regime) : "Qualquer"),
      },
      {
        campo: "taxProfile",
        label: "Perfil",
        valor: (r) => rotuloDe(PERFIL_TRIBUTARIO, r.taxProfile),
      },
      { campo: "icmsRate", label: "ICMS %", formato: "numero" },
      {
        campo: "complete",
        label: "Situação",
        formato: "situacao",
        situacao: (r) =>
          r.complete === false
            ? { texto: "Falta alíquota", tom: "warning" as BadgeTone }
            : { texto: "Pronta", tom: "success" as BadgeTone },
      },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "cfop",
            label: "CFOP",
            tipo: "referenciaTexto",
            referencia: refCfop,
            obrigatorio: true,
            inteira: true,
            ajuda:
              "O código da tabela publicada. É o primeiro dígito dele que diz se a regra vale" +
              " dentro do estado, entre estados ou com o exterior.",
          },
          {
            campo: "taxProfile",
            label: "Perfil tributário",
            tipo: "opcoes",
            obrigatorio: true,
            opcoes: OPCOES_PERFIL_TRIBUTARIO,
          },
          {
            campo: "regime",
            label: "Regime",
            tipo: "opcoes",
            opcoes: OPCOES_REGIME_TRIBUTARIO,
            ajuda: "Em branco, vale para qualquer regime.",
          },
          {
            campo: "icmsRate",
            label: "Alíquota de ICMS (%)",
            tipo: "decimal",
            min: 0,
            max: 100,
            ajuda:
              "Só o perfil tributado normalmente a exige. Sem padrão de propósito: errada, gera" +
              " nota autorizada com imposto errado.",
          },
        ],
      },
    ],
  },
];
