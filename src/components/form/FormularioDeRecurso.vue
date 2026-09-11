<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  History,
  Loader2,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsFormulario from "./GsFormulario.vue";
import GsLinhas from "./GsLinhas.vue";
import GsPassos from "./GsPassos.vue";
import { ehPorPassos, passoDoCampo, passosComErro, passosDe, validarPasso } from "@/lib/passos";
import {
  agendarRascunho,
  chaveDeRascunho,
  descarregarRascunhos,
  descartarRascunho,
  lerRascunho,
} from "@/lib/rascunhos";
import { atualizar, criar, postarComConsulta, substituir, type Corpo } from "@/api/recurso";
import { ErroDaApi } from "@/api/erro";
import type { Registro } from "@/api/lista";
import { useAvisos } from "@/lib/avisos";
import {
  corpoDasLinhas,
  corpoDoFormulario,
  linhasIniciais,
  validarFormulario,
  validarLinhas,
  valoresIniciais,
  type AnuncioDaEscolha,
  type Formulario,
  type LinhasDeFormulario,
  type Valores,
} from "@/lib/formulario";

const props = defineProps<{
  titulo: string;
  endpoint: string;
  formulario: Formulario;
  registro?: Registro | null;
  linhas?: LinhasDeFormulario[];
  subtitulo?: string;
  largura?: "media" | "larga" | "cheia";
  antesDeEnviar?: (corpo: Corpo, valores: Valores) => Corpo;
  porConsulta?: boolean;
  metodo?: "POST" | "PUT";
  metodoDeCriacao?: "POST" | "PUT";
  mensagemDeSucesso?: string;
  rotuloDeEnvio?: string;
  /**
   * Recusa que só quem chamou sabe fazer, porque depende de coisa fora do formulário.
   *
   * O `validar` do campo vê o valor e os outros valores, e nada além. Duplicata precisa das
   * linhas que já existem no servidor — quem as tem é a tela, não o formulário.
   */
  validacaoExtra?: (valores: Valores) => Record<string, string> | null;
}>();

const emit = defineEmits<{ (e: "fechar"): void; (e: "salvo", registro: Registro): void }>();

const avisos = useAvisos();
const clienteDeConsulta = useQueryClient();

const criando = computed(() => !props.registro?.id);
const chave = computed(() => chaveDeRascunho(props.endpoint, props.registro?.id));

const valores = ref<Valores>({});
const linhasPorCampo = ref<Record<string, Valores[]>>({});
const errosDeCampo = ref<Record<string, string>>({});
const errosDeLinha = ref<Record<string, string>>({});
const falha = ref<string | null>(null);
const recuperado = ref(false);
const confirmandoDescarte = ref(false);
const anuncio = ref<AnuncioDaEscolha | null>(null);

function desfazerAnuncio(): void {
  if (!anuncio.value) return;
  valores.value = { ...valores.value, ...anuncio.value.desfazer };
  anuncio.value = null;
}

const porPassos = computed(() => ehPorPassos(props.formulario, props.linhas ?? []));
const passos = computed(() => passosDe(props.formulario, props.linhas ?? []));
const passo = ref(0);
const maiorVisitado = ref(0);

const noUltimo = computed(() => !porPassos.value || passo.value >= passos.value.length - 1);

const comErro = computed(() =>
  passosComErro(
    passos.value,
    props.formulario,
    Object.keys(errosDeCampo.value),
    Object.keys(errosDeLinha.value),
  ),
);

const formularioVisivel = computed(() => {
  if (!porPassos.value) return props.formulario;
  const secao = passos.value[passo.value]?.secao;
  return secao === null || secao === undefined ? [] : [props.formulario[secao]];
});

const linhasVisiveis = computed(() => {
  const todas = props.linhas ?? [];
  if (!porPassos.value) return todas;
  const doPasso = passos.value[passo.value]?.linhas ?? [];
  return todas.filter((definicao) => doPasso.includes(definicao.campo));
});

function irPara(indice: number): void {
  passo.value = Math.min(Math.max(indice, 0), passos.value.length - 1);
  maiorVisitado.value = Math.max(maiorVisitado.value, passo.value);
}

/**
 * Cada saída de passo cobra o que é dele. Obrigatório do primeiro passo aparecendo só quando a
 * pessoa chega no terceiro é o defeito que os passos existem para não ter.
 */
function avancar(): void {
  const erros = validarPasso(
    passos.value[passo.value],
    props.formulario,
    props.linhas ?? [],
    valores.value,
    linhasPorCampo.value,
  );

  if (Object.keys(erros.campos).length > 0 || Object.keys(erros.linhas).length > 0) {
    errosDeCampo.value = erros.campos;
    errosDeLinha.value = erros.linhas;
    falha.value = "Preencha o que falta neste passo.";
    return;
  }

  errosDeCampo.value = {};
  errosDeLinha.value = {};
  falha.value = null;
  irPara(passo.value + 1);
}

let assinatura = "";

function partir(registro?: Registro | null): void {
  const iniciais = valoresIniciais(props.formulario, registro);
  const linhasDoRegistro = linhasIniciais(props.linhas ?? [], registro);

  valores.value = iniciais;
  linhasPorCampo.value = linhasDoRegistro;
  passo.value = 0;
  maiorVisitado.value = 0;
  errosDeCampo.value = {};
  errosDeLinha.value = {};
  falha.value = null;
  recuperado.value = false;
  assinatura = JSON.stringify([iniciais, linhasDoRegistro]);

  const rascunho = lerRascunho(chave.value);
  if (!rascunho) return;

  const informados = !registro?.id && registro ? Object.keys(registro) : [];
  const preservados = Object.fromEntries(informados.map((c) => [c, iniciais[c]]));

  valores.value = { ...iniciais, ...rascunho.valores, ...preservados };
  linhasPorCampo.value = { ...linhasDoRegistro, ...rascunho.linhas };
  recuperado.value = true;

  // Recuperar o preenchimento e devolver a pessoa ao primeiro passo faria ela procurar onde
  // parou -- que e o que o rascunho existe para evitar.
  irPara(Number(rascunho.passo ?? 0));
}

partir(props.registro);

watch(() => props.registro, partir);

watch(
  [valores, linhasPorCampo],
  ([atuais, linhasAtuais]) => {
    if (salvar.isPending.value) return;
    if (JSON.stringify([atuais, linhasAtuais]) === assinatura) return;

    agendarRascunho(chave.value, {
      valores: atuais,
      linhas: linhasAtuais,
      passo: passo.value,
      em: Date.now(),
    });
  },
  { deep: true },
);

const alterado = computed(
  () => JSON.stringify([valores.value, linhasPorCampo.value]) !== assinatura,
);

function descartar(): void {
  descartarRascunho(chave.value);
  partir(props.registro);
}

function tentarFechar(): void {
  if (!alterado.value) {
    descartarRascunho(chave.value);
    emit("fechar");
    return;
  }

  confirmandoDescarte.value = true;
}

function desistir(): void {
  confirmandoDescarte.value = false;
  descartarRascunho(chave.value);
  emit("fechar");
}

function guardarEFechar(): void {
  confirmandoDescarte.value = false;
  descarregarRascunhos();
  emit("fechar");
}

/** Campo recusado num passo que não está à vista seria erro invisível. */
function saltarParaOErro(campo: string | undefined): void {
  if (!porPassos.value || !campo) return;
  const destino = passoDoCampo(passos.value, props.formulario, campo);
  if (destino >= 0) irPara(destino);
}

const salvar = useMutation({
  mutationFn: async (corpo: Corpo) => {
    if (props.porConsulta) return (await postarComConsulta(props.endpoint, corpo, props.metodo)) ?? {};
    if (criando.value) {
      return props.metodoDeCriacao === "PUT"
        ? substituir(props.endpoint, corpo)
        : criar(props.endpoint, corpo);
    }
    return atualizar(props.endpoint, Number(props.registro!.id), corpo);
  },
  onSuccess: (salvo) => {
    descartarRascunho(chave.value);
    void clienteDeConsulta.invalidateQueries({ queryKey: ["lista"] });
    avisos.sucesso(
      props.mensagemDeSucesso ?? (criando.value ? "Registro criado." : "Alterações salvas."),
    );
    emit("salvo", salvo);
    emit("fechar");
  },
  onError: (erro: unknown) => {
    if (erro instanceof ErroDaApi) {
      errosDeCampo.value = erro.erros;
      falha.value = erro.message;
      saltarParaOErro(Object.keys(erro.erros)[0]);
      return;
    }
    falha.value = erro instanceof Error ? erro.message : String(erro);
  },
});

function enviar(): void {
  const erros = {
    ...validarFormulario(props.formulario, valores.value),
    ...(props.validacaoExtra?.(valores.value) ?? {}),
  };
  const errosNasLinhas = validarLinhas(props.linhas ?? [], linhasPorCampo.value);

  if (Object.keys(erros).length > 0 || Object.keys(errosNasLinhas).length > 0) {
    errosDeCampo.value = erros;
    errosDeLinha.value = errosNasLinhas;
    falha.value = Object.values(erros).every((e) => e === "Obrigatório.")
      ? "Preencha os campos obrigatórios."
      : "Confira os campos destacados.";
    saltarParaOErro(Object.keys(erros)[0]);
    return;
  }

  errosDeCampo.value = {};
  errosDeLinha.value = {};
  falha.value = null;

  const corpo = {
    ...corpoDoFormulario(props.formulario, valores.value, criando.value),
    ...corpoDasLinhas(props.linhas ?? [], linhasPorCampo.value),
  };

  salvar.mutate(props.antesDeEnviar ? props.antesDeEnviar(corpo, valores.value) : corpo);
}
</script>

<template>
  <GsModal
    :titulo="titulo"
    :subtitulo="subtitulo"
    :largura="largura ?? 'larga'"
    @fechar="tentarFechar"
  >
    <form class="flex flex-col gap-5" @submit.prevent="enviar">
      <div
        v-if="falha"
        class="flex items-start gap-2.5 rounded-card border border-danger bg-danger-bg px-4 py-3"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-danger" />
        <p class="text-body text-danger">{{ falha }}</p>
      </div>

      <div
        v-if="recuperado"
        class="flex items-start gap-2.5 rounded-card border border-line bg-app px-4 py-3"
      >
        <History class="mt-0.5 size-4 shrink-0 text-ink-mute" />
        <p class="flex-1 text-body text-ink-soft">
          Recuperamos o que você estava preenchendo aqui.
        </p>
        <button
          type="button"
          class="shrink-0 cursor-pointer text-body font-medium text-primary hover:underline"
          @click="descartar"
        >
          Começar do zero
        </button>
      </div>

      <GsPassos
        v-if="porPassos"
        :passos="passos"
        :atual="passo"
        :maior-visitado="maiorVisitado"
        :com-erro="comErro"
        @ir="irPara"
      />

      <GsFormulario
        v-model="valores"
        :formulario="formularioVisivel"
        :erros="errosDeCampo"
        :criando="criando"
        @anunciar="anuncio = $event"
      />

      <GsLinhas
        v-for="definicao in linhasVisiveis"
        :key="definicao.campo"
        v-model="linhasPorCampo[definicao.campo]"
        :definicao="definicao"
        :erro="errosDeLinha[definicao.campo]"
      />

      <button type="submit" class="hidden" />
    </form>

    <template #rodape>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
        <GsButton
          v-if="porPassos && passo > 0"
          variant="secondary"
          :disabled="salvar.isPending.value"
          class="w-full sm:w-auto"
          @click="irPara(passo - 1)"
        >
          <ArrowLeft class="size-4" />
          Voltar
        </GsButton>
        <GsButton
          v-else
          variant="secondary"
          :disabled="salvar.isPending.value"
          class="w-full sm:w-auto"
          @click="tentarFechar"
        >
          Cancelar
        </GsButton>

        <GsButton
          v-if="!noUltimo"
          variant="primary"
          class="w-full sm:w-auto"
          @click="avancar"
        >
          Próximo
          <ArrowRight class="size-4" />
        </GsButton>
        <GsButton
          v-else
          variant="primary"
          :disabled="salvar.isPending.value"
          class="w-full sm:w-auto"
          @click="enviar"
        >
          <Loader2 v-if="salvar.isPending.value" class="size-4 animate-spin" />
          <Check v-else class="size-4" />
          {{
            salvar.isPending.value
              ? "Salvando..."
              : (rotuloDeEnvio ?? (criando ? "Criar" : "Salvar"))
          }}
        </GsButton>
      </div>
    </template>
  </GsModal>

  <GsModal
    v-if="confirmandoDescarte"
    titulo="Você preencheu coisas aqui"
    largura="larga_media"
    centralizado
    @fechar="confirmandoDescarte = false"
  >
    <p class="text-body text-ink-soft">
      Guardar deixa este preenchimento esperando por você na próxima vez que abrir esta tela.
      Descartar apaga.
    </p>

    <template #rodape>
      <div class="flex w-full flex-row gap-2 sm:justify-end sm:gap-2">
        <GsButton
          variant="secondary"
          class="flex w-full flex-row"
          @click="confirmandoDescarte = false"
        >
          <RotateCcw class="size-4" />
          Continuar preenchendo
        </GsButton>
        <GsButton 
        variant="secondary" 
        class="flex w-full flex-row"
        @click="guardarEFechar">

          <Bookmark class="size-4" />
          Guardar para depois
        </GsButton>
        <GsButton 
        variant="danger" 
        class="flex w-full flex-row"
        @click="desistir">
          <Trash2 class="size-4" />
          Descartar
        </GsButton>
      </div>
    </template>
  </GsModal>

  <GsModal
    v-if="anuncio"
    :titulo="anuncio.titulo"
    largura="media"
    centralizado
    @fechar="anuncio = null"
  >
    <p class="text-body text-ink-soft">{{ anuncio.mensagem }}</p>

    <template #rodape>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
        <GsButton variant="secondary" class="w-full sm:w-auto" @click="desfazerAnuncio">
          <Undo2 class="size-4" />
          Desfazer
        </GsButton>
        <GsButton variant="primary" class="w-full sm:w-auto" @click="anuncio = null">
          <Check class="size-4" />
          Entendi
        </GsButton>
      </div>
    </template>
  </GsModal>
</template>
