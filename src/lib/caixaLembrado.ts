const CHAVE = "gs.pdv.caixa";

function chaveDa(empresaId: number): string {
  return `${CHAVE}.${empresaId}`;
}

export function lerCaixa(empresaId: number): number | null {
  try {
    const bruto = localStorage.getItem(chaveDa(empresaId));
    if (!bruto) return null;
    const id = Number(bruto);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function gravarCaixa(empresaId: number, id: number): void {
  try {
    localStorage.setItem(chaveDa(empresaId), String(id));
  } catch {
    return;
  }
}
