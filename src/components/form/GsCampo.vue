<script setup lang="ts">
import { computed, ref } from "vue";
import { buscarUm } from "@/api/recurso";
import GsButton from "@/components/ui/GsButton.vue";
import GsCheckbox from "@/components/ui/GsCheckbox.vue";
import type { Registro } from "@/api/lista";
import GsCombo from "@/components/ui/GsCombo.vue";
import GsComboMultiplo from "@/components/ui/GsComboMultiplo.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsSelect from "@/components/ui/GsSelect.vue";
import GsTextarea from "@/components/ui/GsTextarea.vue";
import { especieDe } from "@/lib/campos";
import { restricaoDe } from "@/lib/contrato";
import type { AnuncioDaEscolha, CampoDeFormulario, Valores } from "@/lib/formulario";

const emit = defineEmits<{ preencher: [Valores]; anunciar: [AnuncioDaEscolha] }>();

const props = defineProps<{
  campo: CampoDeFormulario;
  erro?: string;
  compacto?: boolean;
  contexto?: Valores;
}>();

const especie = computed(() => especieDe(props.campo.tipo));

const endpointDaReferencia = computed(() => {
  const referencia = props.campo.referencia;
  if (!referencia) return null;
  if (!referencia.endpointDe) return referencia.endpoint;
  return referencia.endpointDe(props.contexto ?? {});
});

const model = defineModel<unknown>();

const rotulo = computed(() => {
  if (props.compacto) return undefined;
  return props.campo.obrigatorio ? `${props.campo.label} *` : props.campo.label;
});

const ajuda = computed(() => (props.compacto ? undefined : (props.erro ?? props.campo.ajuda)));

const placeholder = computed(() => {
  const bruto = props.campo.placeholder;
  return typeof bruto === "function" ? bruto() : bruto;
});

const opcoes = computed(() => props.campo.opcoes ?? especie.value.opcoes ?? []);

const contrato = computed(() => restricaoDe(props.campo.campo));

const minimo = computed(() => props.campo.min ?? especie.value.min ?? contrato.value?.min);
const maximo = computed(() => props.campo.max ?? especie.value.max ?? contrato.value?.max);
const passo = computed(() => props.campo.passo ?? especie.value.passo);

const texto = computed({
  get: () => {
    if (model.value === undefined || model.value === null) return null;
    const { mascara } = especie.value;
    return mascara ? mascara(model.value) : (model.value as string | number);
  },
  set: (valor) => {
    const { aoDigitar } = especie.value;
    model.value = aoDigitar ? aoDigitar(valor) : valor;
  },
});

const marcado = computed({
  get: () => Boolean(model.value),
  set: (valor) => (model.value = valor),
});

const referencia = computed({
  get: () => {
    const valor = model.value;
    if (valor === null || valor === undefined || valor === "") return null;
    return props.campo.referencia?.chave ? String(valor) : Number(valor);
  },
  set: (valor) => (model.value = valor),
});

const referencias = computed({
  get: () => (Array.isArray(model.value) ? (model.value as number[]) : []),
  set: (valor) => (model.value = valor),
});

async function sugerirDaReferencia(registro: Registro): Promise<void> {
  const sugerir = props.campo.referencia?.aoEscolher;
  if (!sugerir) return;

  const sugestao = await sugerir(registro, props.contexto ?? {});
  if (Object.keys(sugestao.valores).length > 0) emit("preencher", sugestao.valores);
  if (sugestao.anuncio) emit("anunciar", sugestao.anuncio);
}

const consultando = ref(false);
const recado = ref<string | null>(null);
const falhou = ref(false);

const chaveDaConsulta = computed(() => {
  const consulta = props.campo.consulta;
  if (!consulta) return null;
  return consulta.chave(String(model.value ?? ""));
});

/**
 * Se a consulta faz sentido para o que está preenchido. Pessoa física não tem CNPJ a consultar,
 * e um botão desabilitado que nunca vai habilitar só ocupa espaço.
 */
const consultaAplicavel = computed(() => {
  const consulta = props.campo.consulta;
  if (!consulta) return false;
  return !consulta.disponivel || consulta.disponivel(props.contexto ?? {});
});

const rotuloDaConsulta = computed(() => props.campo.consulta?.rotulo ?? "");

const podeConsultar = computed(
  () => consultaAplicavel.value && !consultando.value && Boolean(chaveDaConsulta.value),
);

const ajudaDaConsulta = computed(() => recado.value ?? ajuda.value);

async function consultar() {
  const consulta = props.campo.consulta;
  const chave = chaveDaConsulta.value;
  if (!consulta || !chave) return;

  consultando.value = true;
  recado.value = null;
  falhou.value = false;

  try {
    const resposta = consulta.buscar
      ? await consulta.buscar(chave)
      : await buscarUm(consulta.endpoint, chave, consulta.parametro);
    emit("preencher", consulta.mapear(resposta));
    recado.value = consulta.aviso ? consulta.aviso(resposta) : null;
  } catch (erro) {
    recado.value = erro instanceof Error ? erro.message : "A consulta não respondeu.";
    falhou.value = true;
  } finally {
    consultando.value = false;
  }
}
</script>

<template>
  <GsCheckbox
    v-if="especie.controle === 'booleano'"
    v-model="marcado"
    :label="compacto ? '' : campo.label"
    :hint="ajuda"
  />

  <GsTextarea
    v-else-if="especie.controle === 'textoLongo'"
    v-model="texto as string | null"
    :label="rotulo"
    :placeholder="placeholder"
    :hint="ajuda"
    :invalid="Boolean(erro)"
  />

  <GsSelect
    v-else-if="especie.controle === 'opcoes'"
    v-model="texto"
    :label="rotulo"
    :placeholder="placeholder ?? 'Selecione...'"
    :options="opcoes"
    :hint="ajuda"
    :invalid="Boolean(erro)"
    :limpavel="!campo.obrigatorio"
  />

  <GsCombo
    v-else-if="especie.controle === 'referencia' && campo.referencia"
    v-model="referencia"
    :label="rotulo"
    :endpoint="endpointDaReferencia ?? campo.referencia.endpoint"
    :disabled="endpointDaReferencia === null"
    :rotulo="campo.referencia.rotulo"
    :busca="campo.referencia.busca"
    :parametros="campo.referencia.parametros"
    :chave="campo.referencia.chave"
    :parametro-da-chave="campo.referencia.parametroDaChave"
    :previa="campo.referencia.previa"
    :linha="campo.referencia.linha"
    :grupo="campo.referencia.grupo"
    @escolhido="sugerirDaReferencia"
    :exige-empresa="campo.referencia.exigeEmpresa"
    :filtro="campo.referencia.filtro"
    :placeholder="placeholder"
    :hint="ajuda"
    :invalid="Boolean(erro)"
    :limpavel="!campo.obrigatorio"
    criavel
  />

  <GsComboMultiplo
    v-else-if="especie.controle === 'referencias' && campo.referencia"
    v-model="referencias"
    :label="rotulo"
    :endpoint="endpointDaReferencia ?? campo.referencia.endpoint"
    :disabled="endpointDaReferencia === null"
    :rotulo="campo.referencia.rotulo"
    :exige-empresa="campo.referencia.exigeEmpresa"
    :parametros="campo.referencia.parametros"
    :placeholder="placeholder"
    :hint="ajuda"
    :invalid="Boolean(erro)"
  />

  <div v-else-if="especie.controle === 'documento'" class="flex flex-col gap-1.5">
    <span v-if="rotulo" class="text-small font-medium text-ink-soft">{{ rotulo }}</span>

    <div class="flex items-center gap-2">
      <div class="grow">
        <GsInput
          v-model="texto"
          :type="especie.tipoDoInput"
          :placeholder="placeholder"
          :invalid="Boolean(erro) || falhou"
          :maxlength="especie.maxlength"
          :inputmode="campo.inputmode ?? especie.inputmode"
          :autocomplete="especie.autocomplete"
        />
      </div>
      <GsButton
        v-if="consultaAplicavel"
        variant="secondary"
        class="shrink-0"
        :disabled="!podeConsultar"
        @click="consultar"
      >
        {{ consultando ? "Consultando..." : rotuloDaConsulta }}
      </GsButton>
    </div>

    <span
      v-if="ajudaDaConsulta"
      class="text-small"
      :class="Boolean(erro) || falhou ? 'text-danger' : 'text-ink-mute'"
    >
      {{ ajudaDaConsulta }}
    </span>
  </div>

  <GsInput
    v-else
    v-model="texto"
    :label="rotulo"
    :type="especie.tipoDoInput"
    :placeholder="placeholder"
    :hint="ajuda"
    :invalid="Boolean(erro)"
    :disabled="campo.geradoPeloSistema"
    :min="minimo"
    :max="maximo"
    :step="passo"
    :maxlength="especie.maxlength"
    :inputmode="campo.inputmode ?? especie.inputmode"
    :autocomplete="especie.autocomplete"
  />
</template>
