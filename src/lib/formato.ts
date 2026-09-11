const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

export function dinheiro(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return MOEDA.format(Number(valor));
}

export function numero(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return NUMERO.format(Number(valor));
}

export function dataCurta(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return new Date(String(valor)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Data com hora. Cai para só a data quando o valor não carrega horário. */
export function dataHora(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";

  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return String(valor);

  const temHorario = /[T ]\d{2}:\d{2}/.test(String(valor));
  if (!temHorario) return dataCurta(valor);

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function booleano(valor: unknown): string {
  return valor ? "Sim" : "Não";
}

function iso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function hoje(): string {
  return iso(new Date());
}

export function primeiroDiaDoAno(): string {
  return `${new Date().getFullYear()}-01-01`;
}
