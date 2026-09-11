import Keycloak from "keycloak-js";
import { descarregarRascunhos } from "@/lib/rascunhos";

export const autenticacaoDesligada =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_DISABLED === "true";

export const ESCOPO = "openid profile email organization:*";

function obrigatoria(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Variável de ambiente ${nome} não definida. Copie .env.example para .env e preencha.`,
    );
  }
  return valor;
}

let instancia: Keycloak | undefined;

export function obterKeycloak(): Keycloak {
  if (!instancia) {
    instancia = new Keycloak({
      url: obrigatoria("VITE_KEYCLOAK_URL", import.meta.env.VITE_KEYCLOAK_URL),
      realm: obrigatoria("VITE_KEYCLOAK_REALM", import.meta.env.VITE_KEYCLOAK_REALM),
      clientId: obrigatoria("VITE_KEYCLOAK_CLIENT_ID", import.meta.env.VITE_KEYCLOAK_CLIENT_ID),
    });
  }
  return instancia;
}

export async function iniciarAutenticacao(): Promise<void> {
  if (autenticacaoDesligada) {
    console.warn(
      "[gestao-safra] Autenticação desligada (VITE_AUTH_DISABLED). " +
        "Só vale em desenvolvimento; as chamadas à API vão voltar 401.",
    );
    return;
  }

  await obterKeycloak().init({
    onLoad: "login-required",
    scope: ESCOPO,
    pkceMethod: "S256",
    checkLoginIframe: false,
    redirectUri: window.location.origin + window.location.pathname,
  });

  limparRetornoDoLogin();
}

function limparRetornoDoLogin(): void {
  const { pathname, search, hash } = window.location;

  if (!/(^|[#&])(state|session_state|code|iss)=/.test(hash)) return;

  window.history.replaceState({}, document.title, pathname + search);
}

export async function garantirTokenValido(margemSegundos = 30): Promise<string | undefined> {
  if (autenticacaoDesligada) return undefined;

  const keycloak = obterKeycloak();
  try {
    await keycloak.updateToken(margemSegundos);
  } catch {
    descarregarRascunhos();
    await keycloak.login({ scope: ESCOPO, redirectUri: window.location.href });
  }
  return keycloak.token;
}
