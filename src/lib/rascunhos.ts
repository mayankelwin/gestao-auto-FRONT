import type { Valores } from "./formulario";

const PREFIXO = "gs.rascunho.";
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const ESPERA_MS = 600;

export interface Rascunho {
  valores: Valores;
  linhas: Record<string, Valores[]>;
  /** Em que passo a pessoa parou; ausente nos rascunhos gravados antes dos passos. */
  passo?: number;
  em: number;
}

let dono = "anonimo";

const pendentes = new Map<string, Rascunho>();
let temporizador: ReturnType<typeof setTimeout> | undefined;

export function definirDonoDosRascunhos(chave: string): void {
  dono = chave || "anonimo";
}

export function chaveDeRascunho(endpoint: string, id: unknown): string {
  return `${PREFIXO}${dono}|${endpoint}|${id === null || id === undefined ? "novo" : String(id)}`;
}

export function lerRascunho(chave: string): Rascunho | null {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;

    const rascunho = JSON.parse(bruto) as Rascunho;
    if (!rascunho || typeof rascunho !== "object" || !rascunho.valores) return null;

    if (Date.now() - Number(rascunho.em ?? 0) > VALIDADE_MS) {
      localStorage.removeItem(chave);
      return null;
    }

    return rascunho;
  } catch {
    return null;
  }
}

export function agendarRascunho(chave: string, rascunho: Rascunho): void {
  pendentes.set(chave, rascunho);

  clearTimeout(temporizador);
  temporizador = setTimeout(descarregarRascunhos, ESPERA_MS);
}

export function descarregarRascunhos(): void {
  clearTimeout(temporizador);
  temporizador = undefined;

  for (const [chave, rascunho] of pendentes) {
    try {
      localStorage.setItem(chave, JSON.stringify(rascunho));
    } catch {
      break;
    }
  }

  pendentes.clear();
}

export function descartarRascunho(chave: string): void {
  pendentes.delete(chave);
  try {
    localStorage.removeItem(chave);
  } catch {
    return;
  }
}

export function limparRascunhosVencidos(): void {
  try {
    const vencidos: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const chave = localStorage.key(i);
      if (!chave || !chave.startsWith(PREFIXO)) continue;

      const bruto = localStorage.getItem(chave);
      if (!bruto) continue;

      try {
        const rascunho = JSON.parse(bruto) as Rascunho;
        if (Date.now() - Number(rascunho.em ?? 0) > VALIDADE_MS) vencidos.push(chave);
      } catch {
        vencidos.push(chave);
      }
    }

    for (const chave of vencidos) localStorage.removeItem(chave);
  } catch {
    return;
  }
}

export function vigiarSaidaDaPagina(): void {
  window.addEventListener("pagehide", descarregarRascunhos);
  window.addEventListener("beforeunload", descarregarRascunhos);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") descarregarRascunhos();
  });
}
