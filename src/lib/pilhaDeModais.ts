let proximo = 0;
const pilha: number[] = [];

export function empilhar(): number {
  const id = ++proximo;
  pilha.push(id);
  document.body.style.overflow = "hidden";
  return id;
}

export function desempilhar(id: number): void {
  const posicao = pilha.indexOf(id);
  if (posicao !== -1) pilha.splice(posicao, 1);
  if (pilha.length === 0) document.body.style.overflow = "";
}

export function noTopo(id: number): boolean {
  return pilha[pilha.length - 1] === id;
}
