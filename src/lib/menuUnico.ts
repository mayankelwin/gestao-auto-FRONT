import { ref } from "vue";

const aberto = ref(0);
let proximo = 0;

export function registrarMenu(): number {
  return ++proximo;
}

export function abrirMenu(id: number): void {
  aberto.value = id;
}

export function fecharMenu(id: number): void {
  if (aberto.value === id) aberto.value = 0;
}

export function menuEstaAberto(id: number): boolean {
  return aberto.value === id;
}
