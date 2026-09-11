# Design System — Gestão Auto

Fonte: arquivo Figma [Gestão Auto — ERP](https://www.figma.com/design/JDqJyfVRBwLpDzPVm44QGB/Gest%C3%A3o-Safra-%E2%80%94-ERP),
via exportação SVG/PNG de 02/09/2026 mais as variáveis lidas pelo Figma MCP.

Os valores de cor e tipografia abaixo foram **medidos** — hex extraídos dos swatches do próprio
arquivo, tipografia lida da página de fundações. O que for inferido está marcado como tal.

---

## 1. Tipografia — Poppins

Extraída em 02/09/2026 por `get_design_context` em cada componente. **Tamanhos e alturas de linha
são medidos**, não derivados.

| uso | peso | tamanho | altura de linha | onde |
| --- | --- | --- | --- | --- |
| valor de KPI | SemiBold | 26 | 34 | `KpiCard` |
| título de página | SemiBold | 18 | 26 | `Topbar` |
| corpo | Regular | 14 | 22 | campo, tabela, item de menu |
| corpo com ênfase | Medium | 14 | 22 | botão, célula-chave |
| chip | Medium | 12.5 | — | seletor de empresa e de safra |
| rótulo de campo | Medium | 12 | 18 | `Input`, `Select`, `KpiCard` |
| micro | Medium | 11.5 | 17 | `Badge`, nota do `KpiCard` |
| breadcrumb | Regular | 11 | 16 | `Topbar` |
| overline | SemiBold | 11 | 16, tracking +6% | rótulo de grupo da sidebar |

Em 06/09/2026 essa escala virou **16 estilos de texto publicados**, um por token do `@theme`, e foi
**aplicada aos nós** — antes disso nenhum nó do arquivo usava estilo nenhum, e mexer num estilo não
mudava um pixel. A tabela acima descreve o uso; a escala publicada está no §7.

O título de página é **18**, não 24 — o `H1` das fundações é de outro contexto.

## 2. Paleta — 31 tokens

27 saem da página de fundações; `text/inverse` e `text/on-navy` vêm das variáveis do arquivo.

### Marca — 10

| token | hex | |
| --- | --- | --- |
| `primary` | `#2c6631` | verde de ação |
| `primary-dark` | `#1f4a24` | hover / pressed |
| `primary-100` | `#d3e3d2` | |
| `primary-50` | `#ebf1e9` | item ativo da sidebar |
| `yellow` | `#f2c230` | acento — avatar, detalhe da marca |
| `yellow-50` | `#f8f0da` | |
| `blue` | `#1e88e5` | série "Compras" no gráfico |
| `blue-50` | `#e8f0f8` | |
| `navy` | `#0b1d33` | sidebar, painel de login |
| `navy-800` | `#122a47` | rodapé de usuário na sidebar |

O **`navy-700`** ficou pendente desde 05/09/2026 porque os floats kiwi do `canvas.fig` não foram
decodificados. Lido no Figma em 06/09/2026: **`#1b3a5e`**, e acrescentado ao `@theme`.

### Superfícies e texto — 7

| token | hex | |
| --- | --- | --- |
| `bg/app` | `#f4f5f2` | **fundo da aplicação** — off-white, não é branco |
| `bg/surface` | `#ffffff` | card, tabela, painel |
| `text/primary` | `#0b1d33` | mesmo valor de `navy` |
| `text/secondary` | `#566068` | |
| `text/muted` | `#6a6f75` | era `#8a9199`, que reprovava em AA (2,91:1 sobre `bg/app`) — ver **D3** |
| `border/default` | `#e3e6ea` | |
| `border/strong` | `#c9ced6` | divisória forte, rodapé de total |
| `border/field` | `#8b8e94` | **contorno de controle interativo** — campo, checkbox, chip. WCAG 1.4.11 pede 3:1; ver **D4** |

### Estados — 10, em par fg/bg

| tom | fg | bg | uso visto nas telas |
| --- | --- | --- | --- |
| `success` | `#2f5e36` | `#e6efe4` | Concluído, período Aberto |
| `warning` | `#8a6116` | `#f6edd6` | Parcial, lote vencendo |
| `danger` | `#a63d33` | `#f6e9e6` | Cancelado, fatura em atraso |
| `info` | `#2f6da8` | `#e7eff6` | Confirmado, Em aberto |
| `neutral` | `#5d6675` | `#eceef0` | Rascunho |

### Sobre navy — 2

| token | hex | |
| --- | --- | --- |
| `text/inverse` | `#ffffff` | sobre `primary` |
| `text/on-navy` | `#b9c6d6` | item inativo da sidebar |

O `Badge` tem um sexto tom, **Navy**, sem par próprio: usa `navy` de fundo com `text/inverse`.
Nas telas ele é o **Fechado** do período contábil.

---

## 3. Raio de borda

Medidos por `get_design_context`. A leitura anterior, tirada dos `rx` do SVG, estava **errada**: os
valores terminados em `.5` lá eram recuo de traço, e o raio real é o inteiro seguinte.

| token | valor | onde |
| --- | --- | --- |
| `--radius-badge` | 6 | `Badge` |
| `--radius-control` | 8 | botão, campo, select, busca, chip |
| `--radius-card` | 12 | card, KPI, container de tabela |
| `--radius-panel` | 16 | painel grande |

O `Badge` **não é pílula** — é retângulo de 6.

## 3.1. Sombra

Uma só, nos controles sólidos: `0 1px 1px rgba(15, 31, 18, 0.18)`. Publicada como effect style
`Sombra/Controle` em 06/09/2026 — antes existia só como valor solto nos nós.

## 4. Componentes

### Controles

Medidas de `get_design_context`, não do canvas.

**`Button`** — altura 40, `px-20`, raio 8, **borda 1px** e sombra `0 1px 1px rgba(15,31,18,.18)`.
Texto Medium 14/22. `Primary` é fundo `primary` com borda `primary-dark` — a borda existe e eu a
tinha omitido.

**`Badge`** — `px-8 py-2`, raio **6**, texto Medium 11.5/17. Altura resultante 21, que é o que o
canvas mostrava. Retângulo, não pílula.

**`Input` / `Select`** — 280x64 no total: rótulo (12/18 Medium, `text/secondary`) + **gap 6** +
campo de 40. Campo com borda `border/default`, raio 8, `px-12`, texto 14/22, placeholder
`text/muted`.

**`SearchBox`** — 280x40, mesmas medidas do campo.

**`KpiCard`** — 270x110, `px-20 py-16`, gap 4, raio 12, **borda `border/default`**. Rótulo Medium
12/18 `text/secondary`; valor SemiBold **26/34** `text/primary`; nota Regular 11.5/16, e a cor
padrão dela é **`brand/primary`** (verde), não cinza.

**`Logo/Mark`** — 48x48. No Figma é **imagem rasterizada**, não vetor. O original de 1024x1024 está
em `docs/assets/logo-mark-1024.png`; o bundle usa uma redução para 192 em `src/assets`.

### Os treze de 04/09/2026

Estes nove são a leitura de 02/09/2026, quando eram tudo o que havia. Em 04/09/2026 o arquivo
ganhou `Textarea`, `Checkbox`, `Combo`, `ComboMultiplo`, `LinhasEditaveis`, `Card`, `Table`,
`Pagination`, `MenuDeAcoes`, `Aviso`, `Modal`, `Confirmacao` e `Aba` — desenhados **a partir do
código**, não o contrário. A anatomia de cada um está na descrição do próprio componente no Figma,
e o porquê em `decisoes-do-front.md`.

### Nascidos no código — faltam no Figma

Os dois vieram de refatoração em 05/09/2026, não de desenho. Estão aqui para serem desenhados no
arquivo; até lá, o código é a fonte deles.

**`IconButton`** — consolidou 11 repetições do mesmo bloco, espalhadas por `GsPagination`,
`GsMenuDeAcoes`, `GsLinhas` e cinco telas, que já tinham derivado para três tamanhos e três tons de
hover. Quadrado, raio 8, sem borda e sem fundo em repouso, ícone de 16 centrado. Tamanhos `sm` 24,
`md` 32, `lg` 40 — os três que estavam em uso. Desabilitado a 40%, sem hover. O `label` é
obrigatório e vira `aria-label`; `title` é opcional, para a dica.

| tom | repouso | hover |
| --- | --- | --- |
| `neutral` | `text/muted` | fundo `state/neutral-bg`, texto `text/primary` |
| `danger` | `text/muted` | fundo `state/danger-bg`, texto `state/danger` |
| `accent` | `text/muted` | fundo `brand/primary-50`, texto `brand/primary` |
| `soft` | `text/secondary` | fundo `bg/app`, texto inalterado |

No Figma: component set com `Tone` (Neutral/Danger/Accent/Soft) × `Size` (Sm/Md/Lg) × `State`
(Default/Hover/Disabled).

**`TabelaCompacta`** — a tabela de dentro de painel, irmã densa da `Table`. Consolidou 4 cópias
(`CupomDaVenda`, `FechamentoDeTurno`, `DetalheDaLinha` e a sub-tabela de parcelas do Aging).
Cabeçalho `border/default` embaixo sobre `bg/app`, rótulos 11/16 SemiBold em caixa alta, `px-16
py-8`; células `py-10`, com a calha a cargo de quem consome. Linha com `border/default` embaixo,
menos a última. Sem estado de vazio nem de carregando — quem chama decide o que mostrar. Aceita
rodapé para o total, separado por `border/strong`.

A variante **`embutida`** é para quando ela já vive dentro de um card ou de uma linha expandida:
perde o wrapper de raio 12 e o cabeçalho troca o `border-b` sobre `bg/app` por `border-y` sem
fundo. É o que a sub-tabela de parcelas do Aging usa.

No Figma: component set com `Variant` (Default/Embutida).

Contra a `Table`: aquela é a listagem da tela, com 24 de calha, células de 14, estados de vazio,
erro e carregando, e linha que acende no hover. Esta é a de dentro de painel, mais densa e burra.

### Estrutura

**`Sidebar`** — 248×1024, fundo `navy`. Marca no topo, rodapé com avatar, nome e papel
(`Felipe Oliveira` / `TENANT_ADMIN`). Grupos em `Caption/Overline`, item ativo com fundo `primary`.

**`Topbar`** — 1192×64. Breadcrumb pequeno + título em `H1`; à direita o seletor de empresa
(`Fazenda Boa Vista · BV`), o seletor de safra (`Safra 2025/26`), sino e avatar.

248 + 1192 = **1440**, a largura de referência.

---

## 5. Telas desenhadas

### `Dashboard` / Visão Geral

Composição, de cima para baixo:

1. **Quatro KPIs** — Faturamento do mês, A receber vencido, Valor em estoque, Pedidos em aberto.
   Cada um com rótulo, valor grande e uma linha de apoio ("+12,4% vs ago/26", "5 faturas em atraso"
   em `danger`, "8 depósitos ativos", "9 aguardando entrega").
2. **Gráfico de barras** — "Vendas × Compras — últimos 6 meses", duas séries: `primary` para
   Vendas, `blue` para Compras, com legenda de bolinha.
3. **Lotes próximos do vencimento** — lista de item + código de lote + badge de dias restantes.
4. **Períodos contábeis** — mês + badge `Aberto` (success) / `Fechado` (navy).
5. **Tabela "Pedidos de venda recentes"** — colunas NÚMERO · CLIENTE · DATA · ENTREGA · TOTAL ·
   SITUAÇÃO, cabeçalho em `Caption/Overline`, situação em badge, e "Ver todos →" no topo direito.

### Onboarding — **fora deste contexto**

Existem quatro telas desenhadas (Entrar, Criar sua conta com 3 passos, Preparando seu ambiente,
Conta suspensa). Por decisão, o onboarding e o cadastro serão tratados **num contexto próprio**,
porque envolvem provisionamento, Keycloak e cobrança. Não implementar junto com o resto.

---

## 6. A navegação — e onde ela não bate com a API

A sidebar é a arquitetura de informação do produto:

| grupo | itens |
| --- | --- |
| — | Dashboard |
| VENDAS | Pedidos de Venda · Entregas · Faturas de Venda |
| COMPRAS | Pedidos de Compra · Recebimentos · Faturas de Compra |
| ESTOQUE | Itens · Depósitos · Saldos · Movimentos · Lotes & Séries |
| PARCEIROS | Clientes · Fornecedores · Grupos |
| FINANCEIRO | Pagamentos · Contas a Receber · Contas a Pagar |
| CONTABILIDADE | Plano de Contas · Lançamentos · Balancete |
| CONFIGURAÇÕES | Empresas · Configurações |

**Três itens do menu não têm endpoint hoje:**

| item | situação |
| --- | --- |
| Contas a Receber | derivável das faturas em aberto, mas não há rota própria |
| Contas a Pagar | idem |
| Balancete | **é a lacuna 4** do backend (relatórios), ainda aberta |

**Duas funcionalidades entregues não estão no menu:**

| funcionalidade | rota |
| --- | --- |
| Inventário físico (lacuna 1) | `/physical-inventories` |
| Devolução (lacuna 2) | `POST` com `isReturn` nas rotas dos 4 documentos |

A devolução não pede item de menu — ela é uma ação dentro do documento. O **inventário físico
pede**, e o desenho é anterior a ele. Cabe em ESTOQUE.

O **seletor de safra** (`Safra 2025/26`) da topbar não tem correspondente óbvio na API. O mais
próximo é `/fiscal-years`, mas exercício fiscal e safra não são a mesma coisa no agro. É uma
pergunta em aberto para o desenho.

---

## 7. A passagem de 06/09/2026 — o arquivo virou fonte

Até 05/09/2026 este documento descrevia o Figma. Em 06/09/2026 o arquivo foi **medido, corrigido e
ligado ao código**. O que mudou, e por quê.

### 7.1. O que estava errado, medido

| achado | número |
| --- | --- |
| nós de texto usando estilo, na biblioteca | **0 de 154** |
| nós de texto usando estilo, nas 45 telas | **0 de 4.347** |
| combinações tamanho/peso na biblioteca | 18, contra 10 estilos publicados |
| variáveis de raio, medida ou espaçamento | **nenhuma** — só cor |
| paint styles e effect styles | **zero** |
| variáveis com `codeSyntax` | **0 de 30** |
| pares texto/fundo reprovando em AA | **5** |

### 7.2. A escala tipográfica — 16 estilos, um por token

Publicada como text styles e aplicada a 4.408 nós. Os quatro estilos que **faltavam** não eram
deriva: eram lacuna de especificação — o tamanho estava em uso e não tinha token.

| estilo | tamanho / altura / peso | token do `@theme` | onde |
| --- | --- | --- | --- |
| `Display/Number` | 26 / 34 SemiBold | `--text-value` | valor de KPI — **corrigido de 28/36** |
| `Heading/H1` | 24 / 32 SemiBold | `--text-h1` | título de tela |
| `Heading/H2` | 20 / 28 SemiBold | `--text-h2` | nome do parceiro no documento |
| `Heading/Title` | 18 / 26 SemiBold | `--text-title` | **novo** — título de página, Modal, Confirmação |
| `Heading/H3` | 16 / 24 SemiBold | `--text-h3` | título de card e de painel |
| `Body/Regular` · `Medium` · `SemiBold` | 14 / 22 | `--text-body` | corpo, botão, célula |
| `Chip/Medium` | 12,5 / 18 Medium | `--text-chip` | **novo** — seletores da Topbar, chip do ComboMúltiplo |
| `Small/Regular` · `Medium` · `SemiBold` | 12 / 18 | `--text-small` | rótulo de campo, iniciais do avatar (**SemiBold é novo**) |
| `Micro/Medium` | 11,5 / 17 Medium | `--text-micro` | Badge |
| `Micro/Regular` | 11,5 / 17 Regular | `--text-micro` | **novo** — nota do KpiCard |
| `Caption/Overline` | 11 / 16 SemiBold, +6% | `--text-overline` | cabeçalho de coluna, rótulo de grupo |
| `Caption/Regular` | 11 / 16 Regular | `--text-caption` | **novo** — breadcrumb, papel do usuário |

**A única exceção deliberada** é o lockup da marca: `Gestão Auto` a 14 SemiBold e a tagline a 8,5.
A tagline é `text-[0.5rem]` — **8px** — no código, e fica registrada como achado nos dois lados
(ver `AUDITORIA.md`, P3), não como token.

### 7.3. As variáveis que só existiam no código

A coleção `Tokens` tinha 30 variáveis, todas de cor. Passou a **50**, e todas as 39 que têm
equivalente em CSS carregam `codeSyntax` — é o que faz o arquivo exportar o `@theme`.

| grupo | variáveis |
| --- | --- |
| `radius/*` | `sm` 4 · `badge` 6 · `control` 8 · `card` 12 · `panel` 16 · `full` 999 |
| `size/*` | `sidebar` 248 · `topbar` 64 · `control` 40 |
| `space/*` | 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 |

O `radius/sm` = 4 é lacuna de escala, não deriva: o código já usava `rounded-[4px]` no Checkbox e o
`rounded` padrão do Tailwind no esqueleto da Table, os dois sem token.

### 7.4. Regras invioláveis

Curtas de propósito, e todas verificáveis por script.

1. **Todo texto usa um estilo.** Exceção única e nomeada: o lockup da marca.
2. **Toda cor sai de variável.** Nenhum hex solto em produto — molduras de seção da página de
   componentes não são produto.
3. **Todo raio sai de `radius/*`.** Se o valor não está na escala, ou é lacuna (evolua a escala) ou é
   deriva (corrija o nó). Não invente um degrau no nó.
4. **A cor comunica o que pede ação.** Resolvido é neutro. É por isso que `Concluído` é `success` e
   `Rascunho` é `neutral`, não o contrário.
5. **Contraste AA em todo par texto/fundo.** Rode `contraste.py` antes de propor cor nova.
6. **Limite de controle interativo tem 3:1** — `border/field`, nunca `border/default`. Divisória é
   outra coisa e pode ser leve.
7. **Estado nunca depende só de cor** (WCAG 1.4.1): badge tem texto, passo tem número ou `✓`.
8. **Tela se monta com instância.** Tela desenhada à mão não herda correção — foi o defeito nº 1 da
   auditoria de 06/09.
9. **O pacote é `infraestructure`, com "e"** — vale para o repositório inteiro, e não se "corrige".
10. **Não há tema escuro.** Decisão de 06/09/2026: fora de escopo por ora. Quem for adicioná-lo
    precisa renomear as superfícies por elevação semântica **antes**, não depois.

### 7.5. Componentes desenhados em 06/09/2026

- **`IconButton`** — component set de **36 variantes**, `Tone` (Neutral · Danger · Accent · Soft) ×
  `Size` (Sm 24 · Md 32 · Lg 40) × `State` (Default · Hover · Disabled). O glifo de reticências é
  marcador; troque pelo ícone lucide do caso.
- **`TabelaCompacta`** — `Variant` Default · Embutida, fiel ao `GsTabelaCompacta`.

Ambos estão na seção `07 · Ações compactas` da página de componentes.

### 7.6. O que ainda falta no arquivo

Descoberto ao montar os moldes da página `14 · Moldes`, e **não construído**:

| falta | por quê importa |
| --- | --- |
| `Passos` | a trilha `Pedido → Entrega → Fatura → Pagamento` aparece em todo documento e foi montada inline |
| par rótulo/valor | a grade de campos de leitura de todo detalhe, idem |
| propriedade de item ativo na `Sidebar` | sem ela, nenhum molde consegue dizer em que página está — as três telas da página `14` mostram `Dashboard` aceso |

### 7.7. Registro de decisões

| # | decisão |
| --- | --- |
| D1 | Quando Figma e código divergem, **arbitra o componente medido**, caso a caso. Foi assim que a `Sidebar` da biblioteca (menu a 12,5, raio 7) perdeu para o código (14 e 8), e que o cabeçalho de tabela ganhou do código: Figma e este documento diziam `Caption/Overline`, o `GsTable` usava `text-caption`. |
| D2 | A escala tipográfica **consolida em 16 estilos e é aplicada aos nós**, em vez de virar 18 estilos que fossilizariam deriva. |
| D3 | `text/muted` escurece de `#8a9199` para **`#6a6f75`** — 2,91:1 reprovava em AA sobre `bg/app`; agora dá 4,63. Um token, 85 usos em 38 arquivos herdam. |
| D4 | **Separar contorno de campo de divisória.** `border/field` `#8b8e94` (3,28 sobre superfície, 3,00 sobre app) para campo, checkbox e chip; `border/default` segue leve na divisória. |
| D5 | Fase 3 = **correção sistêmica por script nas 45 telas + três moldes reconstruídos**, em vez das 45. Os moldes vivem na página `14 · Moldes`; **as telas originais não foram apagadas**. |
| D6 | **Sem tema escuro** neste ciclo. |

### 7.8. O handoff, verificado

As 39 variáveis com `codeSyntax` foram exportadas do Figma e comparadas ao `@theme` de
`src/style.css`: **idênticas, linha a linha**. Enquanto o `codeSyntax` estiver preenchido, o arquivo
gera o tema — o procedimento está em `docs/tokens-do-figma.md`.

### 7.9. Placar depois

| métrica | biblioteca | 45 telas |
| --- | --- | --- |
| texto com estilo | 152 de 154 | **98,1%** (81 sem, dos quais 78 são o lockup) |
| preenchimento ligado a token | 98% | **99,6%** |
| borda ligada a token | 97% | **99,2%** |
| raio ligado a variável | 100 de 100 | **1.811 de 1.811 — 100%** |
