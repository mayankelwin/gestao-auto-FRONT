import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { autenticacaoDesligada, garantirTokenValido } from "@/auth/keycloak";
import { useTenant } from "@/auth/tenant";

const BASE_API = import.meta.env.VITE_API_BASE_URL ?? "/api";
const ALVO_API = import.meta.env.VITE_API_TARGET ?? BASE_API;

export const api = createClient<paths>({ baseUrl: BASE_API });

api.use({
  async onRequest({ request }) {
    const token = await garantirTokenValido();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);

    const tenant = useTenant().atual;
    if (tenant) request.headers.set("X-Tenant", tenant);

    return request;
  },
});

interface ProblemDetail {
  detail?: string;
  title?: string;
}

function explicacaoDoServidor(corpo: unknown): string | undefined {
  if (!corpo || typeof corpo !== "object") return undefined;
  const problema = corpo as ProblemDetail;
  return problema.detail ?? problema.title ?? undefined;
}

export function mensagemDeErro(status: number | undefined, corpo?: unknown): string {
  const doServidor = explicacaoDoServidor(corpo);

  switch (status) {
    case 400:
    case 422:
      return doServidor ?? "Dados inválidos.";
    case 401:
      return autenticacaoDesligada
        ? "A API exige token e a autenticação está desligada (VITE_AUTH_DISABLED). " +
            "Crie o client no Keycloak e desligue a variável."
        : "Sua sessão expirou. Entre novamente.";
    case 403:
      return doServidor ?? "Seu papel não permite esta ação.";
    case 404:
      return "Registro não encontrado.";
    case 409:
      return doServidor ?? "Conflito com o estado atual do registro.";
  }

  if (status !== undefined && status >= 500) {
    return `A API não respondeu (HTTP ${status}). Verifique se ela está no ar em ${ALVO_API}.`;
  }

  const sufixo = status !== undefined ? ` (HTTP ${status})` : "";
  return doServidor ? `${doServidor}${sufixo}` : `Não foi possível completar a operação${sufixo}.`;
}
