<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { ArrowRight, Pencil, Trash2 } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsConfirmacao from "@/components/ui/GsConfirmacao.vue";
import GsMenuDeAcoes, { type ItemDeMenu } from "@/components/ui/GsMenuDeAcoes.vue";
import GsIconButton from "@/components/ui/GsIconButton.vue";
import { Info } from "lucide-vue-next";
import { useProblemas } from "@/lib/problemas";
import { MENSAGENS } from "@/lib/mensagens";
import GsPagination from "@/components/ui/GsPagination.vue";
import GsSearchBox from "@/components/ui/GsSearchBox.vue";
import GsTable from "@/components/ui/GsTable.vue";
import FormularioDeRecurso from "@/components/form/FormularioDeRecurso.vue";
import PainelDeRecurso from "@/components/form/PainelDeRecurso.vue";
import { listar, type Registro } from "@/api/lista";
import { buscarUm, excluir, executar, preparar } from "@/api/recurso";
import { useSessao } from "@/auth/sessao";
import { useTenant } from "@/auth/tenant";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useAvisos } from "@/lib/avisos";
import { booleano, dataCurta, dataHora, dinheiro, numero } from "@/lib/formato";
import {
  recursoPorRota,
  type AcaoDeRecurso,
  type AcaoDeTela,
  type ColunaRecurso,
  type Recurso,
} from "@/lib/recursos";
import type { Coluna, SelectOption } from "@/types";

const TAMANHO = 20;

const route = useRoute();
const router = useRouter();
const sessao = useSessao();
const tenant = useTenant();
const empresa = useEmpresa();
const avisos = useAvisos();
const problemas = useProblemas();
const clienteDeConsulta = useQueryClient();

const recurso = computed(() => recursoPorRota.get(route.path));

const destacarNovo = computed(() => route.query.novo === "1");

const pagina = ref(0);
const termo = ref("");
const termoAplicado = ref("");

const emEdicao = ref<Registro | null>(null);
const formularioAberto = ref(false);
const carregandoRegistro = ref(false);

const acaoDeTelaAberta = ref<AcaoDeTela | null>(null);
const opcoesCarregadas = ref<Record<string, SelectOption[]>>({});

const paraExcluir = ref<Registro | null>(null);
const acaoPendente = ref<{ acao: AcaoDeRecurso; registro: Registro } | null>(null);
const noPainel = ref<Registro | null>(null);
const abaDoPainel = ref<string | undefined>(undefined);

let temporizador: ReturnType<typeof setTimeout> | undefined;
watch(termo, (valor) => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    termoAplicado.value = valor.trim();
    pagina.value = 0;
  }, 350);
});

watch(
  () => route.path,
  () => {
    pagina.value = 0;
    termo.value = "";
    termoAplicado.value = "";
    fecharFormulario();
    acaoDeTelaAberta.value = null;
    paraExcluir.value = null;
    acaoPendente.value = null;
    noPainel.value = null;
  },
);

const consulta = useQuery({
  queryKey: computed(() => [
    "lista",
    recurso.value?.endpoint,
    pagina.value,
    termoAplicado.value,
    tenant.atual,
    empresa.atualId,
    recurso.value?.ordenacao,
  ]),
  enabled: computed(
    () => Boolean(recurso.value) && (!recurso.value?.exigeEmpresa || empresa.atualId !== null),
  ),
  placeholderData: keepPreviousData,
  queryFn: () =>
    listar(recurso.value!.endpoint, {
      page: pagina.value,
      size: TAMANHO,
      termo: termoAplicado.value || undefined,
      companyId: recurso.value!.exigeEmpresa ? empresa.atualId : undefined,
      sort: recurso.value!.ordenacao,
    }),
});

const linhas = computed<Registro[]>(() => consulta.data.value?.content ?? []);
const metadados = computed(() => consulta.data.value?.page);
const semEmpresa = computed(() => Boolean(recurso.value?.exigeEmpresa) && empresa.atualId === null);

const erro = computed(() => {
  if (semEmpresa.value) return EXIGE_EMPRESA;
  return consulta.isError.value ? String(consulta.error.value?.message) : undefined;
});

const podeEscrever = computed(() =>
  recurso.value ? sessao.temPapel(...recurso.value.papeisEscrita) : false,
);

const podeCriar = computed(() => Boolean(recurso.value?.formulario) && podeEscrever.value);

const acoesDeTelaVisiveis = computed(() =>
  (recurso.value?.acoesDeTela ?? []).filter((a) => sessao.temPapel(...a.papeis)),
);

const temMenu = computed(() => {
  const r = recurso.value;
  if (!r) return false;
  return (
    Boolean(r.formulario) ||
    Boolean(r.painel) ||
    Boolean(r.podeExcluir) ||
    (r.acoes?.length ?? 0) > 0
  );
});

const colunas = computed<Coluna[]>(() => {
  const base = (recurso.value?.colunas ?? []).map((c) => ({
    key: c.campo,
    label: c.label,
    align:
      c.formato === "dinheiro" || c.formato === "numero" ? ("right" as const) : ("left" as const),
  }));
  return temMenu.value ? [...base, { key: "acoes", label: "" }] : base;
});

function itensDoMenu(registro: Registro): ItemDeMenu[] {
  const r = recurso.value;
  if (!r) return [];

  const itens: ItemDeMenu[] = [];

  if (r.formulario) {
    const editavel = !r.podeEditar || r.podeEditar(registro);
    itens.push({
      chave: "editar",
      rotulo: "Editar",
      icone: Pencil,
      desabilitado: !podeEscrever.value || !editavel,
      motivo: podeEscrever.value ? "Só rascunho pode ser alterado." : "Seu papel não permite.",
    });
  }

  if (r.painel) {
    itens.push({ chave: "painel", rotulo: r.painel.rotulo, icone: r.painel.icone });

    for (const aba of r.painel.abas) {
      if (!aba.atalho) continue;
      if (aba.atalho.disponivel && !aba.atalho.disponivel(registro)) continue;
      itens.push({
        chave: `aba:${aba.titulo}`,
        rotulo: aba.atalho.rotulo,
        icone: aba.atalho.icone,
        desabilitado: !podeEscrever.value,
        motivo: podeEscrever.value ? aba.atalho.motivo : "Seu papel não permite.",
      });
    }
  }

  for (const acao of r.acoes ?? []) {
    const permitido = sessao.temPapel(...(acao.papeis ?? r.papeisEscrita));
    const disponivel = !acao.disponivel || acao.disponivel(registro);
    itens.push({
      chave: `acao:${acao.chave}`,
      rotulo: acao.rotulo,
      icone: acao.icone,
      perigo: acao.perigo,
      desabilitado: !permitido || !disponivel,
      motivo: permitido ? acao.motivo : "Seu papel não permite.",
    });
  }

  if (r.podeExcluir !== undefined || r.formulario) {
    const excluivel = r.podeExcluir ? r.podeExcluir(registro) : true;
    itens.push({
      chave: "excluir",
      rotulo: r.exclusao?.rotuloConfirmar ?? "Excluir",
      icone: Trash2,
      perigo: true,
      desabilitado: !podeEscrever.value || !excluivel,
      motivo: podeEscrever.value ? "Só rascunho pode ser apagado." : "Seu papel não permite.",
    });
  }

  return itens;
}

async function abrirEdicao(registro: Registro): Promise<void> {
  const r = recurso.value;
  if (!r) return;

  if (!r.carregarAntesDeEditar) {
    emEdicao.value = registro;
    formularioAberto.value = true;
    return;
  }

  carregandoRegistro.value = true;
  try {
    const carregado = await buscarUm(r.endpoint, chaveDoRegistro(registro));
    emEdicao.value = r.aoCarregar ? r.aoCarregar(carregado) : carregado;
    formularioAberto.value = true;
  } catch (e) {
    avisos.falha(e instanceof Error ? e.message : String(e));
  } finally {
    carregandoRegistro.value = false;
  }
}

/**
 * O documento seguinte, já montado pela API e ainda não gravado.
 *
 * Guarda o recurso de destino junto com o corpo porque o formulário que abre não é o desta tela: o
 * pedido de compra abre o formulário do recebimento, e é a definição do recebimento que diz quais
 * campos e linhas desenhar.
 */
const preparado = ref<{
  recurso: Recurso;
  registro: Registro;
  titulo: string;
  origem: string;
} | null>(null);

async function prepararSeguinte(acao: AcaoDeRecurso, registro: Registro): Promise<void> {
  const destino = recursoPorRota.get(acao.prepara!.rota);

  if (!destino?.formulario) {
    avisos.falha("A tela do documento seguinte não está disponível.");
    return;
  }

  try {
    const corpo = await preparar(acao.prepara!.origem(registro));
    const linhas = Object.values(corpo).find(Array.isArray) as unknown[] | undefined;

    if (linhas && linhas.length === 0) {
      avisos.informa("Não há quantidade pendente: este documento já foi atendido por completo.");
      return;
    }

    preparado.value = {
      recurso: destino,
      registro: corpo,
      titulo: acao.rotulo,
      origem: `A partir de ${rotuloDoRegistro(registro)}`,
    };
  } catch (erro) {
    avisos.falha(erro instanceof Error ? erro.message : String(erro));
  }
}

function abrirCriacao(): void {
  emEdicao.value = null;
  formularioAberto.value = true;

  if (route.query.novo === undefined) return;

  const query = { ...route.query };
  delete query.novo;
  void router.replace({ path: route.path, query });
}

function fecharFormulario(): void {
  formularioAberto.value = false;
  emEdicao.value = null;
}

function escolherNoMenu(chave: string, registro: Registro): void {
  if (chave === "editar") {
    void abrirEdicao(registro);
    return;
  }

  if (chave === "painel") {
    abaDoPainel.value = undefined;
    noPainel.value = registro;
    return;
  }

  if (chave.startsWith("aba:")) {
    abaDoPainel.value = chave.slice("aba:".length);
    noPainel.value = registro;
    return;
  }

  if (chave === "excluir") {
    paraExcluir.value = registro;
    return;
  }

  const acao = (recurso.value?.acoes ?? []).find((a) => `acao:${a.chave}` === chave);
  if (!acao) return;

  if (acao.prepara) {
    void prepararSeguinte(acao, registro);
    return;
  }

  acaoPendente.value = { acao, registro };
}

/**
 * A rota da ação com formulário, montada do registro.
 *
 * A ação de registro normalmente é um POST vazio que o `executar` resolve. Quando ela tem corpo, o
 * caminho tem de ser concreto — e é o mesmo `FormularioDeRecurso` que a ação de tela já usa.
 */
const endpointDaAcao = computed(() => {
  const pendente = acaoPendente.value;
  if (!pendente) return "";

  return `${recurso.value!.endpoint}/${chaveDoRegistro(pendente.registro)}/${pendente.acao.chave}`;
});

const chaveDoRegistro = (registro: Registro): number | string => {
  if (typeof registro.id === "number") return registro.id;

  const texto = String(registro.id ?? "");
  return /^\d+$/.test(texto) ? Number(texto) : texto;
};

const rotuloDoRegistro = (registro: Registro | null): string => {
  if (!registro) return "";
  const r = recurso.value;
  if (r?.rotulo) return r.rotulo(registro);
  return String(
    registro.number ?? registro.name ?? registro.code ?? registro.prefix ?? registro.id,
  );
};

const remocao = useMutation({
  mutationFn: (registro: Registro) => excluir(recurso.value!.endpoint, chaveDoRegistro(registro)),
  onSuccess: () => {
    void clienteDeConsulta.invalidateQueries({ queryKey: ["lista"] });
    avisos.sucesso(recurso.value?.exclusao?.sucesso ?? "Registro excluído.");
    paraExcluir.value = null;
  },
  onError: (e: unknown) => {
    avisos.falha(e instanceof Error ? e.message : String(e));
    paraExcluir.value = null;
  },
});

const execucao = useMutation({
  mutationFn: ({ acao, registro }: { acao: AcaoDeRecurso; registro: Registro }) =>
    executar(recurso.value!.endpoint, chaveDoRegistro(registro), acao.chave, acao.metodo ?? "POST"),
  onSuccess: (_dado, variaveis) => {
    void clienteDeConsulta.invalidateQueries({ queryKey: ["lista"] });
    avisos.sucesso(variaveis.acao.sucesso);
    problemas.limpar(route.path, chaveDoRegistro(variaveis.registro));
    acaoPendente.value = null;
  },
  onError: (e: unknown, variaveis) => {
    problemas.registrar(route.path, chaveDoRegistro(variaveis.registro), variaveis.acao.rotulo, e);
    avisos.falha(e instanceof Error ? e.message : String(e));
    acaoPendente.value = null;
  },
});

function problemaDe(registro: Registro) {
  return problemas.doRegistro(route.path, chaveDoRegistro(registro));
}

function abrirProblema(registro: Registro): void {
  const problema = problemaDe(registro);
  if (!problema) return;

  avisos.interromper(problema.chave, {
    texto: `${MENSAGENS[problema.chave].texto}\n\nAo tentar "${problema.acao}", o servidor respondeu: ${problema.detalhe}`,
  });
}

async function abrirAcaoDeTela(acao: AcaoDeTela): Promise<void> {
  for (const dinamicas of acao.opcoesDinamicas ?? []) {
    if (opcoesCarregadas.value[dinamicas.campo]) continue;
    try {
      const pagina = await listar(dinamicas.endpoint, { page: 0, size: 200 });
      opcoesCarregadas.value = {
        ...opcoesCarregadas.value,
        [dinamicas.campo]: pagina.content.map((r) => ({
          value: dinamicas.valor(r),
          label: dinamicas.rotulo(r),
        })),
      };
    } catch (e) {
      avisos.falha(e instanceof Error ? e.message : String(e));
      return;
    }
  }
  acaoDeTelaAberta.value = acao;
}

const formularioDaAcao = computed(() => {
  const acao = acaoDeTelaAberta.value;
  if (!acao) return [];

  return acao.formulario.map((secao) => ({
    ...secao,
    campos: secao.campos.map((campo) => {
      const opcoes = opcoesCarregadas.value[campo.campo];
      return opcoes ? { ...campo, opcoes } : campo;
    }),
  }));
});

function formatar(registro: Registro, coluna: ColunaRecurso): string {
  const valor = coluna.valor ? coluna.valor(registro) : registro[coluna.campo];

  if (valor === null || valor === undefined || valor === "") return "—";

  switch (coluna.formato) {
    case "dinheiro":
      return dinheiro(valor);
    case "numero":
      return numero(valor);
    case "data":
      return dataCurta(valor);
    case "dataHora":
      return dataHora(valor);
    case "booleano":
      return booleano(valor);
    default:
      return String(valor);
  }
}
</script>

<template>
  <div v-if="recurso" class="flex flex-col gap-4 mt-4">
    <div
      v-if="recurso.temBusca || podeCriar || acoesDeTelaVisiveis.length > 0"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <GsSearchBox
        v-if="recurso.temBusca"
        v-model="termo"
        :placeholder="recurso.buscaPlaceholder ?? 'Buscar...'"
        class="w-full max-w-md"
      />
      <span v-else />

      <div class="flex flex-wrap items-center gap-2">
        <GsButton
          v-for="acao in acoesDeTelaVisiveis"
          :key="acao.chave"
          :variant="acao.variante ?? 'secondary'"
          @click="abrirAcaoDeTela(acao)"
        >
          <component :is="acao.icone" v-if="acao.icone" class="size-4" />
          {{ acao.rotulo }}
        </GsButton>

        <span
          v-if="podeCriar && destacarNovo"
          class="flex items-center gap-1.5 text-small font-medium text-primary"
        >
          Comece por aqui
          <ArrowRight class="size-4" />
        </span>

        <GsButton
          v-if="podeCriar"
          variant="primary"
          :class="destacarNovo ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-app' : ''"
          @click="abrirCriacao"
        >
          {{ recurso.rotuloNovo ?? "Novo" }}
        </GsButton>
      </div>
    </div>

    <p v-if="carregandoRegistro" class="text-small text-ink-mute">
      Carregando o registro para edição...
    </p>

    <GsCard flush>
      <GsTable
        :colunas="colunas"
        :linhas="linhas"
        :carregando="consulta.isPending.value && !semEmpresa"
        :erro="erro"
        :esqueletos="8"
        :vazio-texto="
          termoAplicado ? `Nada encontrado para “${termoAplicado}”.` : 'Nenhum registro ainda.'
        "
      >
        <template #linha="{ item }">
          <td
            v-for="coluna in recurso.colunas"
            :key="coluna.campo"
            class="px-6 py-3.5"
            :class="[
              coluna.formato === 'dinheiro' || coluna.formato === 'numero'
                ? 'text-right tabular-nums font-medium text-ink'
                : '',
              coluna.formato === 'codigo' && !coluna.descricao
                ? 'font-medium whitespace-nowrap text-ink'
                : '',
              coluna.formato === 'codigo' && coluna.descricao ? 'font-medium text-ink' : '',
              coluna.formato === 'data' || coluna.formato === 'dataHora'
                ? 'whitespace-nowrap text-ink-soft'
                : '',
              !coluna.formato || coluna.formato === 'texto' ? 'text-ink' : '',
            ]"
          >
            <template v-if="coluna.formato === 'situacao'">
              <GsBadge v-if="coluna.situacao?.(item)" :tone="coluna.situacao(item)!.tom">
                {{ coluna.situacao(item)!.texto }}
              </GsBadge>
              <span v-else class="text-ink-mute">—</span>
            </template>
            <template v-else-if="coluna.descricao">
              <div class="flex flex-col gap-0.5">
                <span>{{ formatar(item, coluna) }}</span>
                <span v-if="coluna.descricao(item)" class="text-xs font-normal text-ink-soft">
                  {{ coluna.descricao(item) }}
                </span>
              </div>
            </template>
            <template v-else>{{ formatar(item, coluna) }}</template>
          </td>

          <td v-if="temMenu" class="px-4 py-2">
            <div v-if="recurso.acoesEmIcones" class="flex items-center justify-end gap-0.5">
              <GsIconButton
                v-if="problemaDe(item)"
                label="Ver o motivo da recusa"
                tone="alerta"
                title="A última tentativa foi recusada. Clique para ver o motivo."
                @click="abrirProblema(item)"
              >
                <Info class="size-4" />
              </GsIconButton>

              <GsIconButton
                v-for="acao in itensDoMenu(item)"
                :key="acao.chave"
                :label="acao.rotulo"
                :title="acao.desabilitado ? (acao.motivo ?? acao.rotulo) : acao.rotulo"
                :disabled="acao.desabilitado"
                @click="escolherNoMenu(acao.chave, item)"
              >
                <component :is="acao.icone" class="size-4" />
              </GsIconButton>
            </div>

            <GsMenuDeAcoes
              v-else
              :itens="itensDoMenu(item)"
              @escolher="escolherNoMenu($event, item)"
            />
          </td>
        </template>
      </GsTable>

      <GsPagination
        v-if="metadados"
        :pagina="Number(metadados.number ?? 0)"
        :total-paginas="Number(metadados.totalPages ?? 0)"
        :total-elementos="Number(metadados.totalElements ?? 0)"
        :tamanho="TAMANHO"
        @mudar="pagina = $event"
      />
    </GsCard>

    <FormularioDeRecurso
      v-if="formularioAberto && recurso.formulario"
      :titulo="
        emEdicao ? `Editar ${recurso.singular ?? 'registro'}` : (recurso.rotuloNovo ?? 'Novo')
      "
      :subtitulo="emEdicao ? rotuloDoRegistro(emEdicao) : undefined"
      :endpoint="recurso.endpoint"
      :formulario="recurso.formulario"
      :linhas="recurso.linhas"
      :registro="emEdicao"
      :largura="recurso.larguraDoFormulario"
      @fechar="fecharFormulario"
    />

    <FormularioDeRecurso
      v-if="preparado"
      :titulo="preparado.titulo"
      :subtitulo="preparado.origem"
      :endpoint="preparado.recurso.endpoint"
      :formulario="preparado.recurso.formulario!"
      :linhas="preparado.recurso.linhas"
      :registro="preparado.registro"
      :largura="preparado.recurso.larguraDoFormulario"
      @fechar="preparado = null"
    />

    <FormularioDeRecurso
      v-if="acaoDeTelaAberta"
      :titulo="acaoDeTelaAberta.titulo"
      :endpoint="acaoDeTelaAberta.endpoint"
      :formulario="formularioDaAcao"
      :linhas="acaoDeTelaAberta.linhas"
      :largura="acaoDeTelaAberta.largura"
      :por-consulta="acaoDeTelaAberta.porConsulta"
      :metodo="acaoDeTelaAberta.metodo"
      :mensagem-de-sucesso="acaoDeTelaAberta.sucesso"
      :rotulo-de-envio="acaoDeTelaAberta.rotulo"
      @fechar="acaoDeTelaAberta = null"
    />

    <PainelDeRecurso
      v-if="noPainel && recurso.painel"
      :painel="recurso.painel"
      :registro="noPainel"
      :subtitulo="rotuloDoRegistro(noPainel)"
      :aba-inicial="abaDoPainel"
      @fechar="noPainel = null"
    />

    <GsConfirmacao
      v-if="paraExcluir"
      :titulo="recurso?.exclusao?.titulo ?? 'Excluir registro'"
      :mensagem="
        recurso?.exclusao
          ? recurso.exclusao.mensagem(rotuloDoRegistro(paraExcluir))
          : `Excluir “${rotuloDoRegistro(paraExcluir)}”? A API faz remoção lógica, mas o registro some das listagens.`
      "
      :rotulo-confirmar="recurso?.exclusao?.rotuloConfirmar ?? 'Excluir'"
      perigo
      :ocupado="remocao.isPending.value"
      @confirmar="remocao.mutate(paraExcluir)"
      @fechar="paraExcluir = null"
    />

    <FormularioDeRecurso
      v-if="acaoPendente?.acao.formulario"
      :titulo="acaoPendente.acao.titulo ?? acaoPendente.acao.rotulo"
      :endpoint="endpointDaAcao"
      :formulario="acaoPendente.acao.formulario"
      :mensagem-de-sucesso="acaoPendente.acao.sucesso"
      :rotulo-de-envio="acaoPendente.acao.rotulo"
      @fechar="acaoPendente = null"
    />

    <GsConfirmacao
      v-if="acaoPendente && !acaoPendente.acao.formulario"
      :titulo="acaoPendente.acao.rotulo"
      :mensagem="`${acaoPendente.acao.confirmacao} Documento: ${rotuloDoRegistro(acaoPendente.registro)}.`"
      :rotulo-confirmar="acaoPendente.acao.rotulo"
      :perigo="acaoPendente.acao.perigo"
      :ocupado="execucao.isPending.value"
      @confirmar="execucao.mutate(acaoPendente)"
      @fechar="acaoPendente = null"
    />
  </div>
</template>
