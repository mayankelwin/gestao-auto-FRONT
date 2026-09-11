import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";

import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";

import "./style.css";
import App from "./App.vue";
import { router } from "./router";
import { iniciarAutenticacao } from "./auth/keycloak";
import { useSessao } from "./auth/sessao";
import { useTenant } from "./auth/tenant";
import { useEmpresa } from "./auth/empresa";
import { useTempoDeSessao } from "./auth/tempoDeSessao";
import { usePadroes } from "./lib/padroes";
import { esconderSplash } from "./lib/splash";
import { saudarSePrimeiroAcesso } from "./lib/boasVindas";
import { useAvisos } from "./lib/avisos";
import {
  definirDonoDosRascunhos,
  limparRascunhosVencidos,
  vigiarSaidaDaPagina,
} from "./lib/rascunhos";

function mostrarFalha(erro: unknown): void {
  esconderSplash();

  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const alvo = document.getElementById("app");
  if (!alvo) return;

  const origem = window.location.origin;
  const keycloak = import.meta.env.VITE_KEYCLOAK_URL ?? "(VITE_KEYCLOAK_URL não definida)";
  const realm = import.meta.env.VITE_KEYCLOAK_REALM ?? "(VITE_KEYCLOAK_REALM não definida)";
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "(VITE_KEYCLOAK_CLIENT_ID não definida)";

  const pareceRede = /NetworkError|Failed to fetch|load failed/i.test(mensagem);
  const dica = pareceRede
    ? `O navegador bloqueou a chamada ao Keycloak. A causa mais comum é a origem
       <b>${origem}</b> não estar em <i>Web origins</i> do client <b>${clientId}</b> —
       <code>localhost</code> e <code>127.0.0.1</code> contam como origens diferentes.`
    : `Confira o <code>.env</code> (modelo em <code>.env.example</code>) e se o client existe no realm.`;

  alvo.innerHTML = `
    <div style="display:flex;height:100%;align-items:center;justify-content:center;padding:2rem">
      <div style="max-width:36rem;font-family:system-ui,sans-serif;color:#0b1d33">
        <h1 style="font-size:1.25rem;font-weight:600;margin:0 0 .5rem">Não foi possível iniciar</h1>
        <p style="color:#566068;margin:0 0 1rem;line-height:1.5">${mensagem}</p>
        <p style="color:#566068;margin:0 0 1rem;line-height:1.6;font-size:.875rem">${dica}</p>
        <dl style="margin:0;color:#8a9199;font-size:.8125rem;line-height:1.7">
          <div>origem desta página: <code>${origem}</code></div>
          <div>keycloak: <code>${keycloak}</code></div>
          <div>realm: <code>${realm}</code> &middot; client: <code>${clientId}</code></div>
        </dl>
      </div>
    </div>`;
}

async function iniciar(): Promise<void> {
  await iniciarAutenticacao();

  const app = createApp(App);
  app.use(createPinia());

  const sessao = useSessao();
  sessao.carregarDoToken();
  const tenant = useTenant();
  tenant.carregarDoToken();

  definirDonoDosRascunhos(`${tenant.atual ?? "sem-cliente"}|${sessao.email || sessao.nome}`);
  limparRascunhosVencidos();
  vigiarSaidaDaPagina();
  useTempoDeSessao().iniciar();

  if (tenant.atual) {
    await useEmpresa().carregar();
  }

  app.use(router).use(VueQueryPlugin).mount("#app");

  esconderSplash();

  // Defaults de formulário: só são lidos quando um combo abre, então não seguram a pintura.
  if (tenant.atual) void usePadroes().carregar();

  saudarSePrimeiroAcesso(sessao.email || sessao.nome, () => useAvisos().mensagem("boas-vindas"));
}

iniciar().catch(mostrarFalha);
