const DURACAO_DO_FADE = 350;

let escondido = false;

/**
 * Retira o splash estático declarado no index.html.
 * Idempotente: pode ser chamado tanto no caminho feliz quanto no de falha.
 */
export function esconderSplash(): void {
  if (escondido) return;
  escondido = true;

  const splash = document.getElementById("splash");
  if (!splash) return;

  splash.setAttribute("data-saindo", "");
  window.setTimeout(() => splash.remove(), DURACAO_DO_FADE);
}
