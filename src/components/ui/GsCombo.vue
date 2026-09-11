<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ChevronDown, LoaderCircle, Plus, X } from "lucide-vue-next";
import { listar, type Registro } from "@/api/lista";
import type { GrupoDaLista, LinhaDaLista, LinhaDePrevia } from "@/lib/formulario";
import { buscarUm } from "@/api/recurso";
import { useEmpresa } from "@/auth/empresa";
import { pedirCriacao, recursoCriavel } from "@/lib/criacaoRapida";

const TAMANHO = 50;
const ESPERA = 350;

const props = defineProps<{
  endpoint: string;
  rotulo: (registro: Registro) => string;
  label?: string;
  placeholder?: string;
  busca?: boolean;
  exigeEmpresa?: boolean;
  parametros?: Record<string, unknown>;
  filtro?: (registro: Registro) => boolean;
  disabled?: boolean;
  invalid?: boolean;
  hint?: string;
  limpavel?: boolean;
  criavel?: boolean;
  chave?: string;
  parametroDaChave?: string;
  previa?: (registro: Registro) => LinhaDePrevia[];
  linha?: (registro: Registro) => LinhaDaLista;
  grupo?: (registro: Registro) => GrupoDaLista | null;
}>();

const model = defineModel<number | string | null>();

const emit = defineEmits<{ (e: "escolhido", registro: Registro): void }>();

const chaveDe = (registro: Registro): unknown => registro[props.chave ?? "id"];
const mesmaChave = (a: unknown, b: unknown): boolean =>
  a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);

const empresa = useEmpresa();

const aberto = ref(false);
const termo = ref("");
const termoAplicado = ref("");
const carregando = ref(false);
const falha = ref<string | null>(null);
const registros = ref<Registro[]>([]);
const escolhido = ref<Registro | null>(null);
const raiz = ref<HTMLElement | null>(null);
const painel = ref<HTMLElement | null>(null);
const campo = ref<HTMLInputElement | null>(null);
const caixa = ref({ top: 0, left: 0, largura: 0, acima: false });
const ativo = ref(0);

const opcoes = computed(() => {
  const lista = props.filtro ? registros.value.filter(props.filtro) : registros.value;
  if (props.busca || !termoAplicado.value) return lista;
  const alvo = termoAplicado.value.toLowerCase();
  return lista.filter((r) => props.rotulo(r).toLowerCase().includes(alvo));
});

const textoDoEscolhido = computed(() => (escolhido.value ? props.rotulo(escolhido.value) : ""));

/**
 * A previa acompanha o FOCO, nao a escolha: e ela que responde "o que eu estou prestes a
 * escolher" enquanto a pessoa percorre a lista com as setas.
 */
const emFoco = computed(() => opcoes.value[ativo.value] ?? escolhido.value ?? null);

const linhasDaPrevia = computed(() =>
  props.previa && emFoco.value ? props.previa(emFoco.value) : [],
);

/**
 * A lista com o cabecalho de grupo intercalado.
 *
 * O caminho da classificacao aparece UMA VEZ por grupo, e nao repetido em cada linha: numa tabela
 * onde um terco das folhas se chama "Outros", repetir o caminho suja e agrupar resolve.
 */
const itensDaLista = computed(() => {
  const saida: Array<
    | { tipo: "grupo"; chave: string; grupo: GrupoDaLista }
    | {
        tipo: "opcao";
        chave: string;
        indice: number;
        registro: Registro;
        linha: LinhaDaLista;
      }
  > = [];

  let grupoAtual: string | null = null;

  opcoes.value.forEach((registro, indice) => {
    const grupo = props.grupo ? props.grupo(registro) : null;

    if (grupo && grupo.chave !== grupoAtual) {
      grupoAtual = grupo.chave;
      saida.push({ tipo: "grupo", chave: `g-${grupo.chave}`, grupo });
    }

    saida.push({
      tipo: "opcao",
      chave: String(chaveDe(registro)),
      indice,
      registro,
      linha: props.linha ? props.linha(registro) : { titulo: props.rotulo(registro) },
    });
  });

  return saida;
});

const recursoParaCriar = computed(() =>
  props.criavel && !props.disabled ? recursoCriavel(props.endpoint) : null,
);

const rotuloDeCriar = computed(() => {
  const recurso = recursoParaCriar.value;
  if (!recurso) return "";
  if (termo.value.trim()) return `Criar “${termo.value.trim()}”`;
  return recurso.rotuloNovo ?? "Criar registro";
});

async function criarAqui(): Promise<void> {
  const recurso = recursoParaCriar.value;
  if (!recurso) return;

  const texto = termo.value.trim();
  aberto.value = false;

  const criado = await pedirCriacao(props.endpoint, texto);
  if (!criado) return;

  registros.value = [
    criado,
    ...registros.value.filter((r) => !mesmaChave(chaveDe(r), chaveDe(criado))),
  ];
  escolher(criado);
}

async function carregar(): Promise<void> {
  if (props.disabled) {
    registros.value = [];
    return;
  }

  if (props.exigeEmpresa && empresa.atualId === null) {
    registros.value = [];
    falha.value = "Selecione uma empresa primeiro.";
    return;
  }

  carregando.value = true;
  falha.value = null;

  try {
    const pagina = await listar(props.endpoint, {
      page: 0,
      size: TAMANHO,
      termo: props.busca && termoAplicado.value ? termoAplicado.value : undefined,
      companyId: props.exigeEmpresa ? empresa.atualId : undefined,
      ...props.parametros,
    });
    registros.value = pagina.content;
  } catch (e) {
    registros.value = [];
    falha.value = e instanceof Error ? e.message : String(e);
  } finally {
    carregando.value = false;
  }
}

async function sincronizarEscolhido(): Promise<void> {
  const id = model.value;

  if (id === null || id === undefined) {
    escolhido.value = null;
    return;
  }

  if (escolhido.value && mesmaChave(chaveDe(escolhido.value), id)) return;

  const naLista = registros.value.find((r) => mesmaChave(chaveDe(r), id));
  if (naLista) {
    escolhido.value = naLista;
    return;
  }

  try {
    escolhido.value = await buscarUm(props.endpoint, id, props.parametroDaChave ?? "id");
  } catch {
    escolhido.value = null;
  }
}

let temporizador: ReturnType<typeof setTimeout> | undefined;

watch(termo, (valor) => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    termoAplicado.value = valor.trim();
    ativo.value = 0;
    if (props.busca) void carregar();
  }, ESPERA);
});

watch(model, () => void sincronizarEscolhido());
watch(
  () => empresa.atualId,
  () => void carregar(),
);

watch(
  () => props.endpoint,
  () => {
    registros.value = [];
    escolhido.value = null;
    model.value = null;
    void carregar();
  },
);

/**
 * O painel sai do fluxo e vai para o body.
 *
 * Formulario longo rola dentro do modal, e um painel posicionado por dentro dele e CORTADO na
 * borda -- foi o que aconteceu com a lista de NCM. Medindo o campo e desenhando por cima de tudo,
 * o corte deixa de existir; em troca, a medida tem de acompanhar rolagem e redimensionamento.
 */
function medir(): void {
  const campo = raiz.value?.getBoundingClientRect();
  if (!campo) return;

  const margem = 8;
  const largura = Math.min(
    Math.max(campo.width, props.previa || props.grupo ? 420 : campo.width),
    window.innerWidth - margem * 2,
  );

  const abaixo = window.innerHeight - campo.bottom;
  const acima = abaixo < 260 && campo.top > abaixo;

  caixa.value = {
    top: acima ? campo.top - margem / 2 : campo.bottom + margem / 2,
    left: Math.min(Math.max(campo.left, margem), window.innerWidth - largura - margem),
    largura,
    acima,
  };
}

function abrir(): void {
  if (props.disabled) return;
  medir();
  aberto.value = true;
  termo.value = "";
  termoAplicado.value = "";
  ativo.value = 0;
  void nextTick(() => campo.value?.focus());
  if (registros.value.length === 0) void carregar();
}

defineExpose({ focar: abrir });

function mover(passo: number): void {
  const total = opcoes.value.length;
  if (total === 0) return;
  ativo.value = (ativo.value + passo + total) % total;

  // Cabem sete linhas na vista e a busca traz cinquenta: sem isto o realce desce para fora da
  // area visivel e a pessoa navega as cegas.
  void nextTick(() =>
    painel.value?.querySelector(".opcao-ativa")?.scrollIntoView({ block: "nearest" }),
  );
}

/**
 * Enter escolhe o item em foco. Sem isto o Enter chegava ao formulario e o submetia -- quem
 * digitava e apertava Enter via a tela recusar campo obrigatorio em vez de escolher.
 */
function confirmar(): void {
  const registro = opcoes.value[ativo.value];
  if (registro) escolher(registro);
}

function escolher(registro: Registro): void {
  escolhido.value = registro;
  model.value = chaveDe(registro) as number | string;
  aberto.value = false;
  emit("escolhido", registro);
}

function limpar(): void {
  escolhido.value = null;
  model.value = null;
}

function fora(evento: MouseEvent): void {
  const alvo = evento.target as Node;
  if (raiz.value?.contains(alvo) || painel.value?.contains(alvo)) return;
  aberto.value = false;
}

watch(aberto, (agora) => {
  if (agora) {
    medir();
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return;
  }
  window.removeEventListener("scroll", medir, true);
  window.removeEventListener("resize", medir);
});

onMounted(() => {
  document.addEventListener("click", fora);
  void carregar().then(sincronizarEscolhido);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", fora);
  window.removeEventListener("scroll", medir, true);
  window.removeEventListener("resize", medir);
  clearTimeout(temporizador);
});
</script>

<template>
  <div ref="raiz" class="flex flex-col gap-1.5">
    <span v-if="label" class="text-small font-medium text-ink-soft">{{ label }}</span>

    <div class="relative">
      <div
        class="flex h-control w-full items-center gap-1 rounded-control border bg-surface pr-2 pl-3 transition-colors"
        :class="[
          invalid
            ? 'border-danger'
            : aberto
              ? 'border-primary ring-2 ring-primary/25'
              : 'border-line-field',
          disabled ? 'cursor-not-allowed bg-app' : 'cursor-text',
        ]"
        @click.stop="abrir"
      >
        <input
          v-if="aberto"
          ref="campo"
          v-model="termo"
          type="text"
          :placeholder="textoDoEscolhido || placeholder || 'Buscar...'"
          class="min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-mute focus:outline-none"
          @keydown.down.prevent="mover(1)"
          @keydown.up.prevent="mover(-1)"
          @keydown.enter.prevent.stop="confirmar"
          @keydown.esc.prevent.stop="aberto = false"
        />
        <span
          v-else
          class="min-w-0 flex-1 truncate text-body"
          :class="escolhido ? 'text-ink' : 'text-ink-mute'"
        >
          {{ textoDoEscolhido || placeholder || "Selecione..." }}
        </span>

        <LoaderCircle v-if="carregando" class="size-4 shrink-0 animate-spin text-ink-mute" />
        <button
          v-else-if="limpavel && escolhido && !disabled"
          type="button"
          class="shrink-0 cursor-pointer rounded p-0.5 text-ink-mute hover:text-ink"
          aria-label="Limpar"
          @click.stop="limpar"
        >
          <X class="size-4" />
        </button>
        <ChevronDown v-else class="size-4 shrink-0 text-ink-mute" />
      </div>

      <Teleport to="body">
        <div
          v-if="aberto"
          ref="painel"
          class="fixed z-50"
          :style="{
            top: `${caixa.top}px`,
            left: `${caixa.left}px`,
            width: `${caixa.largura}px`,
            transform: caixa.acima ? 'translateY(-100%)' : undefined,
          }"
        >
          <div
            v-if="linhasDaPrevia.length > 0"
            class="w-full overflow-hidden rounded-card border border-line bg-surface shadow-lg"
          >
            <ul class="max-h-64 overflow-y-auto">
              <li v-if="falha" class="px-3 py-2 text-body text-danger">
                {{ falha }}
              </li>
              <li v-else-if="carregando" class="px-3 py-2 text-body text-ink-mute">
                Carregando...
              </li>
              <li v-else-if="opcoes.length === 0" class="px-3 py-2 text-body text-ink-mute">
                {{
                  termoAplicado ? `Nada encontrado para “${termoAplicado}”.` : "Nenhum registro."
                }}
              </li>

              <li v-for="item in itensDaLista" :key="item.chave">
                <div
                  v-if="item.tipo === 'grupo'"
                  class="sticky top-0 z-10 flex items-baseline gap-2 border-y border-line bg-app px-3 py-1.5 first:border-t-0"
                >
                  <span
                    v-if="item.grupo.prefixo"
                    class="shrink-0 font-mono text-small text-ink-soft tabular-nums"
                  >
                    {{ item.grupo.prefixo }}
                  </span>
                  <span class="truncate text-small font-medium text-ink-soft">
                    {{ item.grupo.titulo }}
                  </span>
                </div>

                <button
                  v-else
                  type="button"
                  class="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-app"
                  :class="[
                    mesmaChave(chaveDe(item.registro), model) ? 'bg-primary-50' : '',
                    item.indice === ativo ? 'opcao-ativa bg-app' : '',
                  ]"
                  @mouseenter="ativo = item.indice"
                  @click.stop="escolher(item.registro)"
                >
                  <span
                    v-if="item.linha.prefixo"
                    class="shrink-0 font-mono text-body text-ink-soft tabular-nums"
                  >
                    {{ item.linha.prefixo }}
                  </span>
                  <span
                    class="min-w-0 flex-1 truncate text-body"
                    :class="
                      mesmaChave(chaveDe(item.registro), model)
                        ? 'font-medium text-primary'
                        : 'text-ink'
                    "
                  >
                    {{ item.linha.titulo }}
                  </span>
                  <span
                    v-if="item.linha.etiqueta"
                    class="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 font-mono text-small font-medium text-primary"
                  >
                    {{ item.linha.etiqueta }}
                  </span>
                </button>
              </li>
            </ul>

            <dl class="flex flex-col gap-1 border-t border-line bg-app/60 px-3 py-2.5">
              <div v-for="linha in linhasDaPrevia" :key="linha.rotulo" class="flex gap-2">
                <dt class="w-28 shrink-0 pt-px text-small text-ink-soft uppercase">
                  {{ linha.rotulo }}
                </dt>
                <dd
                  class="line-clamp-2 min-w-0 flex-1 text-body"
                  :class="linha.destaque ? 'font-medium text-primary' : 'text-ink'"
                >
                  {{ linha.valor }}
                </dd>
              </div>
            </dl>
          </div>

          <ul
            v-else
            class="max-h-72 w-full overflow-y-auto rounded-card border border-line bg-surface py-1 shadow-lg"
          >
            <li v-if="falha" class="px-3 py-2 text-body text-danger">
              {{ falha }}
            </li>
            <li v-else-if="carregando" class="px-3 py-2 text-body text-ink-mute">Carregando...</li>
            <li
              v-else-if="opcoes.length === 0 && !recursoParaCriar"
              class="px-3 py-2 text-body text-ink-mute"
            >
              {{ termoAplicado ? `Nada encontrado para “${termoAplicado}”.` : "Nenhum registro." }}
            </li>
            <li v-for="item in itensDaLista" :key="item.chave">
              <div
                v-if="item.tipo === 'grupo'"
                class="sticky top-0 z-10 flex items-baseline gap-2 border-y border-line bg-app px-3 py-1.5"
              >
                <span
                  v-if="item.grupo.prefixo"
                  class="shrink-0 font-mono text-small text-ink-soft tabular-nums"
                >
                  {{ item.grupo.prefixo }}
                </span>
                <span class="truncate text-small font-medium text-ink-soft">
                  {{ item.grupo.titulo }}
                </span>
              </div>

              <button
                v-else
                type="button"
                class="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-app"
                :class="[
                  mesmaChave(chaveDe(item.registro), model) ? 'bg-primary-50' : '',
                  item.indice === ativo ? 'opcao-ativa bg-app' : '',
                ]"
                :title="item.linha.titulo"
                @mouseenter="ativo = item.indice"
                @click.stop="escolher(item.registro)"
              >
                <span
                  v-if="item.linha.prefixo"
                  class="shrink-0 font-mono text-body text-ink-soft tabular-nums"
                >
                  {{ item.linha.prefixo }}
                </span>
                <span
                  class="line-clamp-2 min-w-0 flex-1 text-body"
                  :class="
                    mesmaChave(chaveDe(item.registro), model)
                      ? 'font-medium text-primary'
                      : 'text-ink'
                  "
                >
                  {{ item.linha.titulo }}
                </span>
                <span
                  v-if="item.linha.etiqueta"
                  class="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 font-mono text-small font-medium text-primary"
                >
                  {{ item.linha.etiqueta }}
                </span>
              </button>
            </li>

            <li
              v-if="recursoParaCriar && !carregando && !falha"
              class="sticky bottom-0 border-t border-line bg-surface"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-body text-primary transition-colors hover:bg-app"
                @click.stop="criarAqui"
              >
                <Plus class="size-4 shrink-0" />
                <span class="truncate">{{ rotuloDeCriar }}</span>
              </button>
            </li>
          </ul>
        </div>
      </Teleport>
    </div>

    <span v-if="hint" class="text-small" :class="invalid ? 'text-danger' : 'text-ink-mute'">
      {{ hint }}
    </span>
  </div>
</template>
