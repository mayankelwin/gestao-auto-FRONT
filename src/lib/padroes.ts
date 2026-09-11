import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { listar, type Registro } from "@/api/lista";
import { buscarUm } from "@/api/recurso";
import { useEmpresa } from "@/auth/empresa";

const CODIGO_DO_DEPOSITO_PRINCIPAL = "PRINCIPAL";
const CODIGO_DA_MOEDA = "BRL";
const TAMANHO = 100;

interface PadroesDaEmpresa {
  moedaId: number | null;
  metodoDeCusteio: string | null;
}

function idDe(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const bruto = typeof valor === "object" ? (valor as Registro).id : valor;
  const numero = Number(bruto);
  return Number.isFinite(numero) ? numero : null;
}

export const usePadroes = defineStore("padroes", () => {
  const moedaId = ref<number | null>(null);
  const depositoId = ref<number | null>(null);
  const metodoDeCusteio = ref<string | null>(null);
  const empresaCarregada = ref<number | null>(null);

  async function daEmpresa(empresaId: number): Promise<PadroesDaEmpresa> {
    try {
      const empresa = await buscarUm("/companies", empresaId);
      const metodo = String(empresa.valuationMethod ?? "") || null;

      const moeda = idDe(empresa.defaultCurrency ?? empresa.defaultCurrencyId);
      if (moeda !== null) return { moedaId: moeda, metodoDeCusteio: metodo };

      const pagina = await listar("/currencies", { page: 0, size: TAMANHO });
      const real = pagina.content.find((m) => String(m.code ?? "").toUpperCase() === CODIGO_DA_MOEDA);
      return { moedaId: idDe(real), metodoDeCusteio: metodo };
    } catch {
      return { moedaId: null, metodoDeCusteio: null };
    }
  }

  async function depositoDaEmpresa(empresaId: number): Promise<number | null> {
    try {
      const pagina = await listar("/warehouses", { page: 0, size: TAMANHO, companyId: empresaId });
      const analiticos = pagina.content.filter((d) => !d.group);

      const principal = analiticos.find(
        (d) => String(d.code ?? "").toUpperCase() === CODIGO_DO_DEPOSITO_PRINCIPAL,
      );
      if (principal) return idDe(principal);

      return analiticos.length === 1 ? idDe(analiticos[0]) : null;
    } catch {
      return null;
    }
  }

  async function carregar(): Promise<void> {
    const empresaId = useEmpresa().atualId;

    if (empresaId === null) {
      limpar();
      return;
    }

    if (empresaCarregada.value === empresaId) return;

    const [padroes, deposito] = await Promise.all([
      daEmpresa(empresaId),
      depositoDaEmpresa(empresaId),
    ]);

    moedaId.value = padroes.moedaId;
    metodoDeCusteio.value = padroes.metodoDeCusteio;
    depositoId.value = deposito;
    empresaCarregada.value = empresaId;
  }

  function limpar(): void {
    moedaId.value = null;
    depositoId.value = null;
    metodoDeCusteio.value = null;
    empresaCarregada.value = null;
  }

  watch(
    () => useEmpresa().atualId,
    () => void carregar(),
  );

  return { moedaId, depositoId, metodoDeCusteio, carregar, limpar };
});

export const padraoDeMoeda = (): number | null => usePadroes().moedaId;
export const padraoDeDeposito = (): number | null => usePadroes().depositoId;
export const padraoDeMetodoDeCusteio = (): string | null => usePadroes().metodoDeCusteio;
