/**
 * O que a tela manda e o contrato nao aceita.
 *
 * Existe porque o modo de falha e silencioso: um campo que a API ignora nao da erro nenhum -- a
 * pessoa preenche, salva, ve "salvo com sucesso" e o dado nao existe. Foi assim com `employeeId` no
 * cadastro de caixa, que ficou no formulario sem coluna atras ate alguem reparar.
 *
 * Varre os tres lugares onde um formulario mora, porque cobrir so o primeiro daria falsa
 * seguranca:
 *
 *   - o `formulario` do recurso        -> POST/PUT do proprio endpoint
 *   - o `formulario` de uma acao       -> POST em `{endpoint}/{id}/{chave}`
 *   - o `formulario` de um sub-recurso -> POST na rota que `lista` monta
 *
 * O caso inverso -- a API exige o que a tela nao expoe -- este script NAO pega, e nao ha como pegar
 * automaticamente: campo opcional no contrato pode ser exigido so na emissao, e campo que ninguem
 * usa e legitimo. Esse continua sendo conferido a mao.
 *
 * Uso: npm run api:cruzar
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const spec = JSON.parse(readFileSync("docs/api/openapi.json", "utf8"));
const schemas = spec.components.schemas;

/** As propriedades do DTO e de todos os aninhados nele -- linhas-filhas incluidas. */
function propriedades(nome, vistos = new Set()) {
  if (vistos.has(nome)) return new Set();
  vistos.add(nome);

  const esquema = schemas[nome] ?? {};
  const nomes = new Set(Object.keys(esquema.properties ?? {}));

  for (const prop of Object.values(esquema.properties ?? {})) {
    const alvo = prop.$ref ?? prop.items?.$ref;
    if (alvo) for (const n of propriedades(alvo.split("/").pop(), vistos)) nomes.add(n);
  }

  return nomes;
}

/** O que os POST/PUT daqueles caminhos aceitam. */
function aceitosEm(caminhos) {
  const nomes = new Set();

  for (const caminho of caminhos) {
    const item = spec.paths[caminho];
    if (!item) continue;

    for (const verbo of ["post", "put", "patch"]) {
      const ref = item[verbo]?.requestBody?.content?.["application/json"]?.schema?.$ref;
      if (ref) for (const n of propriedades(ref.split("/").pop())) nomes.add(n);
    }
  }

  return nomes;
}

/** O endpoint e suas sub-rotas de um nivel: `/items` traz `/items/{id}`. */
function caminhosDe(endpoint) {
  return Object.keys(spec.paths).filter(
    (c) => c === endpoint || c.startsWith(`${endpoint}/{`),
  );
}

/** Os `campo: "x"` de um trecho, ate o fecho da lista de campos. */
function camposEm(trecho) {
  return new Set([...trecho.matchAll(/campo: "([A-Za-z0-9_]+)"/g)].map((m) => m[1]));
}

const achados = [];
const anota = (onde, campos, aceitos) => {
  if (aceitos.size === 0) return;
  for (const campo of campos) if (!aceitos.has(campo)) achados.push(`${onde}\t${campo}`);
};

// ---- 1 e 2: recursos e as acoes deles -------------------------------------------------------

const pasta = "src/lib/recursos";

for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith(".ts"))) {
  const texto = readFileSync(join(pasta, arquivo), "utf8");
  const marcas = [...texto.matchAll(/\n\s*endpoint: "(\/[^"]*)"/g)].map((m) => [m.index, m[1]]);

  for (const [i, marca] of marcas.entries()) {
    const [pos, endpoint] = marca;
    const bloco = texto.slice(pos, marcas[i + 1]?.[0] ?? texto.length);

    // As acoes vem primeiro para que os campos delas nao caiam no formulario do recurso.
    const acoes = [...bloco.matchAll(/chave: "([A-Za-z0-9_-]+)"[\s\S]*?formulario: \[([\s\S]*?)\n {8}\]/g)];
    for (const acao of acoes) {
      const rota = `${endpoint}/{id}/${acao[1]}`;
      anota(rota, camposEm(acao[2]), aceitosEm([rota]));
    }

    // So o `formulario:` do proprio recurso: o de dentro de uma acao tem outra indentacao, e
    // partir por ele arrastaria as colunas junto -- que sao campos de RESPOSTA, e nao de envio.
    const inicio = bloco.indexOf("\n    formulario: [");
    if (inicio < 0) continue;

    const doRecurso = camposEm(bloco.slice(inicio));
    for (const acao of acoes) for (const c of camposEm(acao[2])) doRecurso.delete(c);

    anota(endpoint, doRecurso, aceitosEm(caminhosDe(endpoint)));
  }
}

// ---- 3: os sub-recursos ---------------------------------------------------------------------

const subs = readFileSync("src/lib/subrecursos.ts", "utf8");

// `lista: (r) => `/customers/${...}/addresses`` -> `/customers/{id}/addresses`
for (const bloco of subs.split(/\n  \{\n    chave: "/).slice(1)) {
  const lista = bloco.match(/lista: \([^)]*\) =>\s*`([^`]+)`/);
  if (!lista) continue;

  const rota = lista[1].replace(/\$\{[^}]*\}/g, "{id}");
  const inicio = bloco.indexOf("formulario:");
  if (inicio < 0) continue;

  const nomeado = bloco.match(/formulario:\s*([A-Za-z][A-Za-z0-9_]*),/);
  const trecho = nomeado
    ? (subs.match(new RegExp(`const ${nomeado[1]}[\\s\\S]*?\\n\\];`)) ?? [""])[0]
    : bloco.slice(inicio);

  anota(rota, camposEm(trecho), aceitosEm([rota, rota.replace("/{id}/", "/")]));
}

// ---- saida ------------------------------------------------------------------------------------

const unicos = [...new Set(achados)].sort();

for (const achado of unicos) {
  const [onde, campo] = achado.split("\t");
  console.log(`${onde.padEnd(38)} manda "${campo}" e o contrato não aceita`);
}

console.log(`\n${unicos.length} campo(s) sem contrato atrás.`);
process.exit(unicos.length === 0 ? 0 : 1);
