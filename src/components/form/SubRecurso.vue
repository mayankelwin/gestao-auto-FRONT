<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Pencil, Plus, Trash2 } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsConfirmacao from "@/components/ui/GsConfirmacao.vue";
import GsMenuDeAcoes, { type ItemDeMenu } from "@/components/ui/GsMenuDeAcoes.vue";
import GsTable from "@/components/ui/GsTable.vue";
import FormularioDeRecurso from "./FormularioDeRecurso.vue";
import { listar, type Registro } from "@/api/lista";
import { excluir } from "@/api/recurso";
import { useSessao } from "@/auth/sessao";
import { useAvisos } from "@/lib/avisos";
import { booleano, dataCurta, dinheiro, numero } from "@/lib/formato";
import type { SubRecursoDefinicao } from "@/lib/subrecursos";
import type { ColunaRecurso } from "@/lib/recursos/tipos";
import type { Coluna } from "@/types";
import type { Valores } from "@/lib/formulario";

const props = defineProps<{ definicao: SubRecursoDefinicao; registro: Registro }>();

const sessao = useSessao();
const avisos = useAvisos();
const clienteDeConsulta = useQueryClient();

const emEdicao = ref<Registro | null>(null);
const formularioAberto = ref(false);
const paraExcluir = ref<Registro | null>(null);

const endpointDeLista = computed(() => props.definicao.lista(props.registro));
const consultaExtra = computed(() => props.definicao.consulta?.(props.registro) ?? {});

const chave = computed(() => [
  "sub",
  props.definicao.chave,
  endpointDeLista.value,
  JSON.stringify(consultaExtra.value),
]);

const consulta = useQuery({
  queryKey: chave,
  queryFn: () =>
    listar(endpointDeLista.value, { page: 0, size: 100, ...consultaExtra.value }),
});

const linhas = computed<Registro[]>(() => consulta.data.value?.content ?? []);

const podeEscrever = computed(() => sessao.temPapel(...props.definicao.papeis));

const colunas = computed<Coluna[]>(() => [
  ...props.definicao.colunas.map((c) => ({
    key: c.campo,
    label: c.label,
    align: c.formato === "dinheiro" || c.formato === "numero" ? ("right" as const) : ("left" as const),
  })),
  { key: "acoes", label: "" },
]);

const endpointDeGravacao = computed(() =>
  emEdicao.value && props.definicao.item
    ? props.definicao.item
    : (props.definicao.criacao?.(props.registro) ?? endpointDeLista.value),
);

const corpoExtra = computed(() => props.definicao.corpo?.(props.registro) ?? {});

function itens(): ItemDeMenu[] {
  const lista: ItemDeMenu[] = [];

  if (props.definicao.formulario && props.definicao.item) {
    lista.push({
      chave: "editar",
      rotulo: "Editar",
      icone: Pencil,
      desabilitado: !podeEscrever.value,
      motivo: "Seu papel não permite.",
    });
  }

  if (props.definicao.item) {
    lista.push({
      chave: "excluir",
      rotulo: "Excluir",
      icone: Trash2,
      perigo: true,
      desabilitado: !podeEscrever.value,
      motivo: "Seu papel não permite.",
    });
  }

  return lista;
}

function escolher(chaveDoItem: string, registro: Registro): void {
  if (chaveDoItem === "editar") {
    emEdicao.value = registro;
    formularioAberto.value = true;
    return;
  }
  if (chaveDoItem === "excluir") paraExcluir.value = registro;
}

const remocao = useMutation({
  mutationFn: (registro: Registro) =>
    excluir(props.definicao.item!, Number(registro.id ?? registro[props.definicao.chaveDoId ?? "id"])),
  onSuccess: () => {
    void clienteDeConsulta.invalidateQueries({ queryKey: chave.value });
    avisos.sucesso("Registro excluído.");
    paraExcluir.value = null;
  },
  onError: (e: unknown) => {
    avisos.falha(e instanceof Error ? e.message : String(e));
    paraExcluir.value = null;
  },
});

/**
 * Compara pelo texto normalizado: "5102" e " 5102 " sao o mesmo CFOP, e recusar um e aceitar o
 * outro deixaria passar a duplicata que a regra existe para barrar.
 */
function assinaturaDe(valores: Valores | Registro, campos: string[]): string {
  return campos.map((campo) => String(valores[campo] ?? "").trim().toLowerCase()).join("|");
}

function idDe(registro: Registro): unknown {
  return registro.id ?? registro[props.definicao.chaveDoId ?? "id"];
}

function recusarDuplicata(valores: Valores): Record<string, string> | null {
  const regra = props.definicao.duplicado;
  if (!regra) return null;

  // Editar sem mexer na combinacao nao pode colidir com a propria linha.
  const editandoId = emEdicao.value ? idDe(emEdicao.value) : null;
  const alvo = assinaturaDe(valores, regra.campos);

  const repetida = linhas.value.some(
    (linha) => idDe(linha) !== editandoId && assinaturaDe(linha, regra.campos) === alvo,
  );

  return repetida ? { [regra.campos[0]]: regra.mensagem } : null;
}

function aoSalvar(): void {
  void clienteDeConsulta.invalidateQueries({ queryKey: chave.value });
}

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
    case "booleano":
      return booleano(valor);
    default:
      return String(valor);
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-4">
      <p class="text-small text-ink-soft">{{ definicao.descricao }}</p>
      <GsButton
        v-if="definicao.formulario && podeEscrever"
        variant="secondary"
        @click="
          emEdicao = null;
          formularioAberto = true;
        "
      >
        <Plus class="size-4" />
        {{ definicao.rotuloNovo }}
      </GsButton>
    </div>

    <div class="overflow-hidden rounded-card border border-line">
      <GsTable
        :colunas="colunas"
        :linhas="linhas"
        :carregando="consulta.isPending.value"
        :erro="consulta.isError.value ? String(consulta.error.value?.message) : undefined"
        :esqueletos="3"
        :vazio-texto="definicao.vazio"
      >
        <template #linha="{ item }">
          <td
            v-for="coluna in definicao.colunas"
            :key="coluna.campo"
            class="px-4 py-2.5"
            :class="
              coluna.formato === 'dinheiro' || coluna.formato === 'numero'
                ? 'text-right tabular-nums text-ink'
                : 'text-ink'
            "
          >
            {{ formatar(item, coluna) }}
          </td>
          <td class="px-3 py-1.5">
            <GsMenuDeAcoes :itens="itens()" @escolher="escolher($event, item)" />
          </td>
        </template>
      </GsTable>
    </div>

    <FormularioDeRecurso
      v-if="formularioAberto && definicao.formulario"
      :titulo="emEdicao ? `Editar ${definicao.singular}` : definicao.rotuloNovo"
      :endpoint="endpointDeGravacao"
      :formulario="definicao.formulario"
      :registro="emEdicao"
      :metodo-de-criacao="definicao.metodo"
      largura="larga"
      :antes-de-enviar="(corpo) => ({ ...corpo, ...corpoExtra })"
      :validacao-extra="recusarDuplicata"
      @fechar="formularioAberto = false"
      @salvo="aoSalvar"
    />

    <GsConfirmacao
      v-if="paraExcluir"
      titulo="Excluir registro"
      :mensagem="`Excluir este ${definicao.singular}?`"
      rotulo-confirmar="Excluir"
      perigo
      :ocupado="remocao.isPending.value"
      @confirmar="remocao.mutate(paraExcluir)"
      @fechar="paraExcluir = null"
    />
  </div>
</template>
