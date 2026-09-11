# Tokens do Figma → `@theme`

O arquivo do Figma é a fonte dos tokens de cor, raio e medida. Este documento é o procedimento que
prova isso e o refaz quando algo mudar.

Verificado em **06/09/2026**: as 39 variáveis com `codeSyntax` exportadas do Figma são **idênticas,
linha a linha**, ao bloco `@theme` de `src/style.css`.

## Por que `codeSyntax` e não o nome da variável

O nome no Figma é `text/muted`; no Tailwind é `--color-ink-mute`. Os dois vocabulários não coincidem
e **não devem** coincidir — um descreve papel visual, o outro é a API do utilitário. O `codeSyntax`
do campo `WEB` é a ponte, e é ele que a exportação lê. Variável sem `codeSyntax` não vira token: é
essa a checagem que impede um token aparecer no arquivo e sumir no código.

As `space/*` carregam valor literal (`1rem`) em vez de `var(--…)`, de propósito — a escala de
espaçamento do Tailwind já cobre esses degraus e não precisa ser redeclarada.

## Como refazer

Rode isto pelo MCP do Figma (`use_figma`) no arquivo
[Gestão Auto — ERP](https://www.figma.com/design/JDqJyfVRBwLpDzPVm44QGB/Gest%C3%A3o-Safra-%E2%80%94-ERP):

```js
const col = await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:2:14');
const modo = col.modes[0].modeId;
const hex = c => '#' + [c.r, c.g, c.b]
  .map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

const linhas = [], semSyntax = [];
for (const vid of col.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(vid);
  if (!v) continue;
  const cs = v.codeSyntax && v.codeSyntax.WEB;
  if (!cs) { semSyntax.push(v.name); continue; }
  const m = cs.match(/^var\((--[a-z0-9-]+)\)$/);
  if (!m) continue;                       // valor literal — fica de fora do @theme
  const val = v.valuesByMode[modo];
  linhas.push(`  ${m[1]}: ${v.resolvedType === 'COLOR' ? hex(val) : val + 'px'};`);
}
linhas.sort();
return { semSyntax, css: linhas.join('\n') };
```

Depois, confira contra o código:

```sh
grep -E "^\s+--(color|radius|spacing)-" src/style.css | sort > /tmp/do-codigo.css
# cole a saída `css` em /tmp/do-figma.css, então:
sort /tmp/do-figma.css | diff - /tmp/do-codigo.css && echo IDÊNTICOS
```

`semSyntax` tem de voltar **vazio**. Qualquer nome ali é uma variável que existe no arquivo e nunca
chegará ao código.

## Mapa Figma ↔ código

### Variáveis

| Figma | `@theme` |
| --- | --- |
| `brand/primary` · `primary-dark` · `primary-100` · `primary-50` | `--color-primary` · `-dark` · `-100` · `-50` |
| `brand/yellow` · `yellow-50` · `blue` · `blue-50` | `--color-yellow` · `-50` · `--color-blue` · `-50` |
| `brand/navy` · `navy-800` · `navy-700` | `--color-navy` · `-800` · `-700` |
| `bg/app` · `bg/surface` | `--color-app` · `--color-surface` |
| `text/primary` · `secondary` · `muted` · `inverse` · `on-navy` | `--color-ink` · `-soft` · `-mute` · `-invert` · `-navy` |
| `border/default` · `strong` · `field` | `--color-line` · `-strong` · `-field` |
| `state/<tom>` e `state/<tom>-bg` | `--color-<tom>` e `--color-<tom>-bg` |
| `radius/sm` · `badge` · `control` · `card` · `panel` | `--radius-sm` · `-badge` · `-control` · `-card` · `-panel` |
| `radius/full` | literal `9999px` — `rounded-full` do Tailwind |
| `size/sidebar` · `topbar` · `control` | `--spacing-sidebar` · `-topbar` · `-control` |
| `space/*` | literal — escala padrão do Tailwind |

### Estilos de texto

Os 16 estilos cobrem os 11 tokens tipográficos; o que multiplica é o peso, que no CSS vem de
`font-medium` / `font-semibold` e não do token.

| estilo | token |
| --- | --- |
| `Heading/H1` · `H2` · `H3` | `--text-h1` · `-h2` · `-h3` |
| `Heading/Title` | `--text-title` |
| `Display/Number` | `--text-value` |
| `Body/Regular` · `Medium` · `SemiBold` | `--text-body` |
| `Chip/Medium` | `--text-chip` |
| `Small/Regular` · `Medium` · `SemiBold` | `--text-small` |
| `Micro/Medium` · `Regular` | `--text-micro` |
| `Caption/Overline` | `--text-overline` |
| `Caption/Regular` | `--text-caption` |

### Componentes

| Figma | Vue |
| --- | --- |
| `Button` (4 variantes) | `GsButton` |
| `Badge` (6 tons) | `GsBadge` |
| `Input` · `Select` · `SearchBox` · `Textarea` · `Checkbox` | `GsInput` · `GsSelect` · `GsSearchBox` · `GsTextarea` · `GsCheckbox` |
| `Combo` · `ComboMultiplo` | `GsCombo` · `GsComboMultiplo` |
| `KpiCard` · `Card` · `Table` · `Pagination` | `GsKpiCard` · `GsCard` · `GsTable` · `GsPagination` |
| `TabelaCompacta` · `IconButton` | `GsTabelaCompacta` · `GsIconButton` |
| `MenuDeAcoes` · `Aviso` · `Modal` · `Confirmacao` | `GsMenuDeAcoes` · `GsAvisos` · `GsModal` · `GsConfirmacao` |
| `LinhasEditaveis` | `GsLinhas` |
| `Sidebar` · `Topbar` | `AppSidebar` · `AppTopbar` |
| `Aba` | sem componente próprio — construído nas telas |
| `Logo/Mark` | `GsLogo` |

Sem contrapartida no Figma, e registrado no `design-system.md` §7.6: a trilha de `Passos`
(`GsPassos`) e o par rótulo/valor das telas de detalhe.
