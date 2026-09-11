const CHAVE = "gs.boas-vindas";

function jaSaudados(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Saúda uma vez por pessoa, e não uma vez por navegador: quem divide a máquina não herda a
 * saudação de quem entrou antes. Sem localStorage, ninguém é saudado — repetir a cada carga
 * seria pior que não saudar.
 */
export function saudarSePrimeiroAcesso(identidade: string, saudar: () => void): void {
  if (!identidade) return;

  const anteriores = jaSaudados();
  if (anteriores.includes(identidade)) return;

  try {
    localStorage.setItem(CHAVE, JSON.stringify([...anteriores, identidade]));
  } catch {
    return;
  }

  saudar();
}
