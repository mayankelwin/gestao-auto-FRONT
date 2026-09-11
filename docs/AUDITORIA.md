# Auditoria das telas do Figma — 06/09/2026

Arquivo [Gestão Auto — ERP](https://www.figma.com/design/JDqJyfVRBwLpDzPVm44QGB/Gest%C3%A3o-Safra-%E2%80%94-ERP),
15 páginas. Método: extração de valores por `use_figma`, uma leitura por página, sem impressão visual.

**Escopo:** as 45 telas das páginas 04 a 13. A página `03 · Componentes` foi auditada e **corrigida**
no mesmo dia — o resultado está no `design-system.md`, não aqui.

## Placar

| | |
| --- | --- |
| telas | **45** |
| nós | 12.764 |
| instâncias de componente | **464 — 3,6% dos nós** |
| nós de texto | 4.347 |
| texto sem estilo | **2.480 — 57,1%** |

---

## Problemas sistêmicos

### 🔴 P1 — As telas não são montadas com a biblioteca

3,6% dos nós são instância. `Contas a Receber & Pagar` tem **3 instâncias em 376 nós**; `Séries`, 4 em
344; `Balancete`, 5 em 360. As telas são cópias desenhadas à mão de componentes que existem no
arquivo.

A consequência não é estética: **a correção da biblioteca não alcança tela nenhuma.** Os 16 estilos de
texto, as 50 variáveis e as 100 ligações de raio criados hoje na página `03` propagam para zero telas.
E vale ao contrário — cada defeito abaixo aparece 45 vezes porque foi copiado 45 vezes.

A prova mais direta: há **duas Sidebars diferentes** no arquivo. A da biblioteca tem item de menu a
12,5 e rótulo de grupo a 9,5; a desenhada nas telas tem 13 e 10,5. Nenhuma das duas bate com o código,
que usa 14 e 11.

### 🔴 P2 — Uma segunda escala tipográfica, paralela e sistemática

Nenhum dos tamanhos abaixo existe na escala. Cada um é **um degrau abaixo** do token correspondente:

| na tela | deveria ser | onde |
| --- | --- | --- |
| 13 Regular / Medium | 14 — `Body/*` | corpo de tabela, campo, item de menu, em todas as 45 |
| 10,5 e 10 SemiBold | 11 — `Caption/Overline` | **todo cabeçalho de coluna**, em todas as listas |
| 22 SemiBold | 24 — `Heading/H1` | título de tela |
| 17 SemiBold | 18 — `Heading/Title` | título de painel e de documento |
| 15 SemiBold | 16 — `Heading/H3` | título de card |
| 13,5 e 10,5 Regular | 14 e 11 | apoio, legenda |

A razão é próxima de 0,9375 = 15/16 em quase todos os pares, o que sugere origem única — telas
desenhadas numa grade maior e reduzidas —, mas ela **não fecha em todos os valores**, então registro o
padrão, não a causa.

### 🔴 P3 — Texto abaixo do mínimo legível, em toda tela

- **8,5px** — a tagline `DADOS · PLANEJAMENTO · RESULTADOS`, presente em **43 das 45 telas**. No
  código ela é `text-[0.5rem]`, isto é, **8px**: o defeito está nos dois lados, não é deriva do Figma.
- **10px e 10,5px** — os cabeçalhos de coluna de **todas** as listas (`NÚMERO`, `CLIENTE`, `CÓDIGO`…).
  O piso da escala é 11.

Some-se o P3 ao contraste: esse texto é `text/muted`, que reprovava em AA a 2,91:1 até a correção de
hoje. Texto de 10px, cinza-claro, em caixa alta é a pior combinação possível para leitura.

### 🟠 P4 — `#f4f6f9`, um segundo fundo de aplicação

Aparece **uma vez em cada uma de 40 telas**, sempre solto. É `bg/app` (`#f4f5f2`) errado por três
dígitos — perto demais para se ver, longe demais para ser o token.

### 🟡 P5 — Raios fora da escala

`7` (em 11 telas, até 11 ocorrências numa só), `10` (em 12 telas), e ainda `9` e `2`. A escala é
4 · 6 · 8 · 12 · 16, e o raio 7 é o mesmo desvio que a `Sidebar` da biblioteca tinha e que foi
corrigido hoje.

### ⚪ P6 — Nenhuma tela usa estilo de texto

57,1% dos textos não têm estilo, e os 42,9% restantes também não: o número conta apenas os nós que
declaram `textStyleId`, e **nenhuma tela tem um só**. O que a contagem separa é ruído de medição entre
nós dentro e fora de instância.

---

## Contradições de produto

Não são de design e não corrijo sozinho.

| # | contradição |
| --- | --- |
| C1 | O menu tem **dois** destinos — `Contas a Receber` e `Contas a Pagar` — e existe **uma** tela, `Contas a Receber & a Pagar`. Ou o menu tem um item a menos, ou faltam duas telas. |
| C2 | O menu desenhado não tem **Inventário físico**, **PDV**, **Conciliação bancária** nem **Listas de preço** — as quatro entregues no backend (lacunas 1, 5 e 7). O desenho é anterior a elas. |
| C3 | `Balancete` tem tela pronta e é a **lacuna 4** do backend: a tela promete um relatório que ainda não tem endpoint. |
| C4 | O seletor **`Safra 2025/26`** está na topbar das 43 telas de tenant e não tem correspondente na API. `/fiscal-years` é o mais próximo, mas exercício fiscal e safra não são a mesma coisa no agro. |
| C5 | As 4 telas de onboarding estão completas e o `design-system.md` as declara **fora deste contexto**, por envolverem provisionamento, Keycloak e cobrança. O desenho contradiz a decisão registrada. |

---

## O que a auditoria cruzada **não** encontrou

Vale registrar, porque é onde este arquivo é forte:

- **Um só nome de produto** — `GESTÃO Auto` nas 43 telas de tenant, `Console interno · Digital Ventura`
  nas 2 de plataforma. Sem marca fantasma.
- **Uma só navegação** — os 8 grupos e os mesmos itens, idênticos nas 43. A arquitetura de informação
  existe e é estável.
- **Personagens consistentes** — Felipe Oliveira / `TENANT_ADMIN` / Fazenda Boa Vista, e os mesmos
  parceiros (Cerealista Santa Rita, Cooperativa Vale Verde, Agroindústria Campos Gerais) de ponta a
  ponta.
- **Termos de domínio estáveis** — `Depósito`, `Lote`, `Lançada`, `Parcial`, `Rascunho`. A única
  oscilação é `Armazém Central` como nome de um depósito em `Entrega — Detalhe`, que é dado de
  exemplo, não termo.

---

## Veredito por tela e ordem de correção

Nenhuma tela é **referência**: as 45 têm P1, P2 e P3. A ordem abaixo é por dependência — a tela mais
simples e mais instanciada primeiro, para virar a referência que hoje não existe.

| ordem | tela | nós | inst. | veredito |
| --- | --- | --- | --- | --- |
| 1 | `Login` | 31 | 4 (12,9%) | boa base — a mais simples e a mais instanciada |
| 2 | `Conta Suspensa (402)` | 14 | 2 (14,3%) | boa base |
| 3 | `Console — Tenant Detalhe` | 84 | 10 (11,9%) | boa base |
| 4 | `Cadastro (Sign-up)` | 59 | 7 (11,9%) | boa base |
| 5 | `Console — Tenants` | 160 | 18 (11,2%) | boa base — primeira lista |
| 6 | `Itens — Lista` | 350 | 24 (6,9%) | refazer — vira o molde de todas as listas |
| 7 | `Pedido de Venda — Detalhe` | 308 | 10 | refazer — vira o molde de todos os documentos |
| 8 | `Empresa — Formulário` | 281 | 15 | refazer — vira o molde de todos os formulários |
| 9–45 | as demais | — | — | refazer a partir dos três moldes acima |

As três telas de 6 a 8 são as que pagam a conta: quase toda tela restante é uma lista, um documento ou
um formulário.

| pior caso | nós | inst. |
| --- | --- | --- |
| `Contas a Receber & Pagar` | 376 | **3 (0,8%)** |
| `Séries` | 344 | 4 (1,2%) |
| `Balancete` | 360 | 5 (1,4%) |
| `Grupos de Itens` | 312 | 5 (1,6%) |
| `Lançamentos (Razão)` | 309 | 5 (1,6%) |

---

## Depois — o que foi corrigido no mesmo dia

A Fase 3 seguiu a decisão **D5**: correção sistêmica por script nas 45 telas, mais três moldes
reconstruídos com instâncias. **Nenhuma tela original foi apagada** — os moldes vivem na página nova
`14 · Moldes`.

### Corrigido

| problema | o que foi feito |
| --- | --- |
| 🔴 **P2** escala paralela | 4.408 nós ligados a estilo. 13 → 14, 10 e 10,5 → 11, 22 → 24, 17 → 18, 15 → 16 |
| 🔴 **P3** texto ilegível | os cabeçalhos de coluna subiram de 10 e 10,5 para 11 |
| 🟠 **P4** `#f4f6f9` | 41 preenchimentos religados a `bg/app` |
| 🟡 **P5** raios | **1.811 de 1.811** ligados a `radius/*`; 7 → 8, 10 e 9 → 12, 2 → 4 |
| 🔴 contraste | `text/muted` para `#6a6f75` (D3) e `border/field` `#8b8e94` para controle (D4), nos dois lados |

### Placar depois

| métrica | antes | depois |
| --- | --- | --- |
| texto com estilo | **0 de 4.347** | **4.266 — 98,1%** |
| preenchimento ligado a token | — | 6.765 de 6.792 — **99,6%** |
| borda ligada a token | — | 2.802 de 2.825 — **99,2%** |
| raio ligado a variável | 0 | 1.811 de 1.811 — **100%** |

Os 81 textos sem estilo são **78 do lockup da marca** — exceção deliberada, ver `design-system.md`
§7.2 — e 3 dentro de instância.

### Não corrigido, e por quê

- 🔴 **P1** segue inteiro nas 42 telas fora dos moldes: elas continuam desenhadas à mão. A correção
  é reconstruir cada uma com instâncias, e os três moldes da página `14` são o caminho provado —
  quase toda tela restante é uma lista, um documento ou um formulário.
- 🔴 **P3, a tagline de 8,5px**: fica. É `text-[0.5rem]` no código, e mudá-la é decisão de marca, não
  de token.
- **C1 a C5**, as contradições de produto: nenhuma é de design.

### Uma regressão minha, encontrada na verificação

A varredura por vizinho mais próximo encolheu o glifo 🌱 de `Item — Detalhe` de 22 para 14 — ele é
avatar do item, não corpo de texto. Corrigido para `Heading/H1` (24), que é tokenizado e equivale ao
original. Emoji usado como ícone não é tipografia, e a varredura não sabia disso.
