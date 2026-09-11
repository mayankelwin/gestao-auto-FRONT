import type { components } from "@/api/schema";

export type LinhaDeExtratoLida = components["schemas"]["BankStatementLineRequestDTO"];

const CABECALHOS: Record<string, string[]> = {
  transactionDate: ["data", "date", "datamovimento", "datalancamento", "posted", "dtposted"],
  description: ["historico", "descricao", "description", "memo", "lancamento"],
  referenceNumber: ["documento", "numerodocumento", "docto", "checknum", "referencia"],
  externalId: ["id", "fitid", "identificador", "idbanco"],
  deposit: ["credito", "entrada", "deposit", "credit"],
  withdrawal: ["debito", "saida", "withdrawal", "debit"],
  amount: ["valor", "amount", "trnamt"],
};

function normalizarCabecalho(bruto: string): string {
  const limpo = bruto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  for (const [campo, apelidos] of Object.entries(CABECALHOS)) {
    if (apelidos.includes(limpo)) return campo;
  }

  return "";
}

function separador(cabecalho: string): string {
  const ponto = (cabecalho.match(/;/g) ?? []).length;
  const virgula = (cabecalho.match(/,/g) ?? []).length;
  return ponto >= virgula ? ";" : ",";
}

function partir(linha: string, separa: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let entreAspas = false;

  for (const caractere of linha) {
    if (caractere === '"') {
      entreAspas = !entreAspas;
      continue;
    }
    if (caractere === separa && !entreAspas) {
      campos.push(atual);
      atual = "";
      continue;
    }
    atual += caractere;
  }

  campos.push(atual);

  return campos.map((c) => c.trim());
}

function comoData(bruto: string): string | null {
  const texto = bruto.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const brasileira = /^(\d{2})[/.-](\d{2})[/.-](\d{4})$/.exec(texto);
  if (brasileira) return `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}`;

  const compacta = /^(\d{4})(\d{2})(\d{2})/.exec(texto);
  if (compacta) return `${compacta[1]}-${compacta[2]}-${compacta[3]}`;

  return null;
}

function comoNumero(bruto: string): number {
  const texto = bruto.trim().replace(/[^\d,.-]/g, "");

  if (texto === "") return 0;

  const ultimaVirgula = texto.lastIndexOf(",");
  const ultimoPonto = texto.lastIndexOf(".");

  if (ultimaVirgula > ultimoPonto) {
    return Number(texto.replace(/\./g, "").replace(",", "."));
  }

  return Number(texto.replace(/,/g, ""));
}

function comSinal(valor: number): Pick<LinhaDeExtratoLida, "deposit" | "withdrawal"> {
  return valor >= 0 ? { deposit: valor } : { withdrawal: Math.abs(valor) };
}

function etiqueta(bloco: string, nome: string): string {
  const achado = new RegExp(`<${nome}>([^<\r\n]*)`, "i").exec(bloco);
  return achado ? achado[1].trim() : "";
}

function lerOfx(conteudo: string): LinhaDeExtratoLida[] {
  const linhas: LinhaDeExtratoLida[] = [];

  for (const bruto of conteudo.split(/<STMTTRN>/i).slice(1)) {
    const bloco = bruto.split(/<\/STMTTRN>/i)[0];
    const data = comoData(etiqueta(bloco, "DTPOSTED"));

    if (!data) continue;

    const valor = comoNumero(etiqueta(bloco, "TRNAMT"));
    const documento = etiqueta(bloco, "CHECKNUM");
    const identificador = etiqueta(bloco, "FITID");
    const historico = etiqueta(bloco, "MEMO") || etiqueta(bloco, "NAME");

    linhas.push({
      transactionDate: data,
      description: historico || undefined,
      referenceNumber: documento || undefined,
      externalId: identificador || undefined,
      ...comSinal(valor),
    });
  }

  return linhas;
}

function lerCsv(conteudo: string): LinhaDeExtratoLida[] {
  const cruas = conteudo.split(/\r?\n/).filter((l) => l.trim() !== "");

  if (cruas.length < 2) {
    throw new Error("O CSV precisa de uma linha de cabeçalho e ao menos uma de movimento.");
  }

  const separa = separador(cruas[0]);
  const campos = partir(cruas[0], separa).map(normalizarCabecalho);

  if (!campos.includes("transactionDate")) {
    throw new Error(
      "Não achei a coluna de data no cabeçalho. Aceito Data, Date, DataMovimento ou DataLancamento.",
    );
  }

  if (!campos.includes("amount") && !campos.includes("deposit") && !campos.includes("withdrawal")) {
    throw new Error(
      "Não achei coluna de valor. Aceito Valor, ou o par Crédito e Débito, ou Entrada e Saída.",
    );
  }

  const linhas: LinhaDeExtratoLida[] = [];

  for (const crua of cruas.slice(1)) {
    const celulas = partir(crua, separa);
    const bruto: Record<string, string> = {};

    campos.forEach((campo, indice) => {
      if (campo) bruto[campo] = celulas[indice] ?? "";
    });

    const data = comoData(bruto.transactionDate ?? "");

    if (!data) continue;

    const entrada = comoNumero(bruto.deposit ?? "");
    const saida = comoNumero(bruto.withdrawal ?? "");
    const valor = comoNumero(bruto.amount ?? "");

    const movimento =
      entrada !== 0 || saida !== 0
        ? { deposit: entrada || undefined, withdrawal: saida || undefined }
        : comSinal(valor);

    if (!movimento.deposit && !movimento.withdrawal) continue;

    linhas.push({
      transactionDate: data,
      description: bruto.description || undefined,
      referenceNumber: bruto.referenceNumber || undefined,
      externalId: bruto.externalId || undefined,
      ...movimento,
    });
  }

  return linhas;
}

export function lerExtrato(conteudo: string, nome: string): LinhaDeExtratoLida[] {
  const pareceOfx = /<STMTTRN>/i.test(conteudo) || nome.toLowerCase().endsWith(".ofx");

  return pareceOfx ? lerOfx(conteudo) : lerCsv(conteudo);
}
