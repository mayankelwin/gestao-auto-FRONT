# Decisões do front — o que o código não conta

Este repositório é **sem comentários**. O que precisaria de um comentário mora aqui.

---

## Tokens: por que os nomes divergem do Figma

No Tailwind 4 o namespace `--color-*` vira o nome do utilitário, então `text/primary` viraria
`text-text-primary`. A tradução, em `src/style.css`:

| Figma | CSS | utilitário |
| --- | --- | --- |
| `text/primary` | `--color-ink` | `text-ink` |
| `text/secondary` | `--color-ink-soft` | `text-ink-soft` |
| `text/muted` | `--color-ink-mute` | `text-ink-mute` |
| `text/inverse` | `--color-ink-invert` | `text-ink-invert` |
| `text/on-navy` | `--color-ink-navy` | `text-ink-navy` |
| `border/default` | `--color-line` | `border-line` |
| `border/strong` | `--color-line-strong` | `border-line-strong` |
| `bg/app` | `--color-app` | `bg-app` |
| `bg/surface` | `--color-surface` | `bg-surface` |

O resto mantém o nome do Figma.

A altura de linha dos sete estilos tipográficos **não** veio do Figma: a exportação SVG saiu com
*Outline Text*, que converte texto em `<path>` e descarta a métrica. Os valores em `--text-*` são
derivados da proporção nas telas.

Os raios (`--radius-control` 7, `--radius-card` 12, `--radius-panel` 16) foram medidos dos `rx` do
SVG. Valores terminados em `.5` lá são recuo de traço — a borda de 1px desenhada por dentro come
meio pixel —, não raios de verdade.

---

## Autenticação

**`VITE_AUTH_DISABLED` só existe em desenvolvimento.** A guarda é `import.meta.env.DEV`, que o Vite
substitui por `false` literal no build de produção, eliminando o ramo inteiro do bundle. Verificado:
no `dist`, `"Autenticação DESLIGADA"` e `"VITE_AUTH_DISABLED"` têm zero ocorrências, e
`"login-required"` continua lá. Não existe combinação de variável capaz de subir produção sem
autenticação.

Ela existe enquanto o client `gestaosafra-front` não for criado no realm. Com ela ligada a casca
renderiza, mas toda chamada volta 401 — e a tela mostra isso.

**O Keycloak é instanciado sob demanda**, não no topo do módulo: criar na importação faria a
validação das variáveis explodir antes de qualquer código rodar, inclusive com a autenticação
desligada, onde elas não são necessárias.

**A autenticação roda antes do `mount`**, não num guard de rota. Com `login-required` o Keycloak
redireciona antes de qualquer componente montar; montar primeiro faria a aplicação piscar e
disparar chamadas sem token.

**PKCE S256 é obrigatório.** SPA é cliente público, não guarda segredo, e sem PKCE o código de
autorização pode ser trocado por token por quem o interceptar.

**Os papéis são lidos de `realm_access.roles` E de `resource_access.*.roles`**, porque é
exatamente o que o `TenantJwtConverter` da API faz. Ler só um dos dois daria a pior divergência
possível: esconder botão que o usuário tem direito de usar, ou mostrar um que volta 403.

A margem de 30s na renovação do token existe porque ele pode vencer entre o momento em que a
requisição é montada e o momento em que a API a valida.

---

## API

**`baseUrl` é `/api`, não a URL da API.** Em desenvolvimento o proxy do Vite reescreve; em produção
o ingress faz o mesmo. Apontar direto para o host exigiria afrouxar o CORS lá — que nasce vazio de
propósito, porque um curinga abriria a API para qualquer página da internet chamar com o token do
usuário.

### Duas armadilhas de tipo do `openapi-fetch`

O sintoma aparece longe da causa, então valem por escrito:

1. **Uma função por endpoint, nunca `cond ? a : b`.** A biblioteca devolve união discriminada por
   endpoint; juntar `/items` e `/items/search` num ternário colapsa a união em `never`.
2. **Desestruturar antes de testar.** O OpenAPI da API declara só a resposta 200 — nenhum 400, 403
   ou 404 —, então o tipo de `error` é `never`. Testar `if (resultado.error)` sobre o objeto inteiro
   faz o TypeScript concluir que o ramo é impossível e reduzir tudo a `never`. Desestruturando
   primeiro, os três valores já estão presos em constantes e o teste não reduz nada.

### O formato de erro da API

A API responde erro em **RFC 7807**, não com `message`:

```json
{
  "type": "urn:gestaosafra:error:unauthorized",
  "title": "Unauthorized Access",
  "detail": "Authentication is required to access this resource",
  "status": 401,
  "instance": "/items",
  "timestamp": "2026-09-02T13:53:25Z"
}
```

O campo a ler é `detail`, com `title` de reserva. Procurar `message` — que foi o primeiro palpite —
nunca acha nada e descarta em silêncio a explicação do servidor.

### Mensagens de erro

Toda mensagem carrega o status. Uma frase genérica sem código já custou uma investigação: a API
estava simplesmente fora do ar e a tela não tinha como dizer isso. E o proxy do Vite devolve **500**
quando o alvo recusa conexão — então 5xx quase sempre significa "a API não está no ar", não "a API
quebrou".

O 403 é o caso que mais importa: quase nunca é bug, é a matriz de papéis do `@PreAuthorize`
funcionando. Mostrar "erro inesperado" aí faria o usuário abrir chamado para uma recusa correta.

---

## Navegação

**As rotas são derivadas de `src/lib/navigation.ts`**, não escritas de novo no router. Duas listas
para manter em sincronia é como se cria link morto — e são 46 itens. O mapa `telas` no router diz
quais já existem; o que não estiver nele cai no `PlaceholderPage`. **Esse mapa é o placar do que
falta.**

**O menu não filtra por papel, com uma exceção.** Leitura é livre para qualquer autenticado do
tenant — o RLS já impede ver dado de outro cliente. Quem tem token vê tudo; é a ação de escrita
dentro da tela que checa papel, espelhando o `@PreAuthorize` do endpoint. Esconder o botão **não**
substitui a checagem do servidor.

A exceção é **Clientes da Plataforma**: `/platform/*` não é dado do cliente, é do provedor, e o
`PLATFORM_ADMIN` é exigido **inclusive no GET**. Deixar o item no menu de todo mundo ofereceria uma
tela que só sabe devolver 403.

**"Inventário Físico" não está no Figma** e está no menu de propósito: foi entregue no backend em
01/09/2026 e o desenho é anterior. Sem item de menu, uma funcionalidade pronta ficaria inalcançável.

**Os itens sem endpoint aparecem esmaecidos, não escondidos.** Esconder faria a lacuna sumir de
vista; assim ela fica visível inclusive para quem validar em homologação.

### Balancete, Balanço, DRE e Razão são quatro telas

O item esmaecido chamava-se **Balancete** e apontava para a lacuna 4 do backend. A lacuna 4 entregou
três relatórios — `balance-sheet`, `income-statement` e `general-ledger` —, e cada um virou tela
própria.

**O balancete existe, e eu já afirmei o contrário aqui.** A primeira versão deste documento dizia
que "o balancete de verificação continua não existindo do outro lado". Está em
`GET /ledger/trial-balance`, na tag `Ledger`, desde antes das lacunas 3 e 4 — o que o desmentiu foi
a conferência automática de cobertura, não releitura. **Conferir o contrato inteiro antes de afirmar
que um endpoint não existe**: o spec tem 151 rotas e a memória não cobre isso.

O mesmo vale para **Contas a Receber** e **Contas a Pagar**: o texto esmaecido dizia "derivável das
faturas em aberto, mas sem rota própria na API". Agora há rota própria, e derivar seria errado —
`/aging` sai das **parcelas**, não das faturas. O razão responde quanto devem; só a parcela responde
quanto já venceu.

Com isso o menu não tem mais **nenhum** item esmaecido: "Lotes & Séries" virou tela de verdade,
organizada por item, porque é assim que a API expõe lote e número de série.

### O menu é acordeão: um grupo aberto por vez (03/09/2026)

Com 46 itens em 8 grupos, deixar vários abertos rolava a sidebar e escondia o grupo de baixo. A
regra passou a ser **tudo retraído, um aberto por vez, e abrir um fecha o anterior** — `aberto` é uma
string, não um `Set`.

Duas consequências que o `Set` escondia. O grupo da rota atual era **forçado** aberto por
`estaAberto`, então o usuário não conseguia fechar o grupo em que estava, e ele somava com qualquer
outro que tivesse clicado: era daí que vinham os dois abertos. Agora a rota apenas **semeia** qual
grupo abre, num `watch` sobre `route.path`; fechar continua possível, e só reabre quando a rota muda
de fato.

O estado **não é persistido**. O `localStorage` guardava a lista de grupos abertos, e persistir
contradiz "retraído por padrão": recarregar reabriria o que o usuário fechou. Quem recarrega numa
rota profunda vê o grupo daquela rota aberto — que é onde ele está —, e mais nenhum.

Junto saiu um defeito antigo do `isActive`, que usava `startsWith`: em `/grupos-de-item` o item
**Grupos de Cliente** (`/grupos`) também acendia. As rotas deste front são todas planas, sem filha,
então comparação exata é o certo — `startsWith` só criava acerto por prefixo.

### A sidebar retrátil

Guarda os grupos **abertos**, não os fechados. A escolha decorre do padrão ser retraído: o que o
usuário nunca tocou precisa nascer fechado, e é a lista de abertos que garante isso — inclusive para
grupo novo que entre no menu depois.

Um grupo retraído que contém a rota atual é mostrado aberto assim mesmo; senão o item aceso ficaria
invisível e a sidebar mentiria sobre onde o usuário está. Isso não grava preferência: ao sair da
rota, volta a retrair.

O `localStorage` é lido e escrito dentro de `try/catch` nos dois lados — em aba anônima ou com
storage bloqueado, não poder lembrar não pode quebrar a navegação.

O Dashboard mora em `/`, então comparação por prefixo o marcaria ativo em toda tela: só ele exige
igualdade exata.

---

## Listagem

**Debounce de 350ms na busca.** Sem ele cada tecla vira uma requisição — e `/items/search` faz LIKE
em três colunas.

**Esqueleto com a altura da linha real**, não spinner central: o spinner faria a página inteira
saltar quando os dados chegassem.

**`keepPreviousData`** mantém a página anterior visível enquanto a próxima carrega; sem isso a tabela
esvazia a cada clique de paginação.

**Paginação: texto de 1 em diante, estado zero-based.** O texto usa numeração humana; o estado segue
a API. Misturar as duas convenções num lugar só é o caminho mais curto para um erro de mais ou menos
um.

---

## Relatórios

As telas de relatório não passam pelo `ListaPage`: o retorno delas não é uma página de registros.
O aging devolve um **array cru** de parceiros com as parcelas aninhadas, e balanço, DRE e razão
devolvem **um objeto** com listas dentro. O mapa `telasProprias`, no router, é o que as separa das
listagens — vem antes do `recursoPorRota`.

**Uma função tipada por endpoint, em `src/api/relatorios.ts`.** É a primeira armadilha do
`openapi-fetch` de novo, agora com dois endpoints irmãos: a tela de aging escolhe entre receber e
pagar, e escolher **entre as duas funções** mantém cada `api.GET` com o caminho literal. Um ternário
dentro do `api.GET` colapsaria a união em `never`.

### Zero é um valor, não ausência

Nas listagens, campo vazio vira `—`. Nos relatórios, **não**: conta zerada aparece com `R$ 0,00`,
porque o backend a devolve de propósito — `filter_out_zero_value_rows` do ERPNext foi deliberadamente
não portado, já que balanço oficial mostra a conta mesmo sem movimento. Trocar o zero por travessão
desfaria essa decisão na apresentação.

### Datas: o padrão é hoje, e hoje é local

`hoje()` monta o `yyyy-mm-dd` a partir de `getFullYear`/`getMonth`/`getDate`, não de
`toISOString().slice(0, 10)`. O ISO é UTC: no Brasil, das 21h em diante, ele devolve **amanhã** — e
o balanço abriria numa data futura sem nada parecer errado.

O período de DRE e razão nasce em 1º de janeiro do ano corrente até hoje. É o exercício em curso, que
é o que se pede na esmagadora maioria das vezes.

### O balanço confere contra a DRE, e a tela diz isso

`consistent` compara o resultado que o **balanço deduz** (`unclosedResult`, ativo menos passivo e
patrimônio) com o que a **DRE acumula** (`accumulatedResult`). Falso não é defeito da tela: é conta
com natureza errada no plano, ou lançamento que não fechou em partidas dobradas. Por isso o bloco
mostra os dois números e a diferença, em vez de um selo silencioso — quem abre o balanço precisa
saber qual dos dois lados investigar.

A linha de **resultado não encerrado** aparece como KPI próprio pela mesma razão: sem lançamento de
encerramento no sistema, receita e despesa nunca migram para o patrimônio, e é essa linha que faz os
dois lados fecharem. Esconder o campo faria o balanço parecer desbalanceado.

### Aging

**Uma tela para os dois.** Receber e pagar diferem no endpoint e no rótulo da coluna de parceiro;
duplicar a tela duplicaria as cinco faixas, o rodapé de totais e a expansão.

**As faixas vêm do resumo do parceiro, as parcelas vêm de dentro dele.** Somar as parcelas para
recompor as faixas daria o mesmo número por acaso e passaria a divergir no dia em que o backend
mudar de critério — a faixa é decisão do `Aging.bucketOf`, não da tela.

**O filtro por parceiro não tem debounce** porque não faz requisição: a resposta traz todos os
parceiros e o filtro é local. O debounce de 350ms das listagens existe para não transformar cada
tecla em `LIKE` no banco.

Os KPIs somam **o que está filtrado**, não o total geral. Um cabeçalho que ignora o filtro faria a
tela mostrar dois universos ao mesmo tempo.

### Razão

O seletor de conta sai de `/accounts/chart`, não de `/accounts`: a árvore já vem escopada por empresa
e inteira, sem paginação. Só entram contas **analíticas e ativas** — pedir o extrato de uma conta
sintética não é uma pergunta que o endpoint responda.

O **saldo de abertura** é KPI, não linha da tabela. Ele carrega tudo que é anterior ao período mais
os lançamentos marcados como abertura, qualquer que seja a data; enfiá-lo como primeira linha do
extrato o faria parecer um lançamento do período.

### GsTable ganhou `detalhe` e `rodape`

Os dois slots são opcionais e nasceram do aging (linha que expande) e do rodapé de totais que
balanço, DRE e razão precisam. Ficaram no `GsTable` em vez de virar tabela solta na página porque os
estados de carregando, erro e vazio já moram lá — e uma tabela de relatório sem esqueleto saltaria na
tela exatamente como o spinner central que a listagem evita.

## Escrita

O front deixou de ser só leitura em 03/09/2026. Das **245 operações do contrato, 244 têm tela** — a
única de fora é `POST /sign-up`, que é público, anônimo e pertence ao onboarding, que tem contexto
próprio e não cabe dentro da casca autenticada.

### Recurso declarado, tela genérica

A tela de listagem não sabe o que está listando. Cada recurso se declara em `src/lib/recursos/` —
colunas, formulário, linhas filhas, ações, quem pode escrever — e a `ListaPage` monta busca,
paginação, botão de criar, menu de linha, modal de formulário e confirmação a partir disso. São
mais de trinta recursos; escrever trinta telas à mão faria trinta lugares para o mesmo defeito
aparecer.

A divisão dos arquivos segue o que a tela precisa saber:

| arquivo | o que declara |
| --- | --- |
| `recursos/tipos.ts` | as formas: `Recurso`, `AcaoDeRecurso`, `AcaoDeTela` |
| `recursos/cadastros.ts` | CRUD simples — item, cliente, conta, empresa, unidade... |
| `recursos/documentos.ts` | os oito documentos com linhas e ciclo rascunho → lançado |
| `recursos/leitura.ts` | telas de consulta que têm ação própria (razão, saldos, movimentos) |
| `subrecursos.ts` | o que existe **dentro** de um registro: endereço, contato, lote, padrão |

### O corpo é montado da declaração, não do formulário

`corpoDoFormulario` percorre a declaração, não os valores digitados. A diferença aparece no campo
que ficou vazio: ele **não vai** no corpo, em vez de ir como `""`. A API distingue "não informado"
de "string vazia" na validação, e mandar vazio transformaria campo opcional em erro 400.

Campo `booleano` é a exceção e sempre vai, porque desmarcar é uma informação — sem isso não haveria
como reativar um item desativado.

### Referência é combo com busca no servidor, não `<select>`

Um `<select>` com todos os itens carrega a tabela inteira no navegador. O `GsCombo` pagina em 50 e,
quando o endpoint tem `/search`, manda o termo para o servidor com o mesmo debounce de 350ms da
listagem.

**O endpoint da referência pode depender da linha.** O lote de uma linha de item sai de
`/tracking/items/{itemId}/batches`, e a fatura de uma alocação de pagamento sai de
`/sales-invoices` ou `/purchase-invoices` conforme a espécie escolhida. É o `endpointDe` da
declaração; enquanto o campo do qual ele depende estiver vazio, o combo fica desabilitado em vez de
listar coisa errada.

Trocar o endpoint **limpa o valor escolhido**. Sem isso, mudar a espécie de referência de venda para
compra manteria o id da fatura de venda, e o pedido sairia apontando para um documento que não
existe naquela coleção.

### O vazio de um enum é `null`, não `""`

O campo de opções nasce `null`, e a opção de placeholder do `GsSelect` também vale `null` — é o que
faz o "Selecione..." aparecer selecionado. Com `""`, valor nenhum casaria com opção nenhuma e o
select renderizaria **em branco**, sem nem o placeholder.

E a opção de placeholder só é `disabled` quando o campo é obrigatório. Num campo opcional ela
precisa ser escolhível, senão dá para preencher e nunca mais limpar.

### O que a API recebe e o que ela devolve não têm o mesmo nome

Editar um rascunho só funciona se o formulário souber ler o registro de volta, e em oito campos o
nome muda entre o pedido e a resposta. A conta superior é `parentAccountId` na escrita e
`parentAccount` (objeto) na leitura; a moeda da empresa é `defaultCurrencyId` e volta como
`defaultCurrency`; o exercício recebe `companyIds` e devolve `companies[].companyId`.

Cada campo diz de onde ler, com `leDe` e — quando o objeto aninhado não usa `id` — `chaveDoId`.
Sem isso o formulário de edição abre com o campo **vazio** e, sendo obrigatório, obriga a
reescolher; sendo opcional, salva apagando o que estava lá. Este último é o caso grave: perde dado
sem avisar.

**Como isso foi encontrado, e não por clique:** um script cruza cada campo declarado com o DTO de
leitura correspondente no OpenAPI e acusa o que a resposta não devolve. Achou oito. Vale rodar de
novo quando o contrato mudar.

O pagamento é a exceção que não se resolve com `leDe`: a API recebe `bankAccountId` e devolve
`paidFromAccountId` **ou** `paidToAccountId`, conforme a direção do dinheiro. Precisa de regra, não
de renomear — está no `aoCarregar` do recurso.

### Erro de validação volta para o campo

O `GlobalControllerAdvice` da API põe um mapa `errors` — campo → mensagem — no corpo RFC 7807 do
400. O `ErroDaApi` carrega esse mapa e o formulário destaca cada campo. Uma mensagem só no topo
obrigaria o usuário a caçar qual dos vinte campos a API recusou.

### Ação de documento é confirmada, e a razão está na mensagem

Lançar e cancelar não têm desfazer barato: lançar gera movimento de estoque e partida contábil,
cancelar estorna os dois. Cada confirmação diz **o que vai acontecer**, não "tem certeza?" — e o
item do menu fica desabilitado com o motivo quando a situação não permite ("Só rascunho pode ser
lançado"), em vez de sumir. Sumir esconde a regra; desabilitado com motivo a ensina.

### Ações que não cabem numa linha

Lançamento no razão, estorno, movimentação de estoque, refazer saldo e importar plano de contas não
pertencem a um registro da lista — são ações da tela. Vivem em `acoesDeTela` e abrem o mesmo
formulário genérico.

Duas coisas que a API impõe e a tela apenas obedece: `POST /ledger/entries` e `POST /stock/movements`
**exigem o par `voucherType` + `voucherId`** do documento de origem. São endpoints de integração, não
de digitação livre; o texto de ajuda no campo diz isso, porque um formulário que pede
"identificador do documento" sem explicar por quê parece defeito.

E algumas ações passam parâmetro por **query**, não por corpo — importar plano de contas, refazer
saldo, suspender cliente. Daí o `porConsulta` na declaração: o mesmo formulário serve, muda só para
onde os valores vão.

### O que é sub-recurso e o que é tela

Endereço, contato, lote, unidade alternativa, padrão por empresa e valor de eixo **só existem dentro
de um pai**. Viraram abas de um painel aberto pelo menu da linha, não itens de menu — um item de
menu "Endereços" que pede para escolher o cliente primeiro é um caminho a mais para o mesmo lugar.

A exceção é **Lotes & Séries**, que tem menu próprio porque é assim que o operador de estoque pensa:
ele parte do item, não do cadastro do item.

### Modal aninhado tem pilha, e a razão é chata mas real

O painel de detalhes é um modal, e o formulário que ele abre é outro modal por cima. Duas coisas
quebram sem uma pilha em módulo separado:

`document.body.style.overflow` — o modal de dentro, ao fechar, restauraria a rolagem com o de fora
ainda aberto, e a página passaria a rolar atrás dele. E o `Escape` fecharia os dois de uma vez,
porque os dois têm ouvinte.

A pilha **não pode ser um `let` dentro do `<script setup>`**: aquele bloco é o corpo do `setup`, então
cada instância ganharia o próprio contador e o problema continuaria igual. Vive em
`src/lib/pilhaDeModais.ts`, que é módulo de verdade e portanto compartilhado.

### O padrão mora na referência, não no campo (03/09/2026)

`ReferenciaDeCampo` ganhou `padrao`. Quem declara `referencia: refDeposito` recebe o depósito
principal já escolhido; `refMoeda` traz a moeda da empresa; `refEmpresa` traz a empresa da barra.
Não é preciso repetir `padrao:` em cada um dos campos — e não é possível esquecer num deles, que era
o defeito real: `padrao: empresaAtual` estava escrito em quatro lugares e ausente em todo campo de
moeda e de depósito.

`src/lib/padroes.ts` resolve os valores uma vez por empresa e recarrega sozinho quando a empresa
muda (o `watch` vive dentro da store, então nenhuma tela precisa saber disso). De onde vem cada um:

| padrão | origem | quando fica vazio |
| --- | --- | --- |
| moeda | `defaultCurrency` da empresa; se faltar, a moeda de código `BRL` | nenhuma das duas existe |
| depósito | depósito analítico de código `PRINCIPAL` | não há `PRINCIPAL` e há mais de um analítico |
| empresa | a empresa selecionada na barra | nenhuma empresa no cliente |

**O depósito não chuta.** Com vários depósitos e nenhum `PRINCIPAL`, o campo fica em branco: um
palpite errado aqui lança mercadoria no lugar errado, e o erro só aparece na conferência. É a mesma
razão de `semPadrao` em `sourceWarehouseId` e `targetWarehouseId` da transferência — preencher os
dois com o mesmo depósito produziria um movimento que a API recusa.

Os padrões são **derivados**, não configurados: ninguém cadastra "meu depósito padrão". Se o cliente
quiser escolher outro, isso vira campo em `/configuracoes` na API e esta store passa a lê-lo — o
ponto de mudança é um só.

### Criar o recurso sem sair do formulário (03/09/2026)

Mapeado do Frappe: `form/controls/link.js` acrescenta ao dropdown do campo de link a opção
**"Create a new {doctype}"**, que guarda o texto digitado (`route_options.name_field`), abre o
`quick_entry.js` como diálogo **por cima** do formulário atual e, ao inserir, devolve o registro
pelo callback `set_value(doc.name)`. O formulário de baixo nunca é desmontado — é isso que faz o
trabalho não se perder.

Aqui: `GsCombo` mostra `+ Criar "<texto digitado>"` no rodapé da lista, `src/lib/criacaoRapida.ts`
empilha o pedido e devolve uma `Promise`, e `CriacaoRapida.vue` (montado uma vez no `App.vue`)
renderiza o `FormularioDeRecurso` do recurso alvo. Ao salvar, a promessa resolve com o registro, o
combo o insere na lista e o seleciona.

**Onde não copiamos o Frappe:** ele precisa do *quick entry* — um formulário reduzido aos campos
obrigatórios — porque um DocType tem dezenas de campos e tabelas filhas. Os nossos formulários já
são declarados e pequenos, então a criação rápida usa **o mesmo formulário** da tela do recurso.
Menos código e nenhuma divergência entre "o que dá para preencher aqui" e "o que dá para preencher
lá".

A opção só aparece quando existe recurso declarado para aquele endpoint **e** o papel do usuário
está em `papeisEscrita` — equivalente ao `frappe.model.can_create` do original. Endpoint de
referência sem tela própria (`/party-groups/customers`, por exemplo) simplesmente não oferece.

### Trabalho não se perde: rascunho local e aviso de sessão (03/09/2026)

O Frappe **não** resolve isto, e vale registrar: `desk.js` responde a sessão expirada com
`redirect_to_login()`, e o documento em edição vive só em `locals`, na memória — recarregou,
perdeu. Foi o único ponto do mapeamento em que o original não serviu de modelo.

O que fizemos, em duas peças:

**`src/lib/rascunhos.ts`** grava em `localStorage`, com debounce de 600 ms, o par valores + linhas de
todo formulário aberto. A chave é `cliente|usuário|endpoint|id` (`novo` na criação) — o `dono` é
injetado no `main.ts` em vez de importado, senão `rascunhos → sessao → keycloak → rascunhos` viraria
ciclo de import. Rascunho vence em 7 dias e a varredura roda no start.

O rascunho é **descartado só por desistência explícita**: salvar com sucesso, ou responder
"Descartar" no diálogo de saída. Fechar a aba, recarregar, perder a sessão ou cair a rede **mantêm**.
Por isso o diálogo de saída tem três botões, e não dois — "Continuar preenchendo", "Guardar para
depois", "Descartar". Um diálogo de duas saídas obrigaria a tratar fechar-a-modal como desistência,
que é justamente o que se quer evitar.

**`src/auth/tempoDeSessao.ts`** olha o `exp` do *refresh token* a cada segundo. Enquanto o usuário
mexe (ponteiro ou teclado) e falta menos de 5 minutos, renova em silêncio — quem está trabalhando
nunca vê o aviso. A 2 minutos do fim aparece o `AvisoDeSessao`, um cartão no canto (não um modal:
bloquear a tela para avisar que a sessão vai cair seria interromper exatamente o trabalho que se
quer salvar). Expirou, os rascunhos são gravados **antes** do `login()`, e o `redirectUri` volta
para a mesma URL.

O mesmo `descarregarRascunhos()` entrou no `catch` do `garantirTokenValido`, que era o caminho por
onde o trabalho ia embora sem aviso: refresh falhou, redireciona para o Keycloak, formulário perdido.

### Campo que só existia por exigência da API sai da tela (03/09/2026)

O formulário de item e o de lote traziam **Série de numeração**, um texto livre ao lado do código.
Ele existia porque a API recusava item sem `code` e sem `namingSeriesPrefix` — ou seja, o cliente
tinha que digitar `ITEM` para salvar um cadastro que o sistema sabia numerar sozinho, e o único jeito
de descobrir o valor certo era abrir a tela de séries.

O acerto foi na API (`item-e-deposito.md`, "Quem escolhe a série é o sistema"): em branco, as séries
`ITEM` e `LOTE` numeram, como já acontecia com os documentos. Aqui os dois campos saíram, e o `code`
ficou com a ajuda "Em branco, o sistema numera" — a mesma frase do `number` dos documentos.

**O que se perdeu:** escolher outra série pela tela. Quem tiver codificação por natureza de item
(`DEF`, `SEM`) digita o código ou usa a tela de séries; o contrato continua aceitando o prefixo. Um
combo de séries no formulário exigiria uma `referencia` que carrega texto, e hoje ela converte para
`Number`.

### Onde a API obrigou a fugir do genérico

| tela | por quê |
| --- | --- |
| `RastreabilidadePage` | lote e série são por item, e a situação da unidade muda por query param |
| `PlataformaPage` | a chave é o `slug`, não `id`, e `suspend` leva o motivo por query |
| `VariantesDoModelo` | a variante é um valor por eixo declarado — os campos só existem depois de ler os eixos |
| `AuditoriaDeSaldo` | é um GET que compara dois números e oferece a correção no mesmo lugar |
| `ConciliacaoPage` | o extrato não é lista de recurso: filtra por conta e período, e cada linha tem quatro ações que dependem do que já foi alocado |
| `PdvPage` | a venda é uma requisição só, montada na tela; não há documento de cupom para o genérico administrar |
| `TurnosPage` | abrir e fechar turno não são criar e editar: o fechamento é uma contagem por meio de pagamento |

---

## Conciliação bancária e PDV (03/09/2026)

O contrato embarcado era o de 02/09 — 245 operações. A API entregou as lacunas 5 e 7 no dia
seguinte, e o front ficou 48 operações atrás sem que nada quebrasse. O primeiro passo foi
`curl` do `/v3/api-docs` de homologação mais `npm run api:types`: enquanto o `schema.d.ts` era o
antigo, `api.GET("/bank-accounts")` nem compilava. **Contrato desatualizado não dá erro, dá silêncio.**

### O preço da linha deixou de ser obrigatório — mas só na venda

`InvoiceItemRequestDTO.rate` saiu do `required`, e a fatura de venda ganhou `priceListId`: linha sem
preço busca na lista. Só que **a fatura de compra usa o mesmo DTO e não tem lista de preços** — o
`PurchaseInvoiceService` passa `dto.rate()` adiante sem resolver nada. Tirar o `precoObrigatorio` dos
dois teria trocado uma trava de formulário por um 500. Só a fatura de venda perdeu a obrigatoriedade,
e ganhou `placeholder: "Da lista"` na coluna para dizer de onde o valor sai.

### O extrato é lido no navegador

`POST /bank-transactions/import` recebe `bankAccountId` mais uma lista de linhas — **JSON, não
multipart**. Quem interpreta o OFX ou o CSV é o `src/lib/extrato.ts`. O OFX sai dos blocos
`<STMTTRN>`; o CSV aceita `;` ou `,`, cabeçalho em português ou inglês, e valor num campo só (com
sinal) ou no par crédito/débito. A tela avisa antes de enviar quantas linhas vêm **sem identificador
do banco**, porque é isso que decide se reimportar o arquivo duplica: o índice único de `external_id`
ignora nulo de propósito, já que duas tarifas iguais no mesmo dia existem de verdade.

### A situação da linha existe no DTO, mesmo não existindo no banco

A API decidiu não guardar coluna de situação. O `BankTransactionResponseDTO` **deriva** `status` do
par alocado/não alocado, então a tela não precisa calcular nada — só não pode confiar que exista
filtro por ele: o que filtra é `onlyOpen` no `/statement`.

### O número que abre a tela é a diferença inexplicada

O painel mostra os dois saldos, o não compensado e o inexplicado. Quando o inexplicado é zero, os
dois lados se explicam; quando não é, falta lançamento ou algum está errado. É o KPI que justifica a
tela, e é o único com tom vermelho quando diferente de zero.

### Sem turno aberto, o 422 não é falha

`GET /pos/profiles/{id}/current-shift` devolve **422 quando o caixa não tem turno aberto** — que é o
estado normal antes de abrir. `buscarTurnoAberto` trata esse status como `null` em vez de erro,
senão o PDV abriria mostrando falha toda manhã.

### O PDV soma para mostrar, não para decidir

O troco na tela é `recebido − total`, mas quem decide é a API: o pagamento guarda o líquido e o
`PosSaleResponseDTO` devolve o `changeAmount`, que é o que o cupom imprime. O preço da linha vem de
`GET /item-prices/resolve` com a lista do caixa — a tela **pergunta o preço, não o calcula**, porque
a regra de especificidade ganhando da data mora do outro lado.

### O Dashboard deixou de mentir

Era inteiro de dados de exemplo. `GET /onboarding` deu o painel "o que falta para operar" — e cada
passo traz `route`, que **casa com as rotas deste front** (`/empresas`, `/plano-de-contas`,
`/exercicios`, `/depositos`, `/itens`, `/clientes`), então o botão "Resolver" é um `RouterLink`
direto. O resto da tela foi ligado ao que já existia: aging, pedidos de venda, períodos contábeis e
lotes a vencer. **Nenhum número da tela é inventado.** Painel real ao lado de painel falso é pior que
tela toda falsa.

---

## Fonte

Poppins **auto-hospedada** (`@fontsource`) em vez de CDN do Google: um ERP interno roda atrás de
login e às vezes atrás de rede fechada, e uma fonte que depende da internet vira fallback silencioso
no cliente. Só os três pesos do design system: 400, 500, 600.

---

## Cadastro de parceiro por perfil (04/09/2026)

A issue #2 da API pede um seletor de perfil com o formulário se ajustando, e consulta de CNPJ
preenchendo o cadastro. Os prints da issue chegaram depois da primeira versão e mudaram três coisas.

### O print manda, e o texto da issue estava errado

O texto dizia "Pessoa Física, Produtor Rural ou Pessoa Jurídica"; o **print do seletor tem duas
opções**. Escrevi a primeira versão com três perfis, `RURAL_PRODUCER` inclusive, e foi desfeito. O
produtor rural é pessoa física com inscrição estadual preenchida — que é como a tela de referência o
cadastra.

Custou uma migration de reversão na API. A lição é barata de escrever e cara de aprender: **quando a
issue tem print, o print é a especificação**; o texto é resumo, e resumo perde detalhe.

### O formulário se ajusta por `visivel`, e nada mais foi preciso

Tipo de empresa, esfera pública, nome fantasia, data de abertura e SUFRAMA aparecem só na pessoa
jurídica; apelido, sexo e data de nascimento só na física. O `visivel` já existia na declaração.

**IE/RG é um campo só, e aparece nos dois.** Na pessoa jurídica é a inscrição estadual, na física é o
RG — é assim no print, e a primeira versão o escondia da pessoa física, apagando um campo que a tela
tem.

### Dois campos com o mesmo `campo` e rótulos diferentes

Apelido e nome fantasia são o mesmo dado — o nome curto pelo qual se conhece — com rótulo diferente
por perfil. Como `label` é string na declaração e não função, são **duas entradas com o mesmo
`campo` e `visivel` mutuamente exclusivos**.

Funciona porque o mapa de valores é indexado por `campo`: as duas entradas compartilham o valor, só
uma renderiza, e o corpo sai com a chave uma vez. Mas obrigou a **trocar a chave do `v-for`** de
`campo.campo` para `campo.campo` mais o índice — chave duplicada faz o Vue reaproveitar nó errado.

### `documento`: o primeiro tipo de campo que faz chamada própria

Todos os outros tipos só editam o valor deles. Este tem um botão ao lado que consulta um endpoint e
**preenche campos vizinhos** — razão social, fantasia, e-mail, telefone, data de abertura.

O `GsCampo` passou a emitir `preencher` e o `GsFormulario` a mesclar o sugerido; e o `GsFormulario`
passou a repassar `contexto`, que o `GsCampo` já aceitava mas ninguém enviava.

A decisão foi **declarar a consulta, não codificá-la**: `ConsultaDeCampo` diz o endpoint, como tirar
a chave do que foi digitado, o que mapear da resposta e que aviso mostrar. O componente não sabe o
que é um CNPJ. Uma consulta de CEP entra amanhã como outra declaração — e o print mostra que ela vai
ser pedida, com lupa no CEP e no logradouro.

### O botão fica desabilitado, e não escondido

Enquanto não houver catorze dígitos, ou enquanto o perfil não for pessoa jurídica, o botão está lá e
desabilitado. Sumir esconderia que a consulta existe — a mesma razão pela qual ação de documento
indisponível fica desabilitada com motivo.

### O aviso da consulta vira dica do campo, não erro

A API responde 200 mesmo quando não encontra, quando o provedor está fora do ar e quando o cadastro
está baixado — a lista `pending` traz o que o usuário precisa saber. O primeiro item vira a dica do
campo. **Cadastro com situação diferente de ATIVA não é erro de digitação**, e pintar o campo de
vermelho diria que ele foi preenchido errado. Falha de rede, essa sim, marca o campo: foi uma ação
que o usuário pediu e que não aconteceu.

### O código do tipo de contribuinte vai no rótulo

"9 - Não contribuinte", e não "Não contribuinte". É o número que aparece na nota, e o print da tela
de referência o mostra — quem confere um XML procura o número, não a frase.

### O que a consulta preenche, e o que não

Preenche razão social, nome fantasia, e-mail, telefone e data de abertura; o CNAE vai para as
observações, porque não há campo próprio. **Não preenche endereço**, apesar de a resposta trazer —
endereço é sub-recurso, vive em outra aba e tem forma própria; escrever nele a partir daqui exigiria
abrir a aba por baixo do formulário aberto.

## O 403 que mentia (04/09/2026)

Usuários com `TENANT_ADMIN` no Keycloak viam "Seu papel não permite esta ação" em tudo. O papel
estava certo; a mensagem é que apontava para o lugar errado.

**A API devolve 403 para duas coisas diferentes**: papel insuficiente, e tenant não resolvido. As
cinco recusas de tenant — `tenant-claim-missing`, `tenant-not-authorized`, `tenant-ambiguous`,
`tenant-unknown` e `tenant-not-active` — saem com 403 e uma explicação boa no corpo RFC 7807.

E o `mensagemDeErro` **descartava essa explicação**, só no 403:

```ts
case 403:
  return "Seu papel não permite esta ação.";
```

Nos outros status ele já fazia `doServidor ?? ...`. Só o 403 tinha a frase fixa — e é justamente o
status em que o servidor tem mais a dizer, porque a causa quase nunca é o papel.

Passou a ser `doServidor ?? "Seu papel não permite esta ação."`. Quem cair numa recusa de tenant
agora lê "A organização fazendaboavista não corresponde a nenhum cliente" em vez de ir conferir
papéis no Keycloak.

**A lição não é sobre este campo:** mensagem que chuta a causa custa mais do que mensagem que diz
"não sei". Foi a mesma família dos dois defeitos que a varredura do primeiro dia achou na API —
`Uom not found with id: stockUomId` e `Account not found with id: null`, que mandavam procurar
cadastro em vez de preencher campo.

## A referência gerada pelo sistema (04/09/2026)

O campo "Código" do item era digitável, com a ajuda "Em branco, o sistema numera." — um convite a
digitar num campo cuja razão de existir é **não** ser digitado. Duas mudanças, pedidas pelo usuário:
o rótulo passa a ser **Referência**, e o campo deixa de ser editável em todo cadastro que a API
numera sozinha.

A declaração ganhou `geradoPeloSistema`, e ele diz três coisas de uma vez:

| onde | efeito |
| --- | --- |
| `corpoDoFormulario` | nunca vai no corpo — o sistema numera, e o front não opina |
| `GsFormulario` | **escondido na criação**: não há valor ainda, e caixa vazia travada é ruído |
| `GsCampo` | desabilitado na edição, onde serve para **conferir** a referência |

Uma flag e não duas (`somenteLeitura` + `somenteNaEdicao`) porque é um conceito só: quem gera é o
sistema. Duas flags deixariam combinar as metades de um jeito que não significa nada.

**Onde foi aplicado, e onde não foi.** O critério não é o nome do campo: é se a API numera. Numeram
— `ItemService`, `TrackingService` (lote), `ItemVariantService`, `VoucherSupport` (os oito
documentos), `PosShiftService` e `BankStatementService`. **Não** numeram o código do **depósito** e o
**código ISO da moeda**: são escolha do usuário, e travá-los tornaria o cadastro impossível.

A variante era caso à parte — `VariantesDoModelo.vue` é componente escrito à mão, com um `GsInput`
de código e o `code` no corpo do `criar`. Os dois saíram; a coluna virou "Referência".

O número do documento continua se chamando **Número**, não Referência: é o número do documento, e a
"Nota do fornecedor" (`supplierInvoiceNumber`) já é campo separado — quem precisa digitar o número
de outra pessoa tem onde.

**A trava é de tela, não de contrato.** `ItemService.resolveCode` e `VoucherSupport.numberOrNext`
continuam aceitando um código informado; só o front deixou de oferecer. Foi decisão explícita — o
pedido era o rótulo e a tela —, e o efeito prático é que a API segue aceitando de outro cliente o
que esta tela não manda mais.

## Pendências conhecidas

| o quê | onde |
| --- | --- |
| `GsLogo` é **placeholder** — não é o símbolo oficial | `src/components/ui/GsLogo.vue` |
| Seletor de safra da topbar **não tem correspondente na API** | `src/components/layout/AppTopbar.vue` |
| `VendasComprasChart` existe mas **não está em uso** | `src/components/charts/` |
| `POST /sign-up` continua sem tela — é o onboarding público, contexto próprio | — |
| `GET /bank-transactions` (lista paginada, sem filtro de conta) **não é usado**: a tela usa o `/statement`, que filtra por conta e período. O detalhe da linha usa o `GET /bank-transactions/{id}` | `src/pages/ConciliacaoPage.vue` |
| O PDV **não tem NFC-e**: a API também não — depende das cinco decisões da `§19` do `lacunas-do-erp.md` | `src/pages/PdvPage.vue` |
| O PDV **não opera off-line**; é decisão de produto ainda em aberto do lado da API | `src/pages/PdvPage.vue` |
| A leitura de OFX cobre `<STMTTRN>`; **OFX em SGML antigo ou XML v2 não foi testado contra arquivo de banco real** | `src/lib/extrato.ts` |
| A referência é travada **só na tela**: a API continua aceitando código informado em item, lote, variante e documentos | `ItemService.resolveCode`, `VoucherSupport.numberOrNext` |
| Aging e razão não filtram por parceiro; a API aceita `customerId`, `supplierId` e `partyId` | `src/api/relatorios.ts` |
| Listagem de documento não abre **detalhe somente-leitura**: documento lançado só se vê pelo formulário desabilitado ou pelos relatórios | `src/pages/ListaPage.vue` |
| Sem tela para vincular linha de pedido a linha de entrega/fatura (`salesOrderItemId` e irmãos) — a API aceita, o formulário não oferece | `src/lib/recursos/documentos.ts` |
| A escrita foi verificada por tipo, build e renderização em SSR, **não contra dado real** — falta token de homologação | — |
| Não há como escolher a série de numeração de um item pelo formulário; o contrato aceita `namingSeriesPrefix`, a tela não oferece | `src/lib/recursos/cadastros.ts` |
| Os padrões (moeda, depósito) são **derivados**, não configuráveis pelo cliente — falta campo na API para guardar a escolha | `src/lib/padroes.ts` |
| A criação rápida não existe no `GsComboMultiplo`, só no `GsCombo` | `src/components/ui/GsComboMultiplo.vue` |
| Rascunho é por navegador: quem trocar de máquina não encontra o que deixou pela metade | `src/lib/rascunhos.ts` |
| O rascunho de edição não percebe que o registro mudou no servidor desde que foi guardado | `src/lib/rascunhos.ts` |

### Como verificar sem navegador

Não há Chromium nesta máquina, e `firefox --headless --screenshot` **captura antes do `mount`** — a
app monta depois de um `await` de rede, então a imagem sai só com o fundo e não prova nada.

O que prova, sem tocar no código: renderizar em **SSR pela API Node do Vite**. Com
`npm i --no-save jsdom` para os globais (`navigator` precisa de `Object.defineProperty`; atribuir
direto lança), `createServer({ middlewareMode: true })` e `ssrLoadModule("/src/App.vue")`, dá para
percorrer as 46 rotas e instanciar os 32 formulários e os 8 modais do balcão, tratando `console.error`
como falha. Exercita o `setup()` de verdade, que é onde o `vue-tsc` não chega.

`createWebHistory` roda no import do router e exige `window`: sem os globais do jsdom **antes** do
`ssrLoadModule`, quebra no import e não na renderização.

Os dois cruzamentos contra o OpenAPI valem o mesmo: um confere cobertura (paths × literais de rota
no `src`), o outro confere pré-preenchimento (campo declarado × DTO de leitura). Acharam,
respectivamente, o balancete que este documento negava e os oito campos de `leDe`.

O de cobertura **só enxerga literal estático**, então ele acusa como sem tela tudo o que é montado
por template (`/customers/${id}/addresses`) ou por `endpointDe`. Não confie no total dele; use a
diferença antes e depois da mudança.

E ele erra para os **dois lados**: a regra de sufixo que perdoa `submit`, `cancel` e `close` casa com
o *path*, não com a chamada, então `POST /pos/shifts/{id}/cancel` passou como coberto quando o único
lugar onde aquele literal aparecia era o `schema.d.ts` gerado. Não havia botão nenhum. O que
confirma de verdade é `grep` da chamada no `src/` — e foi ele que achou o cancelamento de turno
faltando depois de o script dizer 48 de 48.

O de pré-preenchimento também **não modela o `aoCarregar`**, então acusa o `bankAccountId` do
pagamento, que é justamente o caso resolvido por lá. Os outros três alertas — `startFrom` da série e
o `includeInValuation` das duas faturas — são campos de escrita que a API não devolve.

Os scripts não estão no repositório — precisariam de `jsdom` como dependência de desenvolvimento e
de um job novo na esteira, e a esteira já roda `vue-tsc`. Reescrevê-los leva minutos.

### O Figma alcançou o código — 04/09/2026

O arquivo [Gestão Auto — ERP](https://www.figma.com/design/JDqJyfVRBwLpDzPVm44QGB/Gest%C3%A3o-Safra-%E2%80%94-ERP)
tinha nove componentes — `Button`, `Badge`, `Input`, `Select`, `SearchBox`, `KpiCard`, `Sidebar`,
`Topbar` e `Logo/Mark`. Modal, textarea, checkbox, combo, tabela editável de linhas, aba, menu de
ações e aviso não existiam no desenho: até 03/09/2026 foram **derivados** da anatomia medida no
`Input` (rótulo 12/18 Medium `text/secondary`, controle 40px, raio 8, borda `border/default`, corpo
14/22) e dos tokens já traduzidos.

Em 04/09/2026 os treze que faltavam foram desenhados a partir do código, e o arquivo passou a ter
**22 componentes** em três seções novas mais a `Aba` na seção de navegação:

| seção | componentes |
| --- | --- |
| 04 · Formulário | `Textarea` · `Checkbox` · `Combo` · `ComboMultiplo` · `LinhasEditaveis` |
| 05 · Dados | `Card` · `Table` · `Pagination` |
| 06 · Sobreposição e Feedback | `MenuDeAcoes` · `Aviso` · `Modal` · `Confirmacao` |
| 03 · Navegação e Estrutura | `Aba` |

**A convenção do arquivo não é a que um design system costuma ter, e vale saber antes de mexer:**
os componentes **não usam os estilos de texto** — os dez estilos existem, mas todo componente define
a fonte direto no nó e amarra **só o fill** a uma variável da coleção `Tokens`. Raio e espaçamento
são literais, porque não há variável de número. Segui isso nos treze; impor estilo de texto agora
deixaria o arquivo em dois dialetos.

Três coisas que isso evitou e uma que ficou aberta:

- Os ícones saíram do `lucide-vue-next` instalado, via `createNodeFromSvg` — é o ícone real, não uma
  aproximação desenhada à mão.
- `Table` reusa as instâncias de `Badge`, `LinhasEditaveis` e `Modal` reusam `Button`, e
  `Confirmacao` é uma instância do `Modal` com o botão trocado para `Variant=Danger`. Mudança no
  `Button` desce sozinha.
- Nenhum fill ou traço ficou sem variável nos nós novos — auditado nó a nó ao fim.
- **`Display/Number` está órfão e diverge**: o estilo é 28/36 e tanto o `KpiCard` quanto o
  `--text-value` do código são 26/34. Não foi mexido, porque nenhum componente o usa; se um dia
  alguém aplicar esse estilo, o KPI muda de tamanho sem ninguém pedir.

A largura do modal no desenho é a `media` (576). `larga` (768) e `cheia` (1152) estão só na
descrição do componente — a instância se redimensiona.

Do cadastro de parceiro, comparado com os prints da issue #2 (04/09/2026):

| pendência | por quê |
| --- | --- |
| papéis marcáveis num cadastro só (CLIENTE, FORNECEDOR, TRANSPORTADORA, ESTRANGEIRO) | hoje cliente e fornecedor são dois cadastros; unificar mexe em `party_account`, nos oito documentos e no aging. Decidido em 04/09/2026 manter separados por ora |
| FUNCIONARIO como papel | é a issue #3, adiada para o RH |
| busca de CEP e de logradouro (as lupas do print) | endereço é sub-recurso; a consulta declarativa já existe e serviria |
| a consulta de CNPJ não preenche endereço | mesma razão: o endereço está em outra aba |

## Travas, máscaras e validação (05/09/2026)

Até aqui o front não tinha **nenhuma** validação de formato. A camada inteira era
`faltamObrigatorios`, que só checava vazio; não havia um `pattern`, `maxlength`, `inputmode`, `min`,
`max` ou `step` no `src` inteiro. Quem barrava era a API, e o `ErroDaApi.erros` pintava o campo —
funcionava, mas ao custo de uma ida ao servidor por erro de digitação.

### O registro de espécies inverteu a dependência

O desenho antigo violava o aberto/fechado: acrescentar um tipo de campo exigia mexer em três
lugares — a cadeia de `v-if` do `GsCampo`, o `switch` do `converter` e os `if` do `vazioDe`.

Agora existe `lib/campos.ts`, um registro que declara, por tipo, tudo o que aquele tipo é: qual
**controle** o renderiza, máscara, o que fazer ao digitar, como validar, como converter para o
corpo da API, como normalizar o que veio dela e qual é o vazio. `GsCampo` passou a renderizar por
`especie.controle` — nove controles — e `formulario.ts` delega ao registro em vez de decidir por
tipo. Tipo novo é uma entrada no registro e nada mais; nenhum dos dois arquivos precisa mudar.

Os tipos ganharam: `cpfCnpj`, `cep`, `telefone`, `email`, `placa`, `uf`, `moeda`, `pais`, `ncm` e
`percentual`. O antigo `documento` virou o *controle* de campo-com-consulta, e `cpfCnpj` é quem o
usa.

### O CNPJ alfanumérico entrou desde o primeiro dia

A IN RFB 2.229/2024 vale a partir de julho de 2026 e o ERP nasce depois disso, então não fazia
sentido escrever o validador só numérico e remendar depois. O formato mantém as 14 posições: as 12
primeiras (raiz e ordem) aceitam letra ou dígito, e os **2 dígitos verificadores continuam
numéricos** — `^[A-Z0-9]{12}\d{2}$`.

O cálculo do DV é o mesmo módulo 11 de sempre, com os mesmos pesos; o que muda é que cada caractere
entra como `ASCII − 48`, então `0`–`9` valem 0–9 e `A`–`Z` valem 17–42. Como para dígito esse
cálculo dá exatamente o valor do dígito, **o validador alfanumérico é uma generalização estrita do
numérico** — nenhum CNPJ antigo deixa de valer. Foi esse o critério usado para conferir.

A consequência que quase passou batido: o `aoDigitar` do campo fazia `soDigitos`, que apagaria as
letras enquanto o usuário digita. Virou `soAlfanumerico`, que também sobe para maiúscula. E o
`inputmode: "numeric"` saiu do tipo `cpfCnpj` — com letra possível, teclado numérico atrapalha. A
`chave` da consulta de CNPJ tinha o mesmo problema e foi corrigida junto.

O CPF continua estritamente numérico, 11 posições: `cpfOuCnpjValido` só trata como CPF o que tem 11
caracteres e é todo dígito, então `1114447773A` não passa por CPF nem por CNPJ.

### As restrições numéricas vieram do contrato, não de palpite

O `docs/api/openapi.json` declara 119 `maxLength`, 125 `minimum` e 11 `pattern` — e o
`openapi-typescript` descarta tudo isso ao gerar o `schema.d.ts`, então essa informação estava no
repositório sem ninguém usar. `lib/contrato.ts` traz esses limites, chaveados por nome de campo, e
a validação os consulta como último recurso, depois do campo e da espécie.

Ficou separado o que a API declara (`DECLARADAS_PELA_API`) do que é regra nossa
(`DO_DOMINIO` — `debit`, `credit`, `sortOrder`, `scheduleNumber`, `voucherId`), porque a primeira
metade se regenera do contrato e a segunda não.

`code` ficou **de fora** do mapa: a API declara `^[A-Z]{3}$` para o código da moeda, mas `code` é
nome genérico no projeto — é também a Referência do item e o Código do centro de custo. Chavear por
nome ali aplicaria a regra de três letras onde ela não vale. A moeda usa o tipo `moeda` no campo.

### A regra da inscrição estadual estava escrita e não era aplicada

O `ajuda` do `taxpayerType` sempre disse "Contribuinte exige inscrição estadual; isento e não
contribuinte não podem ter", e `stateRegistration` era texto solto, sempre visível, nunca
obrigatório. Agora é `visivel` quando `ICMS_CONTRIBUTOR` e obrigatório nesse caso.

O efeito de limpar vem de graça: `corpoDoFormulario` pula campo invisível, e a atualização é
**PUT**, não PATCH — então trocar o parceiro para isento envia o corpo sem a IE e o servidor a
apaga. Se um dia a atualização virar PATCH, essa regra passa a precisar de um `null` explícito.

### O que não foi feito, e por quê

- **Consulta de CEP** — não existe endpoint. Continua na lista de pendências acima, com o CNPJ
  como molde pronto.
- **Formato de inscrição estadual** — varia por UF; validar errado seria pior que não validar.
- **Cursor no meio do texto mascarado** — a máscara formata no getter e desfaz no setter. Digitar
  no fim funciona; editar no meio joga o cursor para o fim. Trocar isso por controle de seleção só
  se alguém reclamar.
- **Teste automatizado** — o projeto não tem runner. Os dígitos verificadores foram conferidos
  contra documentos reais conhecidos e contra o exemplo oficial da RFB para o alfanumérico
  (`12.ABC.345/01DE-35`), 51 asserções ao todo, mas isso não ficou no repo. É a dívida mais
  incômoda desta leva: validação de documento escrita à mão, com valor legal, e sem rede.

## NCM e unidade tributável (05/09/2026)

A API passou a exigir duas coisas que a tela não pedia: **NCM na mercadoria** e **unidade tributável
em toda unidade de medida**. Sem isto o formulário salvaria e o servidor recusaria — erro de servidor
para regra que a tela tinha como mostrar.

### O NCM virou escolha, não digitação

Era um campo de oito dígitos com máscara. Digitar oito dígitos certos exigia ter a tabela da Receita
aberta ao lado, e um código inexistente só aparecia como rejeição da SEFAZ meses depois.

Agora é `referenciaTexto` contra `/ncm`, com busca no servidor. O rótulo mostra **o caminho da
classificação e a unidade tributável** — `1201.90.00 — Outras (Soja, mesmo triturada · tributado em
TON)` —, porque metade das folhas da tabela se chama "Outras" e escolher entre dez linhas iguais é
escolher por sorte.

**Obrigatório só na mercadoria**, pelo mesmo mecanismo da inscrição estadual: `obrigatorio: true`
mais `visivel: (v) => v.stockItem !== false`. Serviço não tem NCM — quem numera serviço é a lista da
LC 116, na NFS-e.

### O combo aprendeu chave que não é número

`GsCombo` assumia `id` numérico em cinco lugares: a comparação do escolhido, a busca na lista
carregada, o `buscarUm`, o `:key` e o `escolher`. A chave do NCM é o **código**, e `Number("01012100")`
é `1012100` — um NCM que não existe.

Agora a referência declara `chave` (o campo do registro) e `parametroDaChave` (o nome do parâmetro na
rota), e a comparação é por `String`. `GsCampo` deixa de converter para número quando a referência
declara chave própria. As referências antigas não mudaram: sem `chave`, tudo segue como estava.

### A unidade de medida ganhou dois campos

`fiscalUnitCode` é obrigatório e escolhe entre as treze de `/fiscal-units`. `fiscalFactor` é
opcional, e **vazio é resposta**: quer dizer que o fator é do item — a saca tem 60 kg na soja e 50 no
arroz, e quem responde por isso é a conversão por item, que já existia.

As nove unidades semeadas no provisionamento já nascem associadas, então o cliente novo não encontra
o campo vazio; quem cria a décima é que escolhe.

### O que não foi feito

**A quantidade tributável não aparece na tela.** `GET /items/{id}/tax-quantity` existe e responde —
dez sacas de soja são 0,6000 TON —, mas mostrar isso pede um lugar: ou uma linha no painel do item,
ou uma coluna no documento de venda. Enquanto ninguém monta linha de nota, seria número na tela sem
uso. Fica na lista de pendências.

### A linha ficou curta, e a prévia responde pelo resto (05/09/2026)

Testando em homologação, o campo de NCM mostrou o problema que nenhum ajuste de CSS resolve: numa
lista onde **um terço das 10.515 folhas se chama "Outros"**, o nome sozinho não decide nada. A minha
primeira tentativa — empilhar código, descrição, caminho e unidade numa string só — piorou: a linha
ficou longa e truncou justamente no caminho, que é o que desempata.

Depois de comparar quatro tratamentos num mock, ficou **linha navegável mais prévia**:

- a **linha** volta a ser curta — `1201.90.00 — Outras` —, que é o que se lê correndo a lista;
- a **prévia** ao lado mostra código, descrição, classificação inteira, **unidade tributável** e a
  fonte legal;
- e ela acompanha o **foco**, não a escolha: percorrer com as setas atualiza o painel, então dá para
  comparar candidatos sem escolher nenhum.

A unidade tributável na prévia não é enfeite: é ela que muda a quantidade que vai na nota. Escolher
"para semeadura" vendendo grão troca `KG` por `TON`, e esse é o tipo de erro que hoje só apareceria
na rejeição da SEFAZ.

**A prévia é opcional e declarada pela referência** (`previa?: (registro) => LinhaDePrevia[]`), não
embutida no `GsCombo`. Combo sem prévia declarada continua exatamente como era — nenhuma das outras
vinte referências mudou. O painel com prévia é mais largo que o campo e ancora pela direita quando
não caberia na janela, decidido na abertura.

**Ainda falta**: `role="listbox"`, `aria-activedescendant` e rolar o item em foco para dentro da
vista quando a lista é longa. E a seção "usados neste cliente" no topo, que depende de um endpoint
que a API ainda não tem — é o ganho maior que sobrou da comparação.

## Formulário grande anda em passos (05/09/2026)

A issue #4 dizia a regra e o motivo: formulário que não cabe na tela **não rola** — mostra a
evolução em passos horizontais, para a pessoa ver onde está e quanto falta. O gatilho para
implementar foi outro, e menor: o campo de NCM ficava espremido em meia coluna, e a lista voltava a
mostrar dez linhas escritas "Outros" porque não havia largura para o caminho.

### O corte mora num lugar só

`SECOES_ATE_ROLAR = 2`, em `src/lib/passos.ts`. Duas seções cabem na altura de um modal; a terceira é
onde alguém começa a arrastar sem saber onde termina. **Passo em cadastro de três campos é pior que
rolagem**, então formulário curto continua exatamente como era — dos 35 recursos, **12 passam a ter
passos** (item, clientes, fornecedores, empresas, os quatro documentos com linhas, pagamentos,
recebimentos, lançamentos, caixas) e 23 não mudam.

### A seção já era o passo

Não foi preciso inventar estrutura: `SecaoDeFormulario` tem título e um conjunto de campos que
pertencem um ao outro. O passo é a seção; **linhas filhas viram o último passo**, porque tabela
editável dividindo espaço com campos deixa os dois apertados.

O `GsFormulario` não mudou — recebe o formulário **recortado** na seção do passo. Regra duplicada é
regra que diverge, então a validação do passo reusa a do formulário inteiro sobre uma seção só.

### Três coisas que o passo obriga a acertar

- **Cobrar na saída de cada passo.** Obrigatório do passo 1 aparecendo quando a pessoa chega no 3 é
  exatamente o defeito que os passos existem para não ter.
- **O rascunho guarda o passo.** Recuperar o preenchimento e devolver a pessoa ao começo faria ela
  procurar onde parou — que é o que o rascunho evita. Rascunho antigo, sem o campo, abre no passo 1.
- **Erro do servidor salta para o passo do campo.** Campo recusado num passo fora da vista seria
  erro invisível.

### O que isso fez pelo NCM

Com o passo curto, o campo ganhou linha inteira (`inteira: true`) e a lista voltou a caber o
desempate: `1201.90.00 — Outras · Soja, mesmo triturada`. O caminho na linha é só o **degrau mais
próximo** — o capítulo inteiro não cabe e não ajuda; o resto continua na prévia.

### O repositório não é formatado por prettier (05/09/2026)

Rodei `npx prettier --write` em alguns arquivos e ele veio com o padrão dele — **80 colunas** —,
reformatando código que não era meu. Medido depois: com `printWidth: 100`, que é a largura de fato
do repo, **50 dos 101 arquivos** ainda divergem, e um `--write` geral mexeria em cerca de **25 mil
linhas**. Ou seja: o estilo daqui é escrito à mão e apenas *se parece* com o do prettier.

Entrou `.prettierrc.json` com a largura certa, o prettier como dependência de desenvolvimento e os
scripts `format` e `format:check`. **Isso não adota o prettier no repo** — serve para que rodá-lo
num arquivo não produza mais um diff a 80 colunas por engano.

Adotar de verdade é decisão de quem cuida do repo, e custa um commit só de formatação em 50
arquivos, que reescreve o `git blame` de todos eles. Enquanto isso não acontecer, `format:check`
falha por desenho — ele não está no portão de qualidade.

### Escolher o NCM sugere a unidade de estoque (05/09/2026)

Testando em homologação: NCM escolhido, e a unidade de medida seguia vazia — nada ligava uma coisa
na outra. O NCM diz em que unidade a Receita mede aquela mercadoria; a unidade de estoque é a régua
do cliente. Elas têm de ser da mesma grandeza, e a API passou a recusar o item quando não são.

A referência ganhou um gancho — `aoEscolher(registro, valores)` — que devolve o que a escolha sugere
para outros campos, pelo mesmo caminho que a consulta de CNPJ já usava (`@preencher`). No NCM: se a
unidade de estoque ainda está vazia, busca as unidades do cliente e escolhe a que corresponde à
unidade tributável, preferindo a que a mede em si — quilo antes de tonelada.

**É sugestão, e só quando o campo está vazio.** Sobrescrever o que a pessoa escolheu três passos
atrás seria pior que não sugerir nada.

### O vocabulário do cadastro de produtos, e o atalho da variante (05/09/2026)

Da revisão do cadastro de produtos vieram sete pedidos. Três já estavam de pé — a REF gerada pelo
sistema, as unidades associadas à unidade fiscal e o NCM pesquisável que deduz a unidade. Dos
outros quatro, três eram vocabulário e um era caminho.

**"Referência" virou "REF" na tela, e só na tela.** O campo continua `code` na API, onde ele
atravessa item, movimento de estoque, PDV, nota e relatório. Renomear o campo técnico para
acompanhar um rótulo seria quebra de contrato em troca de nada: ninguém que usa o sistema vê o nome
técnico.

**"Unidade de estoque" virou "Unidade de medida".** O termo novo é o da SEFAZ, e não disputa espaço
com "unidade tributável", que é outro campo e continua com o nome dele.

**O prazo de validade continua em dias, e a ajuda explica por quê.** O pedido era trocá-lo por um
calendário. O calendário existe, e está no lugar certo: é o `expiryDate` de cada lote. O prazo em
dias é propriedade da mercadoria — é ele que calcula aquela data a partir da fabricação, e é o que
permite duas remessas do mesmo item vencerem em dias diferentes. Trocar dias por data no item faria
todo lote daquele produto vencer junto, que é falso no depósito. O campo ganhou ajuda dizendo onde
a data mora.

**Aba de painel pode ter atalho na linha.** Cadastrar variante exigia abrir o item e caçar a aba.
`AbaDePainel` ganhou `atalho`, e o menu da linha passa a abrir o painel já naquela aba. O
`disponivel` é o que mantém o atalho fora da linha que não é modelo — atalho que aparece em toda
linha e serve em uma vira ruído. O painel continua sendo o caminho para olhar o registro inteiro;
o atalho é para quem já sabe o que vai fazer.

### O wizard do item: quatro passos, o padrão que não se preenche, e a trilha com erro (05/09/2026)

Da mesma revisão vieram cinco pedidos sobre o wizard. Três entraram, dois ficaram para decisão.

**Passos 2 e 3 viraram um só, "Controle".** "Como o item se comporta" e "Rastreabilidade" eram
seções curtas e vizinhas — quem marca "controla estoque" marca "controla lote" na mesma ideia. O
wizard recalcula sozinho e caiu para quatro passos. O "Inativo" saiu daí e subiu para a
identificação, que é onde a pessoa decide o que o registro é.

**O método de custeio mostra o padrão da empresa sem preenchê-lo.** O pedido era predefinir o campo
com o valor configurado na empresa. Fazer isso ao pé da letra quebraria a herança: na API,
`valuationMethod` nulo no item significa "segue a empresa" (`Item.valuationMethodOr`), e gravar o
valor congelaria o item — quando a empresa mudasse de método, todo item cadastrado por esta tela
ficaria para trás, calado.

Então `placeholder` passou a aceitar função, e o campo vazio se lê **"Segue a empresa — Médio
móvel"**. A pessoa vê o que vai valer, e o que vai para a API continua sendo nulo. O padrão da
empresa entrou na store de padrões, na mesma busca que já trazia a moeda.

**Não renomeamos para "Organização de Estoque".** PEPS e médio móvel são método de valoração, não
organização; o rótulo pedido descreveria outra coisa.

**A trilha marca o passo que tem erro.** O salto para o passo do campo recusado já existia, mas o
servidor recusa vários campos de uma vez e nem todos moram no mesmo passo — o que ficava para trás
virava erro invisível, que é o defeito que o salto existe para não ter. `passosComErro` devolve os
índices, e a trilha pinta o número, o ícone e o título. De quebra, o `GsSelect` ganhou `hint`: até
agora um campo de opções ficava com a borda vermelha e **nenhuma mensagem**, porque só ele não
recebia a ajuda.

### O dia de entrada do item, e "Variantes" virou "Similares" (05/09/2026)

Os dois pedidos do wizard que estavam parados esperando decisão.

**O item inativo ganhou "Entra em uso em".** Um campo de data que só aparece com o "Inativo"
marcado — agendar a entrada de um item que já está em uso não quer dizer nada, e a API recusa. Em
branco, o item fica parado até alguém ativá-lo; com dia marcado, ele entra sozinho de madrugada.

A coluna Situação passou a distinguir os dois: item inativo com dia marcado mostra **"Entra em
01/10"** em vez de "Inativo". Sem isso, a listagem apagaria justamente a informação que o campo
existe para dar, e a única forma de saber quais itens estão agendados seria abrir um por um.

**"Variantes" virou "Similares" na tela, e só na tela.** Decisão do cliente, tomada com o custo à
vista: o modelo continua `variantOf`, `template` e `ItemVariantService`, porque renomear a API por
causa de um rótulo quebraria o contrato sem mudar nada para quem usa. A consequência a registrar é
que tela e API passam a falar palavras diferentes para a mesma coisa — quem for ler o código
depois de ver a tela precisa saber disso, e é para isso que este parágrafo existe.

O que **não** mudou: a rota `/eixos-de-variante`, que é URL, e os nomes internos do componente. A
troca alcançou rótulo, título de passo, aba, botão, texto de vazio e mensagem de sucesso.

### "É imobilizado" virou "Bem de uso da empresa" (05/09/2026)

Quem preenche o cadastro de item é o produtor, e "imobilizado" é palavra de contador — o campo
pedia para ser lido duas vezes por alguém que já sabia a resposta. O rótulo passou a dizer o que a
marca significa: **"Bem de uso da empresa"**, com a ajuda dando os exemplos e a ponte de volta para
o termo técnico ("é o que a contabilidade chama de imobilizado"). Assim a tela fala com o produtor
sem deixar o contador sem o vocabulário dele.

**O `FIXED_ASSET: "Imobilizado"` do `opcoes.ts` NÃO mudou**, e a diferença importa: aquilo é tipo
de conta no plano de contas, onde quem lê é o contador e a nomenclatura oficial é o que ele
procura. Renomear ali trocaria clareza por confusão na tela errada.

Fica registrado o que a troca deixa mais visível: a marca **não faz nada** hoje — é gravada,
devolvida pela API e copiada para o similar, e nenhum trecho do sistema a lê para decidir. Não há
registro de bens nem depreciação, e a tela permite marcar "Controla estoque" junto com ela, que é a
combinação que o ERPNext proíbe (item imobilizado tem de ser não-estocável, exige categoria de
ativo e é recusado se já tiver movimento). Com o rótulo em português claro a contradição fica mais
fácil de cometer, não menos.

### O NCM passa a trocar a unidade, e anuncia a troca (06/09/2026)

A sugestão que subiu ontem só preenchia o campo vazio, para não atropelar escolha. Testando em
homologação o resultado foi o oposto do pretendido: escolhida a unidade errada no passo 1 — que é
justamente o erro comum —, o NCM do passo 4 não corrigia nada e o item seguia até o fim calado.

Agora troca. Campo vazio continua sendo preenchido em silêncio; campo já escolhido é trocado e a
troca vira **modal centralizado com Desfazer**. Trocar calado seria pior que não trocar: a unidade
de medida é a régua do depósito, e mudá-la sem avisar mudaria a contagem de quem sabia o que queria.

**A mensagem separa dois casos, porque a saída é diferente.** Grandezas iguais convertem — grama e
quilo —, a API aceita as duas, e desfazer é escolha legítima de quem conta assim. Grandezas
diferentes não convertem: em litro a nota não teria como declarar a quantidade e o cadastro seria
recusado, então desfazer só resolve se o errado for o NCM. Sem essa distinção o aviso mentiria
metade das vezes.

Para saber qual é o caso, a tela passou a ler `/fiscal-units`, que publica o `baseCode` — é ele
que diz se duas unidades tributáveis são da mesma grandeza. O endpoint devolve **array puro**, e
não página; o `listar` já normaliza os dois, então `.content` continua valendo.

`aoEscolher` deixou de devolver `Valores` e passou a devolver `{ valores, anuncio? }`. O anúncio
sobe por evento até o `FormularioDeRecurso`, que é quem tem o modal — e carrega o `desfazer`
consigo, para o aviso não ser só um comunicado. A decisão de troca ficou em `lib/unidades.ts`,
função pura e coberta por teste, fora do componente.

**O que não mudou:** "Peso por unidade" e "Unidade de peso" continuam vazios. São de frete, o
número só o cliente sabe, e preencher a unidade sem o peso não adiantaria nada.

**Visto em homologação, dois ajustes.** O `GsModal` alinha no topo, que é o certo para formulário —
ele cresce para baixo, e centralizar faria o campo de cima subir e descer a cada passo. Aviso curto
é o contrário: encostado no topo fica órfão, longe de onde o olho está. Entrou `centralizado`, e o
anúncio usa.

E o texto foi reescrito. A primeira versão tinha quatro frases e falava "é tributado em",
"grandeza", "declarar a quantidade", "o cadastro seria recusado" — vocabulário de fisco, para uma
tela que o produtor preenche. Agora abre pelo que interessa a ele: **"A nota mede este produto em
Quilograma, e o item estava em Grama."** O termo técnico saiu do aviso e continua onde tem dono, na
ajuda do campo NCM e no erro da API.
---

## 06/09/2026 — o Figma virou fonte, e o que isso custou

Seis decisões, todas em `docs/design-system.md` §7.7 com o mesmo identificador. O que segue é o
porquê de cada uma, que não cabe na tabela.

**D1 — quem vence quando Figma e código divergem: o componente medido.** Não o arquivo, não o
código: o que o componente real faz. A regra pagou nos dois sentidos no mesmo dia. A `Sidebar` da
biblioteca tinha item de menu a 12,5 e raio 7, e perdeu — o `AppSidebar.vue` usa `text-body` (14) e
`rounded-control` (8). Já o cabeçalho de tabela ganhou do código: o Figma e o `design-system.md`
diziam `Caption/Overline` (11 SemiBold), e `GsTable`/`GsTabelaCompacta` usavam `text-caption`
(11 Regular). Dois contra um, e o código foi corrigido.

Vale registrar um erro de leitura pelo caminho, porque ele quase virou conclusão: a `Sidebar` com
12,5 / 9,5 / 10,5 / raio 7 parecia frame escalado a 0,875, e o número fecha em quase todos os
valores. Não era. O wordmark `Gestão Auto` está a 14 nos dois lados, e escala uniforme teria
levado ele junto. Eram valores à mão, um a um.

**D2 — 16 estilos aplicados, não 18 publicados.** Havia 18 combinações tamanho/peso em uso e 10
estilos publicados, e **nenhum nó do arquivo usava estilo nenhum** — 0 de 154 na biblioteca, 0 de
4.347 nas telas. Publicar um estilo por uso real deixaria tudo ligado a token sem mudar um pixel, e
é justamente por isso que seria pior: fossilizaria `9,5/14` e `12/AUTO` como especificação. Quatro
dos estilos novos não são deriva, são lacuna — 18/26, 12,5, 11,5 Regular e 11/16 Regular estavam em
uso e não tinham token. A distinção importa para quem mantiver: deriva se corrige com disciplina,
lacuna se corrige evoluindo a escala.

**D3 e D4 — as duas mudanças que se veem.** `text/muted` a `#8a9199` dava 2,91:1 sobre `bg/app`.
São 85 usos em 38 arquivos: placeholder, dica de campo, paginação, subtítulo de modal, ícone em
repouso. `#6a6f75` passa em AA nos dois fundos e ainda se distingue do `ink-soft`. E `border/default`
a `#e3e6ea` dá 1,25:1 — irrelevante numa divisória, e reprovando em 1.4.11 quando é o **contorno de
um campo**, que é o que identifica o controle. Daí `border/field` `#8b8e94`, que passa contra os dois
vizinhos do contorno: o branco de dentro e o `bg/app` de fora. A borda ficou mais pesada, e é o preço.

**D5 — três moldes, não 45 telas.** O achado mais duro da auditoria não é de token: as telas não são
montadas com a biblioteca. 464 instâncias em 12.764 nós; `Contas a Receber & Pagar` tem 3 instâncias
em 376 nós. Quer dizer que tudo que se corrige na biblioteca propaga para zero telas, e que cada
defeito aparece 45 vezes porque foi copiado 45 vezes. Reconstruir as 45 é caro; o que foi feito é a
correção sistêmica por script — que resolve escala, cor e raio de uma vez — mais `Itens — Lista`,
`Pedido de Venda — Detalhe` e `Empresa — Formulário` reconstruídos com instâncias, porque quase toda
tela restante é uma lista, um documento ou um formulário. As originais **não foram apagadas**.

Montar os moldes revelou três lacunas de componente que o inventário não mostrava: não há `Passos`,
não há par rótulo/valor, e a `Sidebar` não tem propriedade de item ativo — por isso as três telas da
página `14 · Moldes` mostram `Dashboard` aceso, seja qual for a tela.

**D6 — sem tema escuro.** Fora de escopo agora. Quem for adicioná-lo depois vai ter de renomear as
superfícies por elevação semântica antes de qualquer outra coisa: `bg/app` e `bg/surface` são dois
cinzas muito próximos, e essa técnica não traduz no escuro sem bordas.

---

## O proxy do dev lia a variável errada (06/09/2026)

A tela de Pedidos de Venda abria com "A API não respondeu (HTTP 500). Verifique se ela está no ar em
https://api.gestaosafra.dev". A API estava no ar: `/actuator/health` respondia 200 e, sem token,
401 com `ProblemDetail` correto. **O 500 era do proxy do Vite, não da API.**

O `vite.config.ts` lia `process.env.VITE_API_TARGET`, e **o Vite não povoa `process.env` a partir
do `.env`** — arquivos de ambiente vão para `import.meta.env`, que é do cliente; no arquivo de
configuração é preciso `loadEnv`. O resultado é a pior combinação possível:

- o cliente lê `import.meta.env.VITE_API_TARGET` e **monta a mensagem de erro com o alvo certo**;
- o proxy lê `process.env.VITE_API_TARGET`, acha `undefined` e cai no fallback
  `http://localhost:18080`, onde não há nada escutando.

Conexão recusada no proxy vira 500, e a tela acusa uma API saudável. A variável parece funcionar
justamente porque aparece na mensagem — é o que faz o defeito durar.

Agora a configuração usa `loadEnv(mode, process.cwd())`, e `VITE_API_TARGET` passa a valer para os
dois lados de uma vez.

### O que isto ensina sobre a mensagem de 5xx

`mensagemDeErro` descarta o `detail` do servidor quando o status é 5xx e manda conferir se a API
está no ar. Aqui isso mandou olhar para o lado errado. Trocar o texto não resolve sozinho: o
`GlobalControllerAdvice` da API responde 500 com `"An unexpected error occurred."` de propósito, e
o motivo real só existe no log. O que faria diferença é o `ProblemDetail` de 500 carregar um
identificador de correlação que a tela mostre e o log registre — hoje não há, e sem acesso ao
cluster um 500 é indiagnosticável pela tela.

## 06/09/2026 — o módulo de RH, e o que ele quebrou na máquina declarativa

A primeira tela do RH é **Usuários** (`/usuarios`, `src/lib/recursos/rh.ts`), e ela é declarativa
como as outras: uma entrada de objeto, sem página própria. O que ela exigiu não foi tela — foi
consertar duas suposições que a `ListaPage` fazia e que ninguém tinha esbarrado ainda.

### Funcionário e usuário são a mesma pessoa

Não há cadastro nosso de funcionário. Quem trabalha no cliente entra no sistema, e quem entra é
usuário do Keycloak: a lista é a dos membros da organização, e o perfil é o grupo dele dentro dela.
Um cadastro nosso ao lado criaria duas verdades sobre quem tem acesso — a nossa e a que o token diz
—, e a que vale é sempre a segunda.

### O id deixou de ser número

`ListaPage` chamava `Number(registro.id)` em três lugares: abrir para edição, excluir e executar
ação. Funciona enquanto todo recurso for numerado pelo banco. O usuário não é — o id dele é o uuid
do Keycloak, e a coerção o transformava em `NaN`. A chamada saía para `/hr/users/NaN` e falhava
longe da causa, porque `Chave` sempre aceitou `number | string`; quem estreitava era a página.

`chaveDoRegistro` devolve número quando o id é numérico e a string quando não é. É deliberado não
passar o id cru: um id que chega como `"5"` continua virando `5`, e nenhum recurso existente muda de
comportamento.

### "Excluir registro" mentiria sobre o que acontece

A confirmação de exclusão era fixa, e dizia que *"a API faz remoção lógica, mas o registro some das
listagens"*. Para cadastro é verdade. Para usuário seria mentira em duas frentes: a pessoa não é
apagada, e o que acontece é ela **sair deste cliente**. Alguém leria "Excluir" e acharia que apagou
a conta de outra pessoa.

Daí `Recurso.exclusao`, opcional: título, mensagem, rótulo do botão e o aviso de sucesso. Sem ela o
texto é exatamente o de antes. No RH ela vira **"Desligar do cliente"**, e a mensagem diz que a
conta continua existindo.

### Desativar a conta não é desligar do cliente, e a tela precisa dizer isso

O Keycloak não tem "desativado só neste cliente" — desativar bloqueia a pessoa no realm inteiro.
Para o contador que atende duas fazendas, desativar numa tira o acesso da outra também.

As duas operações ficaram, com palavras diferentes: **Desligar do cliente** é a exclusão, e é o
caminho normal; **Desativar conta** é ação de perigo, e a confirmação diz em maiúscula que bloqueia
TODOS os clientes de que a pessoa participa. Esconder a segunda seria mais seguro e deixaria sem
resposta o caso de alguém que precisa mesmo ser barrado em tudo.

### O que ainda não existe

**A API.** Nenhuma das rotas (`/hr/users` e as ações) existe — são a issue `#28` da API, que depende
da `#25`. A tela está escrita contra esse contrato e vai dar 404 até ele subir; o `recurso.ts` faz
cast `as never`, então o `vue-tsc` não acusa. Não confundir "typecheck verde" com "funciona".

**Reenviar convite.** Um usuário parado em `INVITED` não tem saída pela tela. Ficou de fora porque
a `#28` não prevê a rota, e inventá-la aqui criaria botão sem endpoint atrás — que é exatamente o
que a auditoria de cobertura existe para achar.

**Perfil é um só por pessoa.** O formulário tem um select, não marcação múltipla. O Keycloak aceita
a pessoa em vários grupos, e o dia em que perfis compostos existirem (issue `#30` da API) este campo
vira `referencias`.

## 07/09/2026 — o menu sumiu quando os papéis de realm saíram

Regressão introduzida no mesmo dia, do lado da API, e sentida aqui: **a aba de RH desapareceu do
menu**, e com ela toda ação que exige papel.

### O que aconteceu

A `#27` da API removeu os cinco papéis de cliente do realm — `TENANT_ADMIN`, `COMERCIAL`,
`FINANCEIRO`, `OPERADOR`, `CONTADOR` —, porque desde o `ADR-0016` o perfil passou a viver no
**grupo** da organização: `/<cliente>/<PERFIL>`.

O backend foi ensinado a ler grupo (`TenantJwtConverter.profilesOf`). **O front não.** O
`sessao.ts` lia só `realm_access.roles` e `resource_access.*.roles`:

```ts
const doRealm = perfil.realm_access?.roles ?? [];
const dosClients = Object.values(perfil.resource_access ?? {}).flatMap((c) => c.roles ?? []);
papeis.value = [...new Set([...doRealm, ...dosClients])];
```

Com os papéis removidos, os dois vieram vazios. `temPapel` passou a responder `false` para tudo, e
o menu escondeu o que exige papel. O RH foi o mais visível porque exige `TENANT_ADMIN`.

O próprio `ADR-0016` avisava — *"o token precisa carregar o grupo, e sem isso ninguém autoriza
nada"* — e o aviso foi cumprido de um lado só.

### O conserto

`sessao.ts` passa a ler o claim `groups`, com o mesmo recorte do converter: caminho
`/<cliente>/<PERFIL>`, alias em minúscula, e **grupo de um nível só é ignorado** — o grupo do
cliente existe para pendurar perfis, e tratá-lo como perfil produziria o papel `fazendaboavista`.

E `papeis` deixou de ser calculado uma vez no login: virou **derivado do cliente selecionado**.
Desde o `ADR-0016` o perfil é por cliente, e quem administra a fazenda A e apenas opera na B entra
nas duas com o mesmo token — o menu tem de mudar junto. Na prática trocar de cliente recarrega a
página (`tenant.ts` chama `window.location.assign`), então o token seria relido de qualquer forma;
derivar é o que torna isso verdade por construção em vez de por acidente.

Os papéis de realm continuam somando. Sobrou `PLATFORM_ADMIN` lá, que é de plataforma e vale em
qualquer cliente por decisão da `autorizacao.md`.

### A lição, que é de fronteira e não de código

Autorização mudou de lugar no provedor de identidade, e **dois sistemas liam aquele lugar**. Medir
o backend contra o Keycloak não provou nada sobre o front, porque o front lê o mesmo token por conta
própria. A conferência de que "o token traz o grupo" foi feita — e passou — sem que ninguém
perguntasse quem mais lê o token.

## 07/09/2026 — a tela de perfis de acesso, e o que ela ainda não faz

Primeira peça da `#6`. Ela mostra o catálogo de permissões e **não compõe perfil ainda** — a razão
está no fim.

### A lista vem da API, e isso não é detalhe

`GET /authorization/permissions`, sempre. É o princípio do `ADR-0017` da API: a tela não pode
oferecer um recorte sem endpoint atrás. Uma cópia das 157 permissões aqui divergiria no primeiro
endpoint novo — e divergiria em silêncio, oferecendo ao cliente uma permissão que não autoriza nada.

### O problema de desenho, e o que resolveu

**157 permissões em 45 recursos não se escolhe numa lista.** A saída foi partir do perfil: clicar em
`COMERCIAL` recorta o catálogo para as 53 dele, e a busca filtra por cima disso.

A ordem dos dois filtros importa, e custou pensar: **primeiro o perfil, depois o texto**. O inverso
mostraria cartão de recurso vazio — quem procurasse "item" com `OPERADOR` escolhido veria o cartão
de itens sem linha nenhuma, sem entender que o perfil é que não alcança nada ali.

### O contrato do front estava 13 rotas atrás

`docs/api/openapi.json` tinha **196 rotas** e a API já servia **209**. Atualizado do contrato vivo e
`npm run api:types` rodado — os tipos da tela saem daí, e não de declaração à mão.

### Verificado por SSR, e vale repetir a receita

As quatro rotas — a nova, `/usuarios`, `/dashboard` e `/itens` — renderizadas pela API Node do Vite
com jsdom, tratando `console.error` como falha. Nenhum erro.

Duas coisas que custaram uma rodada, e que o diário já avisava mas eu tropecei mesmo assim:
`location` e `navigator` só entram por `Object.defineProperty`, e o router **não** tem export
default — é `export const router`, e importar como default dá "Cannot read properties of undefined".

### O que ela ainda não faz, e por que não é preguiça

Compor perfil exige mapear papel de client num grupo do Keycloak, e **a aplicação não consegue**:
`GET /clients/{uuid}/roles` responde **403** para o service account dela, mesmo sabendo o uuid.
Medido em 07/09/2026, contra o Keycloak de homologação.

Não é configuração esquecida — é o least-privilege que a `keycloak.md` §4.3 escolheu de propósito,
e ampliá-lo é decisão de quem opera, não minha. Enquanto isso a tela é o que dá para ser sem mentir:
a resposta honesta para "o que o COMERCIAL pode fazer?".

## 07/09/2026 — o campo "Funcionário" do caixa, e o 404 que ele escondia

Dois defeitos no formulário de caixa, achados investigando um erro que **não era** de permissão.

### A referência apontava para um caminho que nunca existiu

`refFuncionario` pedia **`/employees`**. Não havia cadastro de funcionário em lugar nenhum até
07/09/2026, e quando ele nasceu foi sob **`/hr/employees`**, ao lado de `/hr/users`.

Enquanto isso a referência devolvia **404 em silêncio** e o combo aparecia vazio — como se não
houvesse funcionário cadastrado, e não como se o endereço estivesse errado. Um erro que se disfarça
de estado normal é o que demora mais a aparecer.

### E o campo não existia no contrato

`campo: "employeeId"` com `leDe: "employee"`. O `PosProfileRequestDTO` **não tem `employeeId`**, e o
`PosProfileResponseDTO` não devolve `employee` nem nada parecido. Conferido no `openapi.json`, e
confirmado pelo payload real: o `PUT` sai sem o campo.

Ou seja: **o usuário preenchia e nada era gravado.** É exatamente o que a regra "não ter botão sem
funcionalidade" existe para impedir, e é o que os cruzamentos contra o OpenAPI acham quando alguém
os roda.

**O campo saiu.** Se o caixa deve mesmo ter um funcionário responsável, isso é campo novo no
`PosProfile` da API — decisão de produto, não ajuste de tela. A referência ficou, corrigida: ela
serve a quem precisar de funcionário num formulário, e agora aponta para um recurso que existe.

### Como isto apareceu

Investigando um `PUT /pos-profiles/{id}` que falhava com *"Seu papel não permite esta ação."* A
causa daquele erro era outra — CORS, porque `localhost:5173` não estava na origem permitida de
homologação —, e estes dois vieram junto na leitura do DevTools. O 404 de `/employees` aparecia na
mesma aba de rede, e ninguém tinha reparado porque ele nunca quebrou nada visível.

## 08/09/2026 — o campo "Responsável" do caixa voltou, agora com contrato atrás

Fecha o que a entrada de 07/09 deixou em aberto: *"se o caixa deve mesmo ter um funcionário
responsável, isso é campo novo no `PosProfile` da API — decisão de produto, não ajuste de tela."*

A decisão veio, e o campo existe: `pos_profile.employee_id`, entregue em `4f34868` na API.

### O que a API guarda, e o que ela já guardava

São duas perguntas diferentes, e o sistema precisa das duas:

| | o que responde | quando muda |
| --- | --- | --- |
| `pos_shift.cashier` | quem **abriu** aquele turno | a cada abertura |
| `pos_profile.employee_id` | de quem **é** o caixa | quando alguém decide mudar |

Um caixa aberto três vezes por três pessoas continua sendo o caixa de alguém — e é a segunda que
responde a quem se cobra a diferença quando a contagem de fechamento não bate. A ajuda do campo diz
isso na tela, porque quem cadastra vai perguntar exatamente essa diferença.

### O terceiro defeito da mesma referência

A entrada de ontem achou dois (`/employees` que não existia, e o campo sem contrato). Havia um
terceiro, que só apareceu agora que o combo tem uso: o rótulo lia `r.code ?? r.employeeNumber` e
`r.name`, e **`employeeNumber` e `name` não existem** — o `EmployeeResponseDTO` tem `code` e
**`fullName`**.

O efeito seria o mesmo disfarce de ontem com outra cara: a lista viria cheia e os nomes em branco,
que parece cadastro incompleto e é leitura do campo errado. Achado conferindo o contrato vivo antes
de ligar o campo, e não depois de alguém reclamar.

O nome é `fullName` e não `name` porque aqui a ficha é de uma **pessoa**; o resto do cadastro usa
`name` para coisas que têm um nome só.

### O que a resposta traz, e por que não é um objeto

A issue sugeria `employee: { id, name, code }` aninhado. A API devolve `employeeId` + `employeeName`,
que é a convenção da casa — `customerName` na fatura, `posProfileName` no turno. Um objeto só para
este campo faria a tela tratar um caso especial onde os outros trinta não têm.

### O campo virou plural no mesmo dia

A modelagem mudou depois desta entrada: o caixa tem **responsáveis**, não um responsável. Um balcão
é operado por quem entra de manhã e por quem entra à tarde, e os dois respondem por ele.

O campo passou a `tipo: "referencias"` com `campo: "employeeIds"`, `leDe: "employees"` e
`chaveDoId: "employeeId"` — o mesmo molde do campo de empresas do exercício fiscal, que já existia.
Continua ao lado de Empresa, fechando o branco da primeira linha.

### `parametros` na referência, e por que não um `filtro`

`refFuncionarioComAcesso` precisa pedir só quem tem login. O recorte vai no **servidor**
(`withAccount`), e para isso a `ReferenciaDeCampo` ganhou `parametros`, repassado por `GsCampo` aos
dois combos.

Filtrar no `filtro` local seria mais curto e estaria errado: a página volta com cinquenta registros,
o filtro tira alguns, e não há como buscar o resto — a pessoa procuraria alguém que existe e não
acharia.

### O quarto defeito da mesma referência

`busca: true` significa **o servidor filtra**: o combo para de filtrar localmente e chama
`${recurso}/search?term=`. A marca estava em `refFuncionario` desde sempre, sem uso. Ligar o campo
ativou o bug latente — `/hr/employees/search` não existia, e bastava digitar para dar 404.

Os quatro têm a mesma cara, e é o padrão que vale guardar: **um erro que se disfarça de estado
normal**. Endpoint errado parecia cadastro vazio; campo sem contrato parecia gravação bem-sucedida;
rótulo lendo `name` pareceria cadastro incompleto; rota de busca ausente pareceria busca sem
resultado. Nenhum deles quebra nada visível — por isso todos sobreviveram.

### Ainda pendente

Os tipos (`src/api/schema.d.ts`) e o `docs/api/openapi.json` **não foram regerados**: homologação
ainda servia o contrato anterior quando isto foi escrito. O formulário é declarativo e não depende
do schema para compilar, mas o cruzamento contra o OpenAPI só volta a valer depois da atualização.

## 08/09/2026 — dois gestores, dois caminhos, e o campo que só aparece para um

O caixa ganhou `todosPodemAbrir` na API, e a tela é metade do motivo de ele existir.

### O caso simples não pode tomar conhecimento do conceito

São **dois clientes**, não dois modos do mesmo. O gestor do agro que quer controle escolhe quem
responde pelo caixa; o mais simples quer um caixa geral e pronto.

Se os dois dividissem o mesmo campo, o segundo teria de aprender que **deixar em branco** é a
resposta — uma affordance invisível, que é a pior espécie: não há nada na tela dizendo que o vazio
significa alguma coisa.

Então o campo "Responsáveis" tem `visivel: (v) => v.todosPodemAbrir === false`. Quem não desmarcar
nunca vê que a lista existe.

### O que a caixa de seleção diz, e o que ela precisa desmentir

*"Qualquer pessoa pode abrir turno"*, marcada por padrão. A ajuda desmente a leitura natural:
**marcado não deixa o turno anônimo** — quem abriu continua gravado (`pos_shift.cashier`). Sem essa
frase, o gestor pode recusar o caixa geral por um receio que não procede.

### Onde os dois campos ficam

A caixa de seleção fecha a linha da Empresa — é o branco que a `#5` pedia para fechar. E
"Responsáveis" ganhou a linha inteira: é múltipla escolha, e chips de várias pessoas em meia largura
ficariam apertados.

## 08/09/2026 — o contrato regerado, e os três buracos que ele revelou

`docs/api/openapi.json` foi de **209 para 214 rotas**, atualizado do contrato vivo em homologação, e
`npm run api:types` rodado. As novas: `/sales-invoices/{id}/issue`, `/hr/employees/search` e três de
compras (`prepare-invoice`, `prepare-receipt`) que vieram de `1ab0235` na API.

### O cruzamento, e por que a primeira versão dele não valia

Escrevi um script comparando os `campo:` do registro declarativo com as propriedades que cada
`requestBody` aceita. A primeira versão acusou **44 suspeitas** — e estava errada: não resolvia DTOs
aninhados (campos de linhas-filhas, como `paymentMethodId` do caixa, moram em
`PosProfilePaymentRequestDTO`) e vazava um recurso no seguinte. `/pos-profiles` aparecia "mandando"
`items` e `taxes`, que são de fatura.

Resolvido isso: **zero suspeitas**. E aí veio a parte que importa — *zero* também é o que um script
quebrado devolve. Um controle negativo (apagar dois campos do contrato de propósito) confirmou que
ele acusa quando há o que acusar.

### O controle negativo achou um buraco de verdade

Ele acusou `todosPodemAbrir` e **não** acusou `fiscalOrigin`. Porque `fiscalOrigin` não estava em
formulário nenhum: a API passou a exigir origem da mercadoria para emitir, e a tela não tinha onde
preenchê-la. A pendência da emissão diria *"o item está sem origem"* e a pessoa não teria campo para
consertar.

O campo entrou ao lado do NCM, com as nove opções da tabela e **sem padrão** — `"0"` por padrão
marcaria como nacional, em silêncio, todo item importado.

### Dois irmãos do mesmo tipo

O cruzamento pega "a tela manda o que a API ignora". O caso inverso — **"a API exige o que a tela
não expõe"** — foi conferido campo a campo:

| campo | estado |
| --- | --- |
| `fiscalOrigin` | resolvido (acima) |
| `nfeCode` | resolvido: entrou no cadastro de meio de pagamento, com a tabela `tPag` |
| `operationNatureId` | **não resolvido**, e não dá para resolver aqui |
| `fiscalStatus` e a ação de emitir | **não resolvido** |

`operationNatureId` viraria um combo apontando para `/operation-natures` — e **não existe tela
nenhuma do módulo de tributação**. Seria oferecer escolha de uma lista que ninguém consegue popular,
que é a regra "sem botão sem funcionalidade" ao contrário. Fica para a issue própria, junto com a
exibição do estado fiscal e o botão de emitir.

## 08/09/2026 — a tela do fiscal, e o verificador que ganhou lugar no repo

Fecha a `#7`. Três entregas que se destravam em cadeia.

### 1. Naturezas de operação, com as regras dentro

`/naturezas-de-operacao`, com painel de **Regras** — o mesmo molde dos endereços do cliente. A
natureza sozinha não resolve nada: *"Venda de mercadoria"* não diz qual CFOP sai. Quem diz é a
regra, cadastrada por combinação de **relação de UF × regime**.

Relação e regime em branco significam "vale para qualquer um", e a mais específica ganha — então um
padrão geral convive com a exceção sem obrigar a cobrir todas as combinações. A coluna de situação
mostra **"Falta alíquota"** quando o perfil é tributado e a alíquota está vazia, que é o único jeito
de ver isso antes de a emissão recusar.

### 2. O campo de natureza, agora que há de onde escolher

Entrou na fatura de venda e no caixa. Era a razão de eu **não** o ter posto ontem: seria um combo
apontando para uma lista que ninguém conseguia popular pela interface.

### 3. Emitir, e o 422 que é uma lista de tarefas

`AcaoDeRecurso` ganhou `formulario`. Até aqui toda ação de registro era um POST vazio atrás de uma
confirmação — "lançar", "cancelar". Emitir precisa perguntar o **modelo** (a mesma venda pode virar
NF-e ou NFC-e) e, quando não há baixa, a forma de pagamento a declarar. Confirmação não tem onde
receber resposta, então a ação com formulário reusa o `FormularioDeRecurso` que a ação de tela já
usava, com a rota montada do registro.

E o `GsAvisos` passou a preservar quebras de linha (`whitespace-pre-line`). **Sem isso a entrega não
funcionava:** a emissão devolve *todas* as pendências de uma vez, uma por linha, e o toast colapsava
tudo num parágrafo ilegível. A recusa é uma lista de coisas a fazer, e precisa parecer uma.

A coluna "Nota" mostra o estado fiscal. `EMITINDO` é o que mais importa: a emissão é assíncrona, e
sem ele a pessoa não sabe se a nota está a caminho — e clica de novo.

### O verificador de contrato virou `npm run api:cruzar`

Escrito ontem como script de rascunho, achou dois defeitos reais (`fiscalOrigin` e `nfeCode` sem
campo na tela). Hoje entrou no repositório — mas só depois de o controle negativo o reprovar.

A primeira versão varria **um** dos três lugares onde um formulário mora. Apagar `model` e `cfop` do
contrato de propósito não produziu acusação nenhuma: campos de **ação** e de **sub-recurso** não
eram lidos. Um verificador com ponto cego é pior que nenhum — dá a confiança sem a cobertura.

Agora varre os três (recurso, ação, sub-recurso), e o controle negativo acusa os três.

O que ele **não** pega, e não há como pegar automaticamente: o caso inverso, "a API exige o que a
tela não expõe". Campo opcional no contrato pode ser exigido só na emissão, e campo que ninguém usa
é legítimo. Esse continua a mão — está escrito no cabeçalho do script.

---

## 09/09/2026 — o CFOP saiu do texto livre, e o campo que a API já ignorava

Fui olhar homologação e a tela de natureza da operação estava igual. Estava mesmo: a API ganhou a
tabela de CFOP com os 619 códigos, e **nenhuma tela consome**. Entreguei o contrato e não a tela — o
front é outro repositório e ficou de fora do escopo. Este é o conserto.

### O campo que a API já ignorava em silêncio

Pior que a ausência: o formulário de regra ainda mandava `ufScope` ("Relação de UF", com ajuda
dizendo *"em branco, vale para qualquer relação"*). A API tinha removido esse campo — o âmbito passou
a sair do primeiro dígito do CFOP. Como o Spring ignora propriedade desconhecida por padrão, quem
escolhesse "Entre estados" e salvasse com CFOP `5102` teria a escolha **descartada sem aviso**, e a
regra gravada como interna.

É exatamente o modo de falha que o `ADR-0020` existe para fechar, entrando pela porta do front. O
campo saiu do formulário.

### O CFOP virou seletor, com o mesmo desenho do NCM

Era `tipo: "texto"` com placeholder `5102` e a ajuda *"quatro dígitos, começando em 1, 2, 3…"* — ou
seja, o usuário precisava saber o código de cor. Agora é `referenciaTexto` sobre `/cfops`, com busca
por código ou título, agrupamento pelo primeiro dígito (que é o que separa entrada de saída e
interna de interestadual) e prévia com a nota explicativa da lei.

A etiqueta "devolução" aparece na linha porque é a distinção que a regra de devolução usa: código de
devolução em natureza de venda normal é recusado no lançamento, e ver isso na escolha evita
descobrir depois.

### A coluna que nunca mais diz "Qualquer"

A lista mostrava `ufScope` com fallback `"Qualquer"` para nulo. Não há mais nulo: toda regra tem
âmbito, derivado do código. O fallback saiu — deixá-lo seria manter na tela uma possibilidade que o
modelo não representa mais.

### O que ficou pendente, e por quê

`docs/api/openapi.json` e `src/api/schema.d.ts` **não foram regerados**: o contrato vem da API viva
em homologação, e a rota `/cfops/search` só existe depois do MR que a acompanha. Regerar contra o
contrato velho apagaria rotas que já existem. Fica para depois do deploy, como na entrada de
`08/09`.

---

## 09/09/2026 — o contrato regerado, com CFOP, crédito, reserva e a preparação de compra

`docs/api/openapi.json` foi de **214 para 218 rotas**, atualizado do contrato vivo em homologação
(`246ef2bc`). Sete rotas nasceram e três morreram, e é a primeira vez que registro uma retirada.

As novas são de quatro entregas da API que a tela ainda não conhecia: `/cfops`, `/cfops/search` e
`/cfops/{code}` (a tabela da lei), `/stock/reservations` (a reserva pelo pedido),
`/sales-invoices/{id}/submit-over-credit-limit` (a alçada de crédito) e o par
`/purchase-receipts/prepare` e `/purchase-invoices/prepare`.

Esse par **substitui** `/purchase-orders/{id}/prepare-receipt`, `/purchase-orders/{id}/prepare-invoice`
e `/purchase-receipts/{id}/prepare-invoice`. As três antigas preparavam a partir de **um** documento,
pelo `id` no caminho; as duas novas recebem uma **lista** na consulta (`?fromOrders=1,2` ou
`?fromReceipts=7,9`), porque uma nota pode faturar linhas de dois recebimentos e um recebimento pode
vir de dois pedidos. A tela que as consome é a do MR seguinte.

Duas mudanças de modelo vieram junto, e as duas a tela já tinha absorvido antes do contrato:
`OperationNatureRuleRequestDTO` **perdeu `ufScope`** — o âmbito passou a sair do primeiro dígito do
CFOP — e `OperationNatureRequestDTO` **deixou de exigir `code`**, que agora a série `NAT` gera.

A conferência de sempre continua valendo, com um ajuste: a lista do que sumiu não pode mais ser
vazia por regra, mas **cada retirada precisa de dono**. As três daqui têm: saíram no mesmo MR da API
que criou as substitutas, e nenhuma tela chamava as antigas. O que a checagem impede é a rota sumir
**sem** que eu saiba por quê — foi assim que o contrato encolheu uma vez. O `npm run api:cruzar`
fecha em zero campos sem contrato atrás.

Fica registrado o que o cruzamento **não** pega, e que continua valendo: o caso inverso — a API
exigir o que a tela não expõe.

---

## 09/09/2026 — o documento seguinte nasce do anterior, e a tela finalmente usa a ligação

A `§48` da API entregou as rotas que montam o documento seguinte a partir do anterior, e a tela
não usava nenhuma: quem opera abria "Novo recebimento" do zero e redigitava o pedido. Era o resto da
issue `#40` — a API ganhou a ligação e a tela continuou criando documento órfão. Issue `#43`.

As rotas mudaram enquanto isto era escrito: a `§58` as moveu para o destino e fez aceitarem lista
(`/purchase-receipts/prepare?fromOrders=12,15`), porque uma carga atende dois pedidos e uma nota
fecha o mês com dois recebimentos. A ação manda um id hoje; a rota já aceita vários, e escolher
mais de um na tela é o passo seguinte.

### A ação que não age

`AcaoDeRecurso` tinha um formato só: confirma e faz POST. As três novas não fazem nada — leem
`GET /purchase-receipts/prepare?fromOrders=12` (ou `/purchase-invoices/prepare`) e **abrem o
formulário de criação do destino já preenchido**. Daí o campo novo se chamar `prepara`, e não `endpoint`: o que ele descreve
é de onde vem o rascunho, não o que será gravado.

Gravar continua sendo do usuário, e isso é a decisão da API repetida na tela: a carga que chega
raramente é a que foi pedida, e é exatamente nessa hora que se confere.

### O formulário já sabia disso, e ninguém tinha usado

`FormularioDeRecurso` decide criação por `!registro?.id`. Melhor: em `partir()` já havia o caso
"registro sem id com campos informados", preservando-os por cima do rascunho salvo — alguém previu
que um dia um formulário nasceria preenchido de fora. Passar o corpo preparado como `registro` só
acionou o que já existia; as linhas vêm por `linhasIniciais`, sem código novo.

O formulário que abre **não é o desta tela** — o pedido de compra abre o do recebimento. Por isso o
estado guarda o recurso de destino junto com o corpo: é a definição do destino que diz quais campos
e linhas desenhar.

### Três decisões pequenas

- **Nada pendente não abre formulário vazio.** Se a preparação volta sem linha, avisa que o
  documento já foi atendido por completo. Abrir um formulário sem itens seria deixar a pessoa
  descobrir sozinha.
- **Só documento lançado gera o seguinte**, com o motivo no menu quando desabilitado.
- **Os papéis são a união dos dois lados.** Gerar recebimento a partir do pedido vale para
  `COMERCIAL` e `OPERADOR`: quem comprou e quem recebe. A ação nasce num documento e termina em
  outro, e prender ao papel da origem deixaria de fora justamente quem vai preencher.

### O que continua na mão

A nota preparada vem com a entrada de estoque **desligada**, e a tela não religa: o pedido não diz
se a mercadoria vem com a nota ou por recebimento à parte, e adivinhar isso foi como o estoque
entrou duas vezes em homologação (`§48`). Quem sabe é quem está com a nota na mão.

---

## 09/09/2026 — vendas ganha o mesmo botão, e o mapa que substituiu o ternário

O pedido de venda e a entrega agora geram o documento seguinte, como o pedido de compra e o
recebimento já geravam. É a `§59` da API, que criou `/delivery-notes/prepare?fromOrders=` e
`/sales-invoices/prepare?fromDeliveries=|fromOrders=`.

| origem | ação | destino |
| --- | --- | --- |
| pedido de venda | Gerar entrega | `/entregas` |
| pedido de venda | Gerar nota | `/faturas-de-venda` |
| entrega | Gerar nota | `/faturas-de-venda` |

### O ternário que não escalava

`gerarSeguinte` descobria o endpoint de destino assim:

```ts
const destino = rota === "/recebimentos" ? "/purchase-receipts" : "/purchase-invoices";
```

Com dois destinos isso passa. Com quatro, o `else` viraria a fatura de compra para todo mundo, e a
entrega de venda cairia calada em `/purchase-invoices` — um erro que **o TypeScript não pegaria**,
porque o tipo dos dois é `string`. Virou um `Record<string, string>` explícito, uma linha por
destino. O teste que confere o endereço montado de cada ação é o que trava isso.

### O que não mudou

Nada além do parâmetro de origem. A ação continua sem gravar nada: lê o rascunho, abre o formulário
do destino preenchido, e quem confere é quem manda de volta. Os papéis continuam sendo a união dos
dois lados — gerar entrega a partir do pedido vale para `COMERCIAL` e `OPERADOR`, porque quem vendeu
e quem separa a carga são pessoas diferentes.

### Papéis, por ação

| ação | papéis |
| --- | --- |
| pedido de venda → entrega | `COMERCIAL`, `OPERADOR` |
| pedido de venda → nota | `COMERCIAL`, `FINANCEIRO` |
| entrega → nota | `OPERADOR`, `FINANCEIRO` |

### Estado

97 testes, seis novos no `gerar-seguinte.test.ts`. A varredura que confere "só documento lançado
gera o seguinte" e "o destino existe e tem formulário" passou a rodar sobre as quatro origens, em
vez das duas de compras.

O contrato foi regerado depois do deploy do `api!15`: **218 para 220 rotas**, as duas novas sendo
`/delivery-notes/prepare` e `/sales-invoices/prepare`. Nenhuma sumiu. O `npm run api:cruzar` fecha
em zero campos sem contrato atrás.
