import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { listar, type Registro } from "@/api/lista";

const CHAVE = "gs.empresa.atual";

export const EXIGE_EMPRESA =
  "Esta tela precisa de uma empresa selecionada, e nenhuma foi encontrada neste cliente.";

export interface Empresa {
  id: number;
  name: string;
  abbreviation?: string;
}

function ler(): number | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? Number(bruto) : null;
  } catch {
    return null;
  }
}

function gravar(id: number | null): void {
  try {
    if (id === null) localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, String(id));
  } catch {
    return;
  }
}

export const useEmpresa = defineStore("empresa", () => {
  const empresas = ref<Empresa[]>([]);
  const atualId = ref<number | null>(null);
  const carregando = ref(false);
  const erro = ref<string | null>(null);

  async function carregar(): Promise<void> {
    carregando.value = true;
    erro.value = null;

    try {
      const pagina = await listar("/companies", { page: 0, size: 100 });
      empresas.value = (pagina.content as Registro[])
        .map((c) => ({
          id: Number(c.id),
          name: String(c.name ?? ""),
          abbreviation: c.abbreviation ? String(c.abbreviation) : undefined,
        }))
        .filter((c) => Number.isFinite(c.id));

      const salvo = ler();
      const valido = salvo !== null && empresas.value.some((c) => c.id === salvo);
      atualId.value = valido ? salvo : (empresas.value[0]?.id ?? null);
      gravar(atualId.value);
    } catch (e) {
      erro.value = e instanceof Error ? e.message : String(e);
      empresas.value = [];
      atualId.value = null;
    } finally {
      carregando.value = false;
    }
  }

  function limpar(): void {
    empresas.value = [];
    atualId.value = null;
    gravar(null);
  }

  function selecionar(id: number): void {
    if (!empresas.value.some((c) => c.id === id)) return;
    gravar(id);
    atualId.value = id;
  }

  const atual = computed(() => empresas.value.find((c) => c.id === atualId.value) ?? null);

  const rotulo = computed(() => {
    const c = atual.value;
    if (!c) return null;
    return c.abbreviation ? `${c.name} · ${c.abbreviation}` : c.name;
  });

  const podeTrocar = computed(() => empresas.value.length > 1);

  return { empresas, atualId, atual, rotulo, podeTrocar, carregando, erro, carregar, limpar, selecionar };
});
