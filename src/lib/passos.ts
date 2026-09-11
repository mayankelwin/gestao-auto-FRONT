import type { Formulario, LinhasDeFormulario, SecaoDeFormulario, Valores } from "./formulario";
import { validarFormulario, validarLinhas } from "./formulario";

/**
 * A partir de quantas seções o formulário deixa de rolar e passa a andar em passos.
 *
 * Duas seções cabem na altura de um modal sem barra de rolagem; a terceira é onde a pessoa começa
 * a arrastar sem saber onde termina. Passo em cadastro de três campos é pior que rolagem, e é por
 * isso que o corte mora aqui, num lugar só, e não espalhado como número mágico.
 */
export const SECOES_ATE_ROLAR = 2;

export interface Passo {
  titulo: string;
  /** Índice da seção no formulário; nulo no passo que só tem linhas filhas. */
  secao: number | null;
  /** Campos das linhas filhas que este passo mostra. */
  linhas: string[];
}

export function ehPorPassos(formulario: Formulario, linhas: LinhasDeFormulario[] = []): boolean {
  return formulario.length + (linhas.length > 0 ? 1 : 0) > SECOES_ATE_ROLAR;
}

/**
 * Os passos de um formulário: uma seção em cada, e as linhas filhas no último.
 *
 * A seção já é a unidade natural do passo — ela tem título e um conjunto de campos que pertencem
 * um ao outro. Linhas filhas ganham passo próprio porque uma tabela editável não divide espaço
 * com campos sem que os dois fiquem apertados.
 */
export function passosDe(formulario: Formulario, linhas: LinhasDeFormulario[] = []): Passo[] {
  const passos: Passo[] = formulario.map((secao, indice) => ({
    titulo: tituloDaSecao(secao, indice),
    secao: indice,
    linhas: [],
  }));

  if (linhas.length > 0) {
    passos.push({
      titulo: linhas.length === 1 ? (linhas[0].titulo ?? "Itens") : "Itens",
      secao: null,
      linhas: linhas.map((definicao) => definicao.campo),
    });
  }

  return passos;
}

function tituloDaSecao(secao: SecaoDeFormulario, indice: number): string {
  return secao.titulo ?? (indice === 0 ? "Identificação" : `Passo ${indice + 1}`);
}

/**
 * O que falta no passo, e só nele.
 *
 * Obrigatório do passo 1 não pode aparecer quando a pessoa chega no 3: cada saída de passo cobra
 * o que é dele. A validação reusa a do formulário inteiro, recortada — regra duplicada é regra
 * que diverge.
 */
export function validarPasso(
  passo: Passo,
  formulario: Formulario,
  linhas: LinhasDeFormulario[],
  valores: Valores,
  valoresDasLinhas: Record<string, Valores[]>,
): { campos: Record<string, string>; linhas: Record<string, string> } {
  const campos = passo.secao === null ? {} : validarFormulario([formulario[passo.secao]], valores);

  const definicoes = linhas.filter((definicao) => passo.linhas.includes(definicao.campo));

  return { campos, linhas: validarLinhas(definicoes, valoresDasLinhas) };
}

/** Em qual passo mora um campo — é para onde a tela salta quando o servidor recusa. */
export function passoDoCampo(passos: Passo[], formulario: Formulario, campo: string): number {
  return passos.findIndex(
    (passo) =>
      passo.secao !== null &&
      formulario[passo.secao].campos.some((definicao) => definicao.campo === campo),
  );
}

/**
 * Quais passos guardam algum campo recusado.
 *
 * A tela salta para o primeiro, mas o servidor recusa vários de uma vez e nem todos moram no
 * mesmo passo. Sem marcar a trilha, o que ficou para trás vira erro invisível — que é o mesmo
 * defeito do salto, só que espalhado.
 */
export function passosComErro(
  passos: Passo[],
  formulario: Formulario,
  campos: string[],
  linhas: string[] = [],
): Set<number> {
  const indices = new Set<number>();

  for (const campo of campos) {
    const indice = passoDoCampo(passos, formulario, campo);
    if (indice >= 0) indices.add(indice);
  }

  for (const campo of linhas) {
    const indice = passos.findIndex((passo) => passo.linhas.includes(campo));
    if (indice >= 0) indices.add(indice);
  }

  return indices;
}
