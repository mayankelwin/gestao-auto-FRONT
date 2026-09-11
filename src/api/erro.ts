import { mensagemDeErro } from "./client";

export class ErroDaApi extends Error {
  readonly status?: number;
  readonly erros: Record<string, string>;
  readonly regra?: string;

  constructor(mensagem: string, status?: number, erros?: Record<string, string>, regra?: string) {
    super(mensagem);
    this.name = "ErroDaApi";
    this.status = status;
    this.erros = erros ?? {};
    this.regra = regra;
  }
}

interface CorpoDeProblema {
  errors?: Record<string, string>;
  rule?: string;
}

function porCampo(corpo: unknown): Record<string, string> {
  if (!corpo || typeof corpo !== "object") return {};
  const erros = (corpo as CorpoDeProblema).errors;
  if (!erros || typeof erros !== "object") return {};
  return Object.fromEntries(Object.entries(erros).map(([campo, texto]) => [campo, String(texto)]));
}

function regra(corpo: unknown): string | undefined {
  if (!corpo || typeof corpo !== "object") return undefined;
  const valor = (corpo as CorpoDeProblema).rule;
  return valor ? String(valor) : undefined;
}

export function erroDaResposta(status: number | undefined, corpo: unknown): ErroDaApi {
  const campos = porCampo(corpo);
  const quantos = Object.keys(campos).length;

  const mensagem =
    quantos > 0
      ? `Confira ${quantos === 1 ? "o campo destacado" : `os ${quantos} campos destacados`}.`
      : mensagemDeErro(status, corpo);

  return new ErroDaApi(mensagem, status, campos, regra(corpo));
}
