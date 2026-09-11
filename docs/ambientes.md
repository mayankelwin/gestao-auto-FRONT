# Ambientes e autenticação

Levantado em 02/09/2026 direto do Keycloak (`oraculo.digitalventura.com.br`) e dos manifestos do
ArgoCD, não de suposição.

## Os três ambientes

| | local | homologação | produção |
| --- | --- | --- | --- |
| realm | `gestaosafra-homolog` | `gestaosafra-homolog` | `gestaosafra` |
| domínio base do tenant | — (resolve pelo token) | `gestaosafra.dev` | `gestaosafra.com` |
| API | `http://localhost:18080` | `https://api.gestaosafra.dev` | `https://api.gestaosafra.com` |
| CORS da API | vazio (usa proxy do Vite) | `https://*.gestaosafra.dev` | `https://*.gestaosafra.com` |
| como o front chama a API | proxy `/api` do Vite | cross-origin | cross-origin |

Local usa o realm de homologação — não existe realm próprio de desenvolvimento.

## Variáveis

| variável | local | homologação | produção |
| --- | --- | --- | --- |
| `VITE_KEYCLOAK_URL` | `https://oraculo.digitalventura.com.br` | idem | idem |
| `VITE_KEYCLOAK_REALM` | `gestaosafra-homolog` | `gestaosafra-homolog` | `gestaosafra` |
| `VITE_KEYCLOAK_CLIENT_ID` | `gestaosafra-front` | `gestaosafra-front` | `gestaosafra-front` |
| `VITE_API_BASE_URL` | ausente (vira `/api`) | `https://api.gestaosafra.dev` | `https://api.gestaosafra.com` |
| host do front | `localhost:5173` | `app.gestaosafra.dev` | `app.gestaosafra.com` |
| `VITE_API_TARGET` | `http://localhost:18080` | — | — |

`VITE_API_BASE_URL` ausente cai em `/api`, que só funciona com o proxy do Vite. Em homologação e
produção ele precisa ser a URL absoluta da API, porque lá a chamada é cross-origin — é justamente
por isso que `CORS_ALLOWED_ORIGINS` está preenchido nos manifestos.

As variáveis `VITE_*` são resolvidas **em tempo de build**, não em tempo de execução. A esteira
precisa injetá-las antes do `npm run build`; um ConfigMap no deploy não tem efeito.

## Clients no Keycloak

O realm `gestaosafra-homolog` tem três clients de aplicação:

| client | tipo | para quê |
| --- | --- | --- |
| `gestaosafra-provisioning` | confidencial, service account | provisionamento de tenant (manage-users, manage-realm) |
| `gestaosafra-swagger` | público | Swagger UI da API |
| `gestaosafra-front` | público | **o SPA** — criado em 02/09/2026 nos dois realms |

Configuração do `gestaosafra-front`:

```
Client authentication ..... OFF (público)
Standard flow ............. ON
Direct access grants ...... OFF
Implicit flow ............. OFF
Service accounts .......... OFF
PKCE method ............... S256
Valid redirect URIs ....... http://localhost:5173/*, http://127.0.0.1:5173/*, https://app.gestaosafra.dev/*
Web origins ............... http://localhost:5173, http://127.0.0.1:5173, https://app.gestaosafra.dev
Default client scopes ..... web-origins, acr, profile, roles, organization, basic, email
```

O scope `organization` é obrigatório: é dele que sai o claim que a API usa para resolver o tenant.

## Host único, e por quê

O Keycloak **não aceita curinga de subdomínio** em redirect URI. Testado contra este Keycloak, não
deduzido: com `https://*.gestaosafra.dev/*` cadastrado, `https://fazendaboavista.gestaosafra.dev/`
era recusado; só `http://localhost:5173/` passava. O curinga só casa no fim do caminho, nunca no
host.

Decidido em 02/09/2026: **um host por aplicação**.

| ambiente | host do front | redirect URI |
| --- | --- | --- |
| local | `http://localhost:5173` | `http://localhost:5173/*` |
| homologação | `https://app.gestaosafra.dev` | `https://app.gestaosafra.dev/*` |
| produção | `https://app.gestaosafra.com` | `https://app.gestaosafra.com/*` |

`app` já constava na lista de subdomínios reservados do catálogo de tenant, junto com `www`, `api`,
`admin`, `painel` e `suporte` — o nome estava livre por construção.

### O que isso obrigou a mudar na API

Sem subdomínio, o host deixa de escolher o cliente, e o token sozinho só decide quando o usuário
pertence a **uma** organização: com duas, `TenantResolver` lança `tenant-ambiguous`. Um contador que
atende três fazendas ficaria sem entrar.

A API passou a aceitar um seletor explícito, o cabeçalho **`X-Tenant`**:

- `SelectedTenantExtractor` lê o cabeçalho e valida o formato de slug.
- `TenantResolutionFilter` escolhe **host primeiro, cabeçalho depois** — quando os dois falam, vale
  o host, porque ele vem do DNS e o cabeçalho vem da máquina de quem usa.
- `TenantResolver` fica intacto: ele já recusava escolha fora das organizações do token.

O invariante da casa não mudou, só ficou mais geral: **o pedido escolhe, o token autoriza.**

Verificado com token real contra a API local:

| pedido | resultado |
| --- | --- |
| sem `X-Tenant`, token com **uma** organização | 200 |
| sem `X-Tenant`, token com **duas** organizações | **403** `tenant-ambiguous` |
| `X-Tenant: fazendaboavista` (autorizado) | 200 |
| `X-Tenant: santarita` (autorizado, outro cliente) | 200 |
| `X-Tenant: outrocliente` (não autorizado) | **403** `tenant-not-authorized` |

CORS não precisou mudar: `CorsConfig` já usa `setAllowedHeaders("*")`.

### O scope `organization` é dinâmico — e isso quase quebrou tudo

O mapper do Keycloak é `oidc-organization-membership-mapper`, e o scope `organization` **não é um
scope comum: é dinâmico**. O comportamento, medido neste realm com um usuário de duas organizações:

| scope pedido | claim `organization` |
| --- | --- |
| `organization` | **ausente** |
| `organization:*` | `["fazendaboavista", "santarita"]` |
| `organization:santarita` | `["santarita"]` |

Com uma organização só, o claim aparece de qualquer jeito — que é por que o defeito não apareceu no
primeiro usuário de teste. Com duas, pedir `organization` puro devolve token **sem** o claim, e a
API recusa com `tenant-claim-missing`: o usuário simplesmente não entra.

Por isso o front pede `openid profile email organization:*`, na constante `ESCOPO` de
`src/auth/keycloak.ts`. O `keycloak.login()` do caminho de token expirado passa o mesmo escopo — sem
isso, uma renovação falha devolveria o usuário logado sem o claim.

### localhost e 127.0.0.1 são origens diferentes

Abrir a aplicação em `http://127.0.0.1:5173` com só `http://localhost:5173` em *Web origins* faz o
navegador bloquear a troca do código por token, e o erro que aparece é apenas
`NetworkError when attempting to fetch resource` — sem menção a CORS, sem nada no log do Keycloak.

Medido no endpoint de token deste realm:

| `Origin` enviado | `access-control-allow-origin` na resposta |
| --- | --- |
| `http://localhost:5173` | `http://localhost:5173` |
| `http://127.0.0.1:5173` | ausente, antes de cadastrar |

As duas origens estão cadastradas no client de homologação. A tela de falha de arranque passou a
mostrar a origem da página, o realm e o client, porque a mensagem do navegador sozinha não permite
chegar à causa.

### No front

`useTenant` lê as organizações do claim `organization` do token. Com uma, entra direto. Com duas ou
mais, `App.vue` mostra a tela de escolha antes de qualquer outra coisa. A escolha fica no
`localStorage` e é **revalidada contra o token** a cada carga — se o usuário perder acesso a um
cliente, o valor guardado é descartado.

Trocar de cliente pelo seletor da topbar faz `window.location.assign("/")`. É recarga proposital:
qualquer linha do cliente anterior que sobrasse em cache do TanStack Query pareceria vazamento entre
clientes.

## Usuário e tenant de desenvolvimento

Criados em 02/09/2026 no realm `gestaosafra-homolog`, para desenvolvimento:

| usuário | organizações | serve para |
| --- | --- | --- |
| `felipe.oliveira` | `fazendaboavista` | caminho direto — entra sem escolher |
| `teste` | `fazendaboavista`, `santarita` | exercita a tela de escolha e o seletor da topbar |

Ambos com papel `TENANT_ADMIN`. As duas organizações têm linha correspondente no catálogo de tenant
do Postgres local, com status `ACTIVE` — sem isso o `TenantRegistry` recusa com `tenant-unknown`.

Produção e homologação continuam vazias: lá o caminho é o `/sign-up`.

A cadeia que a API exige, em `TenantResolutionFilter` e `TenantJwtConverter`:

1. O token traz o claim `organization` (feature `organization` do Keycloak, já ligada).
2. `TenantResolver` tira o slug do host ou das organizações autorizadas do token.
3. `TenantRegistry` exige que esse slug **exista como tenant no banco**.

Os três precisam estar alinhados. Organização no Keycloak sem tenant correspondente no banco já
causou defeito antes — está registrado no próprio `TenantResolutionFilter`: virava um tenant novo e
vazio, sem erro nenhum.

O caminho previsto para criar os três de uma vez é o `POST /sign-up` com
`IDENTITY_PROVIDER=keycloak`, que é o fluxo de onboarding — tratado em contexto próprio.
