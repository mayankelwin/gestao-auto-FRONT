export function soDigitos(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

export function soAlfanumerico(valor: unknown): string {
  return String(valor ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function pareceCpf(valor: string): boolean {
  return valor.length <= 11 && /^\d*$/.test(valor);
}

export function formatarCpfCnpj(valor: unknown): string {
  const v = soAlfanumerico(valor).slice(0, 14);

  if (pareceCpf(v)) {
    return v
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return v
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, "$1.$2")
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, "$1.$2.$3")
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})([A-Z0-9])/, "$1.$2.$3/$4")
    .replace(
      /^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})\/([A-Z0-9]{4})([A-Z0-9])/,
      "$1.$2.$3/$4-$5",
    );
}

export function formatarCep(valor: unknown): string {
  const d = soDigitos(valor).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatarTelefone(valor: unknown): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/^\((\d{2})\) (\d{4})(\d)/, "($1) $2-$3");
  }
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/^\((\d{2})\) (\d{5})(\d)/, "($1) $2-$3");
}

export function formatarPlaca(valor: unknown): string {
  const bruto = String(valor ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
  if (/^[A-Z]{3}\d[A-Z]/.test(bruto)) return bruto;
  return bruto.replace(/^([A-Z]{3})(\d)/, "$1-$2");
}

export function cpfValido(valor: unknown): boolean {
  const d = soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const digito = (ate: number): number => {
    let soma = 0;
    for (let i = 0; i < ate; i += 1) soma += Number(d[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

const pesoDoCaractere = (caractere: string): number => caractere.charCodeAt(0) - 48;

export function cnpjValido(valor: unknown): boolean {
  const v = soAlfanumerico(valor);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(v)) return false;
  if (/^(\d)\1{13}$/.test(v)) return false;

  const digito = (pesos: number[]): number => {
    const soma = pesos.reduce((total, peso, i) => total + pesoDoCaractere(v[i]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = digito([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digito([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return primeiro === Number(v[12]) && segundo === Number(v[13]);
}

export function cnpjAlfanumerico(valor: unknown): boolean {
  return /[A-Z]/.test(soAlfanumerico(valor));
}

export function cpfOuCnpjValido(valor: unknown): boolean {
  const v = soAlfanumerico(valor);
  if (v.length === 11 && /^\d+$/.test(v)) return cpfValido(v);
  if (v.length === 14) return cnpjValido(v);
  return false;
}

export function cepValido(valor: unknown): boolean {
  return soDigitos(valor).length === 8;
}

export function telefoneValido(valor: unknown): boolean {
  const d = soDigitos(valor);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  return d.length === 10 || d[2] === "9";
}

export function emailValido(valor: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor ?? "").trim());
}

export function placaValida(valor: unknown): boolean {
  const bruto = String(valor ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{3}\d{4}$/.test(bruto) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(bruto);
}
