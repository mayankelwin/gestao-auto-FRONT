# Mensagens: erros, alertas, ajuda e feedback

Toda mensagem que a pessoa lê — erro, recusa, alerta, confirmação de cadastro, ajuda — passa por
aqui. Não escreva string solta em componente novo.

## Onde as coisas ficam

| Arquivo | Papel |
|---|---|
| `src/lib/mensagens.ts` | O catálogo. Texto, tom, quem resolve, para onde ir. |
| `src/lib/avisos.ts` | O store. Decide entre toast e diálogo, e adapta ao papel de quem está logado. |
| `src/components/ui/GsAvisos.vue` | Toast lateral, canto inferior direito. |
| `src/components/ui/GsAlerta.vue` | Bloco em linha, dentro da tela ou do formulário. |
| `src/components/ui/GsDialogoDeMensagem.vue` | Diálogo, para o que interrompe. |
| `src/lib/destaque.ts` | O destaque do campo na tela de destino (`?destacar=<campo>`). |

## Como usar

Mensagem recorrente entra no catálogo e é chamada pela chave:

```ts
const avisos = useAvisos();
avisos.mensagem("empresa-nao-selecionada");
```

O store resolve sozinho: quem tem o papel recebe `comoResolver` e o botão de destino; quem não tem
recebe `semPermissao` e nenhum botão. O que tem `interrompe: true` vai para o diálogo em vez do
canto da tela.

Para renderizar dentro da própria tela, em vez de avisar de lado:

```ts
const aviso = computed(() => resolverMensagem("empresa-nao-selecionada", sessao.papeis));
```

```vue
<GsAlerta :tom="aviso.tom" :titulo="aviso.titulo" :texto="aviso.texto" :orientacao="aviso.orientacao" />
```

Mensagem de um lugar só continua podendo usar `avisos.sucesso(...)`, `falha(...)`, `alerta(...)`,
`informa(...)`.

## As regras que valem

**Diga a quem não pode resolver a quem pedir, não como fazer.** Mandar alguém a uma tela que o
papel dele não abre é pior que não dizer nada: a pessoa vai, esbarra e volta sem entender. É o que
o par `comoResolver`/`semPermissao` existe para separar.

**Destino é promessa de chegada.** `destino.rota` só aparece para quem pode percorrê-la, e
`destino.campo` destaca o campo na chegada — o `GsFormulario` lê `?destacar=` e rola até ele.
Levar à tela certa e deixar procurar o campo desfaz metade do favor.

**Toast some, diálogo interrompe.** Cinco segundos no canto da tela não é lugar para dizer que a
pessoa não pode continuar. Use `interrompe` só para isso.

**Não há `react-toastify`.** É biblioteca React, e este projeto é Vue 3. O toast lateral é o
`GsAvisos`, com os tokens do design system.
