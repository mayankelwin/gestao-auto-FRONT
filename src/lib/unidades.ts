import type { SugestaoDaEscolha } from "./formulario";

export interface UnidadeDoCliente {
  id: unknown;
  nome: string;
  unidadeFiscal: string;
  fator: number | null;
}

export interface UnidadeFiscal {
  codigo: string;
  base: string;
}

const mesmaGrandeza = (uma: string, outra: string, fiscais: UnidadeFiscal[]): boolean => {
  const base = (codigo: string) => fiscais.find((f) => f.codigo === codigo)?.base;
  const daUma = base(uma);
  const daOutra = base(outra);
  return daUma !== undefined && daUma === daOutra;
};

/**
 * A unidade do item passa a ser a do NCM, e a pessoa fica sabendo.
 *
 * O NCM diz em que unidade a Receita mede aquela mercadoria. Até 05/09/2026 a tela só sugeria com o
 * campo vazio, para não atropelar escolha — e o resultado foi o oposto do pretendido: quem escolheu
 * a unidade errada no passo 1, que é o erro comum, seguia com ela até o fim sem nada dizer nada.
 *
 * Agora troca, e anuncia a troca com um desfazer à mão. Trocar calado seria pior que não trocar: a
 * unidade de estoque é a régua do depósito, e mudá-la sem avisar mudaria a contagem de quem já
 * sabia o que queria.
 *
 * A mensagem separa os dois casos porque a saída é diferente. Grandezas iguais convertem — grama e
 * quilo —, então desfazer é escolha legítima de quem conta assim. Grandezas diferentes não
 * convertem, e aí o cadastro seria recusado pela API: desfazer só resolve se o errado for o NCM.
 */
export function trocaDeUnidadePeloNcm(
  tributavel: string,
  atualId: unknown,
  unidades: UnidadeDoCliente[],
  fiscais: UnidadeFiscal[],
): SugestaoDaEscolha {
  const candidatas = unidades.filter((u) => u.unidadeFiscal === tributavel);
  const melhor = candidatas.find((u) => u.fator === 1) ?? candidatas[0];

  if (!melhor) return { valores: {} };

  const vazia = atualId === null || atualId === undefined || atualId === "";
  if (vazia) return { valores: { stockUomId: melhor.id } };

  const atual = unidades.find((u) => String(u.id) === String(atualId));
  if (!atual || atual.unidadeFiscal === tributavel) return { valores: {} };

  const converte = mesmaGrandeza(atual.unidadeFiscal, tributavel, fiscais);

  const mensagem = converte
    ? `A nota mede este produto em ${melhor.nome}, e o item estava em ${atual.nome}. Trocamos para`
      + ` ${melhor.nome}. Se é em ${atual.nome} que você conta no depósito, é só desfazer.`
    : `A nota mede este produto em ${melhor.nome}, e o item estava em ${atual.nome}. Trocamos para`
      + ` ${melhor.nome}: as duas não se convertem, e em ${atual.nome} a nota não sairia. Se`
      + ` ${atual.nome} estava certo, então o NCM é que precisa mudar.`;

  return {
    valores: { stockUomId: melhor.id },
    anuncio: {
      titulo: "A unidade de medida mudou",
      mensagem,
      desfazer: { stockUomId: atualId },
    },
  };
}
