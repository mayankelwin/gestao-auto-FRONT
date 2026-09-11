# Contrato da API

`openapi.json` é o contrato real do `erp/gestao-safra/api`, extraído da aplicação em execução
(não escrito à mão). É a fonte de verdade para os tipos e o cliente do front.

Reextraído em **03/09/2026 da API de homologação** — `https://api.gestaosafra.dev/v3/api-docs` —,
que passou a estar no ar com as lacunas 3 e 4 do backend já entregues. A extração anterior, de
02/09, saía de uma instância local e parava na lacuna 2.

Com a API publicada, reextrair é uma linha, e não precisa mais de Postgres nem de papel restrito:

```bash
curl -s https://api.gestaosafra.dev/v3/api-docs -o docs/api/openapi.json
npm run api:types
```

O `/v3/api-docs` é público — só os endpoints de dado exigem token. O procedimento local, mais
abaixo, continua valendo para contrato de código ainda não publicado.

## O que tem dentro

| | 02/09 (local) | 03/09 (homolog) |
| --- | ---: | ---: |
| versão | OpenAPI 3.1.0 | OpenAPI 3.1.0 |
| paths | 144 | **151** |
| operações | 235 | **245** |
| escritas | 131 | **134** |
| schemas | 142 | **155** |
| security scheme | `keycloak` | `keycloak` |

O campo `servers` agora diz `https://api.gestaosafra.dev`, porque a extração passou a sair de lá.
O front **não** o usa: `baseUrl` vem de `VITE_API_BASE_URL`, e em desenvolvimento é o proxy do Vite.

### O que entrou entre as duas extrações

| path | tag | o que destrava no front |
| --- | --- | --- |
| `GET /aging/receivable` | Aging | Contas a Receber |
| `GET /aging/payable` | Aging | Contas a Pagar |
| `GET /financial-statements/balance-sheet` | Financial Statements | Balanço |
| `GET /financial-statements/income-statement` | Financial Statements | DRE |
| `GET /financial-statements/general-ledger` | Financial Statements | Razão |
| `/payment-terms` e `/payment-terms/{id}` | Payment Terms | Condições de Pagamento |

Nada foi removido nem renomeado — o diff entre os dois contratos é só adição.

### Operações por tag

| tag | ops | escrita | | tag | ops | escrita |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| Items | 15 | 7 | | Physical Inventories | 7 | 5 |
| Suppliers | 10 | 5 | | Accounts | 7 | 3 |
| Party Groups | 10 | 6 | | Warehouses | 6 | 3 |
| Item Variants | 10 | 5 | | UOM Conversions | 6 | 3 |
| Customers | 10 | 5 | | Naming Series | 6 | 3 |
| Tracking | 9 | 5 | | Item Groups | 6 | 3 |
| Stock | 9 | 3 | | Currencies | 6 | 3 |
| Sales Orders | 8 | 5 | | Cost Centers | 6 | 3 |
| Sales Invoices | 8 | 5 | | Companies | 6 | 3 |
| Purchase Receipts | 8 | 5 | | UOMs | 5 | 3 |
| Purchase Orders | 8 | 5 | | UOM Categories | 5 | 3 |
| Purchase Invoices | 8 | 5 | | Ledger | 5 | 2 |
| Platform Tenants | 8 | 5 | | **Payment Terms** | **5** | **3** |
| Payments | 8 | 5 | | Party Contacts | 4 | 4 |
| Fiscal Years | 8 | 5 | | Party Accounts | 4 | 2 |
| Delivery Notes | 8 | 5 | | **Financial Statements** | **3** | **0** |
| Accounting Periods | 8 | 5 | | Chart of Accounts | 2 | 1 |
| | | | | **Aging** | **2** | **0** |
| | | | | Sign Up | 1 | 1 |

## O que o OpenAPI NÃO diz

**A autorização não está no spec.** Ela vive nos `@PreAuthorize` dos controllers, e o front precisa
espelhá-la para não oferecer botão que a API recusa. Contagem de menções por papel nos controllers:

| papel | menções em escrita |
| --- | ---: |
| `TENANT_ADMIN` | 128 |
| `COMERCIAL` | 48 |
| `OPERADOR` | 21 |
| `CONTADOR` | 21 |
| `FINANCEIRO` | 20 |
| `PLATFORM_ADMIN` | 1 |

Contado em 03/09/2026 sobre 129 `@PreAuthorize` nos controllers.

`TENANT_ADMIN` aparece em quase toda regra porque, por decisão, ele passa em todo endpoint de
tenant. As 134 escritas menos as 128 com `TENANT_ADMIN` são as de plataforma e o `/sign-up` público.

As três escritas que entraram desde a extração anterior são as de `/payment-terms`, todas
`FINANCEIRO` ou `TENANT_ADMIN` — daí o 17 do `FINANCEIRO` ter virado 20.

Regra geral (de `api/docs/autorizacao.md`): **GET é livre para qualquer autenticado do tenant** — o
RLS já impede ver dado de outro cliente. Escrita sempre tem `@PreAuthorize`. É por isso que as
`Aging` e as `Financial Statements`, que são só leitura, não têm nenhuma regra de papel: qualquer
autenticado do cliente abre o balanço.

Os números aqui divergem de `api/docs/autorizacao.md` (que diz 228 endpoints e 126 escritas, e
`OPERADOR` 16). Aquele documento é de antes das lacunas 1 e 2. **O spec é o atual.**

## Como reextrair de uma API local

Só é preciso quando o contrato desejado ainda não subiu para homologação; publicado, vale o `curl`
do topo deste documento.

A aplicação recusa subir conectada como superuser ou com `BYPASSRLS` — então migra-se com o dono e
conecta-se com um papel restrito, exatamente como `AbstractPostgresIntegrationTest` faz.

```bash
# 1. Postgres na convenção do profile dev do pom
docker run -d --name gs-openapi-pg \
  -e POSTGRES_USER=gestaosafra -e POSTGRES_PASSWORD=12345 -e POSTGRES_DB=gestaosafra \
  -p 5432:5432 postgres:18

# 2. Migrations com o dono (precisam de DDL)
cd ../api && sh ./mvnw -P dev flyway:migrate

# 3. Papel restrito da aplicação — NOSUPERUSER NOBYPASSRLS
docker exec -i gs-openapi-pg psql -U gestaosafra -d gestaosafra <<'SQL'
CREATE ROLE gestaosafra_app LOGIN PASSWORD 'gestaosafra_app' NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO gestaosafra_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gestaosafra_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gestaosafra_app;
SQL

# 4. Sobe conectando com o papel restrito
DB_URL=jdbc:postgresql://localhost:5432/gestaosafra \
DB_USER=gestaosafra_app DB_PASS=gestaosafra_app \
FLYWAY_ENABLED=false SERVER_PORT=18080 \
OTLP_METRICS_ENABLED=false TRACING_SAMPLE_RATE=0 \
sh ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 5. Puxa o contrato
curl -s http://localhost:18080/v3/api-docs -o ../front/docs/api/openapi.json
```

**O boot valida o `issuer-uri` do Keycloak** (`oraculo.digitalventura.com.br`, realm
`gestaosafra-homolog`) — sem rede até lá, a aplicação não sobe.

`IDENTITY_PROVIDER` fica em `local` por padrão, e é o que faz o ambiente local **não** exigir
credencial de administrador do Keycloak. Não apontar para o Keycloak de produção.

## Duas pedras no caminho, para não se tropeçar de novo

**O Flyway do Spring não roda sozinho aqui.** Subir com `FLYWAY_ENABLED=true` e banco vazio falha em
`Schema validation: missing table [account]`, sem uma linha de log do Flyway. Migre pelo
`flyway-maven-plugin` (é o que o CI faz, no job `.migrate`) e suba com `FLYWAY_ENABLED=false`.

**`docker exec` sem `-i` engole o heredoc** — o SQL não chega ao `psql` e o comando termina em
silêncio, sem criar o papel e sem erro.
