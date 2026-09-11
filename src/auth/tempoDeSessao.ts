import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { autenticacaoDesligada, ESCOPO, obterKeycloak } from "./keycloak";
import { descarregarRascunhos } from "@/lib/rascunhos";

const AVISO_SEGUNDOS = 120;
const RENOVA_ANTES_DE_SEGUNDOS = 300;
const BATIDA_MS = 1000;
const ESPERA_ENTRE_RENOVACOES_MS = 30000;

export const useTempoDeSessao = defineStore("tempoDeSessao", () => {
  const restantes = ref<number | null>(null);
  const renovando = ref(false);

  let relogio: ReturnType<typeof setInterval> | undefined;
  let ultimaRenovacao = 0;

  function segundosAteExpirar(): number | null {
    const keycloak = obterKeycloak();
    const expiracao = keycloak.refreshTokenParsed?.exp ?? keycloak.tokenParsed?.exp;
    if (!expiracao) return null;

    return Math.round(expiracao - Date.now() / 1000 + (keycloak.timeSkew ?? 0));
  }

  function encerrar(): void {
    clearInterval(relogio);
    descarregarRascunhos();

    void obterKeycloak().login({
      scope: ESCOPO,
      redirectUri: window.location.href,
    });
  }

  async function continuar(): Promise<void> {
    if (renovando.value) return;

    renovando.value = true;
    ultimaRenovacao = Date.now();

    try {
      await obterKeycloak().updateToken(-1);
      restantes.value = segundosAteExpirar();
    } catch {
      encerrar();
    } finally {
      renovando.value = false;
    }
  }

  function medir(): void {
    const segundos = segundosAteExpirar();
    restantes.value = segundos;

    if (segundos !== null && segundos <= 0) encerrar();
  }

  function aoUsar(): void {
    if (Date.now() - ultimaRenovacao < ESPERA_ENTRE_RENOVACOES_MS) return;

    const segundos = restantes.value;
    if (segundos === null || segundos > RENOVA_ANTES_DE_SEGUNDOS) return;

    void continuar();
  }

  function iniciar(): void {
    if (autenticacaoDesligada) return;

    medir();
    relogio = setInterval(medir, BATIDA_MS);

    window.addEventListener("pointerdown", aoUsar, { passive: true });
    window.addEventListener("keydown", aoUsar, { passive: true });
  }

  const avisando = computed(
    () => restantes.value !== null && restantes.value > 0 && restantes.value <= AVISO_SEGUNDOS,
  );

  const contagem = computed(() => {
    const segundos = Math.max(restantes.value ?? 0, 0);
    const minutos = Math.floor(segundos / 60);
    return `${minutos}:${String(segundos % 60).padStart(2, "0")}`;
  });

  return { restantes, renovando, avisando, contagem, iniciar, continuar };
});
