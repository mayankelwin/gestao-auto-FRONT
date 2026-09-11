type Valores = Record<string, unknown>;

type Validador = (valor: unknown, valores: Valores) => string | null;

const emIso = (valor: unknown): string => String(valor ?? "").slice(0, 10);

export function naoAntesDe(campo: string, mensagem: string): Validador {
  return (valor, valores) => {
    const referencia = emIso(valores[campo]);
    if (!referencia || !emIso(valor)) return null;
    return emIso(valor) < referencia ? mensagem : null;
  };
}

export function naoDepoisDe(campo: string, mensagem: string): Validador {
  return (valor, valores) => {
    const referencia = emIso(valores[campo]);
    if (!referencia || !emIso(valor)) return null;
    return emIso(valor) > referencia ? mensagem : null;
  };
}

export function naoNoFuturo(mensagem: string): Validador {
  return (valor) => {
    const informado = emIso(valor);
    if (!informado) return null;
    return informado > new Date().toISOString().slice(0, 10) ? mensagem : null;
  };
}
