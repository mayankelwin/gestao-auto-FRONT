import { useEmpresa } from "@/auth/empresa";
import { padraoDeDeposito, padraoDeMoeda } from "./padroes";
import { listar } from "@/api/lista";
import type { LinhaDePrevia, ReferenciaDeCampo } from "./formulario";
import { trocaDeUnidadePeloNcm } from "./unidades";

const texto = (valor: unknown): string =>
  valor === null || valor === undefined ? "" : String(valor);

const codigoENome = (codigo: unknown, nome: unknown): string => {
  const c = texto(codigo);
  const n = texto(nome);
  return c && n ? `${c} — ${n}` : c || n;
};

export const empresaAtual = (): number | null => useEmpresa().atualId;

export const refEmpresa: ReferenciaDeCampo = {
  endpoint: "/companies",
  rotulo: (r) => codigoENome(r.abbreviation, r.name),
  padrao: empresaAtual,
};

export const refItem: ReferenciaDeCampo = {
  endpoint: "/items",
  busca: true,
  rotulo: (r) => codigoENome(r.code, r.name),
};

export const refItemModelo: ReferenciaDeCampo = {
  ...refItem,
  filtro: (r) => Boolean(r.template),
};

export const refGrupoDeItem: ReferenciaDeCampo = {
  endpoint: "/item-groups",
  rotulo: (r) => texto(r.name),
};

const semTracos = (valor: string): string => valor.replace(/^[\s-]+/, "");

/** A tabela impressa termina degrau em ":" e folha em "."; nenhum dos dois diz nada numa lista. */
const semPontuacao = (valor: string): string =>
  semTracos(valor)
    .replace(/[.:;]+$/, "")
    .trim();

const degrausDoNcm = (valor: unknown): string[] =>
  texto(valor)
    .split("›")
    .flatMap((degrau) => degrau.split(">"))
    .map((degrau) => semPontuacao(degrau))
    .filter(Boolean);

const caminhoDoNcm = (valor: unknown): string => degrausDoNcm(valor).join(" › ");

export const refNcm: ReferenciaDeCampo = {
  endpoint: "/ncm",
  busca: true,
  chave: "code",
  parametroDaChave: "code",
  rotulo: (r) =>
    codigoENome(texto(r.formattedCode) || texto(r.code), semPontuacao(texto(r.description))),

  /**
   * O código é lido por comparação de prefixo, então vai em fonte tabular e à parte; a unidade
   * tributável vira etiqueta, porque é ela que muda a quantidade da nota.
   */
  linha: (r) => ({
    prefixo: texto(r.formattedCode) || texto(r.code),
    titulo: semPontuacao(texto(r.description)),
    etiqueta: texto(r.fiscalUnit) || undefined,
  }),

  /**
   * A posição de quatro dígitos agrupa. O caminho aparece no cabeçalho e some das linhas: numa
   * tabela onde um terço das folhas se chama "Outros", é o caminho repetido que suja a lista.
   */
  grupo: (r) => {
    const codigo = texto(r.code);
    if (codigo.length < 4) return null;

    const degraus = degrausDoNcm(r.path);
    const titulo = degraus[1] ?? degraus[degraus.length - 1];
    if (!titulo) return null;

    return {
      chave: codigo.slice(0, 4),
      prefixo: `${codigo.slice(0, 2)}.${codigo.slice(2, 4)}`,
      titulo,
    };
  },
  /**
   * Escolher o NCM põe o item na unidade em que a Receita mede aquela mercadoria.
   *
   * Campo vazio é preenchido calado; campo já escolhido é trocado com aviso e desfazer. O porquê
   * dos dois casos, e da troca ter substituído a sugestão, está em {@link trocaDeUnidadePeloNcm}.
   */
  aoEscolher: async (r, valores) => {
    const tributavel = texto(r.fiscalUnit);
    if (!tributavel) return { valores: {} };

    const [doCliente, fiscais] = await Promise.all([
      listar("/uoms", { page: 0, size: 200 }),
      listar("/fiscal-units", { page: 0, size: 200 }),
    ]);

    const unidades = doCliente.content
      .filter((uom) => uom.enabled !== false)
      .map((uom) => ({
        id: uom.id,
        nome: texto(uom.name),
        unidadeFiscal: texto(uom.fiscalUnitCode),
        fator:
          uom.fiscalFactor === null || uom.fiscalFactor === undefined
            ? null
            : Number(uom.fiscalFactor),
      }));

    return trocaDeUnidadePeloNcm(
      tributavel,
      valores.stockUomId,
      unidades,
      fiscais.content.map((f) => ({ codigo: texto(f.code), base: texto(f.baseCode) })),
    );
  },

  previa: (r) => {
    const unidade = texto(r.fiscalUnit);
    const linhas: LinhaDePrevia[] = [
      { rotulo: "Código", valor: texto(r.formattedCode) || texto(r.code) },
      { rotulo: "Descrição", valor: semPontuacao(texto(r.description)) },
    ];

    const caminho = caminhoDoNcm(r.path);
    if (caminho) linhas.push({ rotulo: "Classificação", valor: caminho });

    linhas.push({
      rotulo: "Tributado em",
      valor: unidade || "sem unidade publicada nesta data",
      destaque: true,
    });

    const fonte = texto(r.legalSource);
    if (fonte) linhas.push({ rotulo: "Fonte", valor: fonte });

    return linhas;
  },
};

const SENTIDO_DO_CFOP: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
};

const AMBITO_DO_CFOP: Record<string, string> = {
  INTERNA: "Dentro do estado",
  INTERESTADUAL: "Entre estados",
  EXTERIOR: "Com o exterior",
};

/**
 * O CFOP não é texto livre: é a tabela publicada, e o primeiro dígito já diz o sentido da operação
 * e a relação de UF. Quem cadastra a regra escolhe pelo título — decorar quatro dígitos é o que
 * fazia a regra nascer com o código de outra operação.
 */
export const refCfop: ReferenciaDeCampo = {
  endpoint: "/cfops",
  busca: true,
  chave: "code",
  parametroDaChave: "code",
  rotulo: (r) => codigoENome(r.code, r.title),

  linha: (r) => ({
    prefixo: texto(r.code),
    titulo: semPontuacao(texto(r.title)),
    etiqueta: r.devolucao ? "devolução" : undefined,
  }),

  /** O primeiro dígito agrupa: é ele que separa entrada de saída e interna de interestadual. */
  grupo: (r) => {
    const ambito = AMBITO_DO_CFOP[texto(r.ufScope)];
    const sentido = SENTIDO_DO_CFOP[texto(r.direction)];
    if (!ambito || !sentido) return null;

    return {
      chave: texto(r.code).slice(0, 1),
      prefixo: texto(r.code).slice(0, 1),
      titulo: `${sentido} — ${ambito}`,
    };
  },

  previa: (r) => {
    const linhas: LinhaDePrevia[] = [
      { rotulo: "Código", valor: texto(r.code) },
      { rotulo: "Título", valor: semPontuacao(texto(r.title)) },
      {
        rotulo: "Vale para",
        valor: `${SENTIDO_DO_CFOP[texto(r.direction)] ?? ""} — ${
          AMBITO_DO_CFOP[texto(r.ufScope)] ?? ""
        }`,
        destaque: true,
      },
    ];

    if (r.devolucao) linhas.push({ rotulo: "Devolução", valor: "sim, é código de devolução" });
    if (r.nfe === false) linhas.push({ rotulo: "NF-e", valor: "não vale para NF-e" });

    const nota = semPontuacao(texto(r.description));
    if (nota) linhas.push({ rotulo: "Nota explicativa", valor: nota });

    return linhas;
  },
};

export const refUnidadeTributavel: ReferenciaDeCampo = {
  endpoint: "/fiscal-units",
  chave: "code",
  parametroDaChave: "code",
  rotulo: (r) => codigoENome(r.code, r.description),
};

export const refUnidade: ReferenciaDeCampo = {
  endpoint: "/uoms",
  rotulo: (r) => codigoENome(r.symbol, r.name),
};

export const refCategoriaDeUnidade: ReferenciaDeCampo = {
  endpoint: "/uom-categories",
  rotulo: (r) => texto(r.name),
};

export const refDeposito: ReferenciaDeCampo = {
  endpoint: "/warehouses",
  rotulo: (r) => codigoENome(r.code, r.name),
  padrao: padraoDeDeposito,
};

export const refDepositoAnalitico: ReferenciaDeCampo = {
  ...refDeposito,
  filtro: (r) => !r.group,
};

export const refCliente: ReferenciaDeCampo = {
  endpoint: "/customers",
  busca: true,
  rotulo: (r) => texto(r.name),
};

export const refFornecedor: ReferenciaDeCampo = {
  endpoint: "/suppliers",
  busca: true,
  rotulo: (r) => texto(r.name),
};

export const refGrupoDeCliente: ReferenciaDeCampo = {
  endpoint: "/party-groups/customers",
  rotulo: (r) => texto(r.name),
};

export const refGrupoDeFornecedor: ReferenciaDeCampo = {
  endpoint: "/party-groups/suppliers",
  rotulo: (r) => texto(r.name),
};

export const refConta: ReferenciaDeCampo = {
  endpoint: "/accounts",
  rotulo: (r) => codigoENome(r.accountNumber, r.name),
};

export const refContaAnalitica: ReferenciaDeCampo = {
  ...refConta,
  filtro: (r) => !r.group,
};

export const refContaDeDinheiro: ReferenciaDeCampo = {
  ...refConta,
  filtro: (r) => !r.group && (r.accountType === "BANK" || r.accountType === "CASH"),
};

export const refCentroDeCusto: ReferenciaDeCampo = {
  endpoint: "/cost-centers",
  rotulo: (r) => codigoENome(r.costCenterNumber, r.name),
};

export const refMoeda: ReferenciaDeCampo = {
  endpoint: "/currencies",
  rotulo: (r) => codigoENome(r.code, r.name),
  padrao: padraoDeMoeda,
};

export const refCondicaoDePagamento: ReferenciaDeCampo = {
  endpoint: "/payment-terms",
  rotulo: (r) => texto(r.name),
};

export const refExercicio: ReferenciaDeCampo = {
  endpoint: "/fiscal-years",
  rotulo: (r) => texto(r.name),
};

export const refMeioDePagamento: ReferenciaDeCampo = {
  endpoint: "/payment-methods",
  rotulo: (r) => texto(r.name),
  filtro: (r) => r.enabled !== false,
};

export const refContaBancaria: ReferenciaDeCampo = {
  endpoint: "/bank-accounts",
  rotulo: (r) => codigoENome(r.name, r.bankName),
  filtro: (r) => !r.disabled,
};

export const refListaDePrecos: ReferenciaDeCampo = {
  endpoint: "/price-lists",
  rotulo: (r) => codigoENome(r.name, r.currencyCode),
  filtro: (r) => r.enabled !== false,
};

export const refListaDeVenda: ReferenciaDeCampo = {
  ...refListaDePrecos,
  filtro: (r) => r.enabled !== false && Boolean(r.selling),
};

export const refPerfilDeCaixa: ReferenciaDeCampo = {
  endpoint: "/pos-profiles",
  rotulo: (r) => texto(r.name),
  filtro: (r) => !r.disabled,
};

/**
 * As naturezas de operacao ativas.
 *
 * E de onde saem CFOP, perfil tributario e aliquota -- a fatura aponta para uma, e a emissao
 * resolve o resto a partir dela cruzando com a UF do destino e o regime da empresa.
 */
export const refNaturezaDaOperacao: ReferenciaDeCampo = {
  endpoint: "/operation-natures",
  rotulo: (r) => codigoENome(r.code, r.name),
  filtro: (r) => r.enabled !== false,

  /** O código é gerado (`NAT-0001`) e não diz o que é: quem escolhe lê a descrição embaixo. */
  linha: (r) => ({
    prefixo: texto(r.code),
    titulo: texto(r.name),
    etiqueta: r.direction === "ENTRADA" ? "entrada" : undefined,
  }),
};

export const refFuncionario: ReferenciaDeCampo = {
  // O recurso e /hr/employees, e nao /employees. Isto apontava para um caminho que nunca existiu:
  // ate 07/09/2026 nao havia cadastro de funcionario nenhum, e quando ele nasceu foi sob /hr, ao
  // lado de /hr/users. Enquanto isso a referencia devolvia 404 em silencio, e o combo aparecia
  // vazio como se nao houvesse funcionario cadastrado.
  //
  // O nome e `fullName`, e nao `name`: aqui a ficha e de uma PESSOA, e o resto do cadastro usa
  // `name` para coisas que tem um nome so. O rotulo lia `name` e `employeeNumber`, que nao existem
  // em lado nenhum -- o combo listaria os funcionarios com o nome em branco, que e o mesmo defeito
  // do 404 com outra cara: parece cadastro vazio, e e leitura do campo errado.
  endpoint: "/hr/employees",
  busca: true,
  rotulo: (r) => codigoENome(r.code, r.fullName),
};

/**
 * Funcionarios que tem conta de acesso.
 *
 * A ficha aceita quem nunca entra no sistema -- o tratorista, que no agro e a maior parte da
 * folha. Ha campos em que isso nao serve: responder pelo caixa e OPERAR o caixa, e quem nao tem
 * login nao abre turno, nao vende e nao fecha.
 *
 * O recorte vai no servidor (`withAccount`), e nao num `filtro` local, porque filtrar a pagina que
 * voltou devolveria menos itens do que o tamanho pedido sem como buscar o resto: a pessoa
 * procuraria alguem que existe e nao acharia.
 */
export const refFuncionarioComAcesso: ReferenciaDeCampo = {
  ...refFuncionario,
  parametros: { withAccount: true },
};
