<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Plus } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsCombo from "@/components/ui/GsCombo.vue";
import GsComboMultiplo from "@/components/ui/GsComboMultiplo.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsTable from "@/components/ui/GsTable.vue";
import { listar, type Registro } from "@/api/lista";
import { criar, substituir } from "@/api/recurso";
import { useSessao } from "@/auth/sessao";
import { useAvisos } from "@/lib/avisos";
import type { Coluna } from "@/types";

const props = defineProps<{ registro: Registro }>();

const sessao = useSessao();
const avisos = useAvisos();
const clienteDeConsulta = useQueryClient();

const modeloId = computed(() => Number(props.registro.id));
const ehModelo = computed(() => Boolean(props.registro.template));

const podeEscrever = computed(() => sessao.temPapel("COMERCIAL"));

const eixos = useQuery({
  queryKey: computed(() => ["variantes-eixos", modeloId.value]),
  enabled: ehModelo,
  queryFn: () => listar(`/item-variants/templates/${modeloId.value}/attributes`, { page: 0, size: 50 }),
});

const atributosDaVariante = useQuery({
  queryKey: computed(() => ["atributos-da-variante", modeloId.value]),
  enabled: computed(() => !ehModelo.value),
  queryFn: () =>
    listar(`/item-variants/items/${modeloId.value}/attributes`, { page: 0, size: 50 }),
});

const variantes = useQuery({
  queryKey: computed(() => ["variantes", modeloId.value]),
  enabled: ehModelo,
  queryFn: () => listar(`/item-variants/templates/${modeloId.value}/variants`, { page: 0, size: 100 }),
});

const listaDeEixos = computed<Registro[]>(() => eixos.data.value?.content ?? []);
const listaDeVariantes = computed<Registro[]>(() => variantes.data.value?.content ?? []);

const declarando = ref(false);
const eixosEscolhidos = ref<number[]>([]);

watch(listaDeEixos, (lista) => {
  eixosEscolhidos.value = lista.map((e) => Number(e.id)).filter(Number.isFinite);
});

const criando = ref(false);
const nome = ref("");
const gtin = ref("");
const valorPorEixo = ref<Record<number, number | null>>({});

const colunas: Coluna[] = [
  { key: "code", label: "Referência" },
  { key: "name", label: "Nome" },
  { key: "attributes", label: "Combinação" },
];

function combinacao(variante: Registro): string {
  const valores = variante.attributeValues ?? variante.attributes;
  if (!Array.isArray(valores)) return "—";
  return (
    valores
      .map((v) => {
        const linha = v as Registro;
        return String(linha.value ?? linha.abbreviation ?? "");
      })
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

const declarar = useMutation({
  mutationFn: () =>
    substituir(`/item-variants/templates/${modeloId.value}/attributes`, {
      attributeIds: eixosEscolhidos.value,
    }),
  onSuccess: () => {
    void clienteDeConsulta.invalidateQueries({ queryKey: ["variantes-eixos", modeloId.value] });
    avisos.sucesso("Eixos do modelo declarados.");
    declarando.value = false;
  },
  onError: (e: unknown) => avisos.falha(e instanceof Error ? e.message : String(e)),
});

const criarVariante = useMutation({
  mutationFn: () => {
    const escolhidos = listaDeEixos.value
      .map((eixo) => valorPorEixo.value[Number(eixo.id)])
      .filter((v): v is number => typeof v === "number");

    return criar(`/item-variants/templates/${modeloId.value}/variants`, {
      name: nome.value || undefined,
      gtin: gtin.value || undefined,
      attributeValueIds: escolhidos,
    });
  },
  onSuccess: () => {
    void clienteDeConsulta.invalidateQueries({ queryKey: ["variantes", modeloId.value] });
    void clienteDeConsulta.invalidateQueries({ queryKey: ["lista"] });
    avisos.sucesso("Similar criado.");
    criando.value = false;
    nome.value = "";
    gtin.value = "";
    valorPorEixo.value = {};
  },
  onError: (e: unknown) => avisos.falha(e instanceof Error ? e.message : String(e)),
});

const faltaEixo = computed(() =>
  listaDeEixos.value.some((eixo) => !valorPorEixo.value[Number(eixo.id)]),
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-if="!ehModelo">
      <p class="text-body text-ink-soft">
        Este item não é modelo de similares. Marque “É modelo de similares” na edição do item para
        declarar eixos e gerar similares a partir dele.
      </p>

      <div v-if="(atributosDaVariante.data.value?.content ?? []).length > 0" class="flex flex-col gap-2">
        <h4 class="text-overline text-ink-mute uppercase">O que define este similar</h4>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="atributo in atributosDaVariante.data.value?.content ?? []"
            :key="String(atributo.itemAttributeId ?? atributo.id)"
            class="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2"
          >
            <span class="text-body text-ink-soft">
              {{ atributo.itemAttributeName ?? atributo.attributeName ?? atributo.name }}
            </span>
            <span class="text-body font-medium text-ink">
              {{ atributo.value ?? atributo.abbreviation ?? "—" }}
            </span>
          </li>
        </ul>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-small text-ink-soft">
          Os eixos dizem o que distingue um similar do outro; o similar é uma combinação de um valor
          por eixo.
        </p>
        <div class="flex gap-2">
          <GsButton v-if="podeEscrever" variant="secondary" @click="declarando = true">
            Declarar eixos
          </GsButton>
          <GsButton
            v-if="podeEscrever"
            variant="primary"
            :disabled="listaDeEixos.length === 0"
            @click="criando = true"
          >
            <Plus class="size-4" />
            Novo similar
          </GsButton>
        </div>
      </div>

      <p v-if="listaDeEixos.length === 0" class="text-body text-warning">
        Nenhum eixo declarado — declare ao menos um antes de criar similares.
      </p>
      <div v-else class="flex flex-wrap gap-1.5">
        <span
          v-for="eixo in listaDeEixos"
          :key="String(eixo.id)"
          class="rounded-badge bg-neutral-bg px-2 py-0.5 text-chip font-medium text-neutral"
        >
          {{ eixo.name }}
        </span>
      </div>

      <div class="overflow-hidden rounded-card border border-line">
        <GsTable
          :colunas="colunas"
          :linhas="listaDeVariantes"
          :carregando="variantes.isPending.value"
          :erro="variantes.isError.value ? String(variantes.error.value?.message) : undefined"
          :esqueletos="3"
          vazio-texto="Nenhum similar criado."
        >
          <template #linha="{ item }">
            <td class="px-4 py-2.5 font-medium whitespace-nowrap text-ink">{{ item.code ?? "—" }}</td>
            <td class="px-4 py-2.5 text-ink">{{ item.name ?? "—" }}</td>
            <td class="px-4 py-2.5 text-ink-soft">{{ combinacao(item) }}</td>
          </template>
        </GsTable>
      </div>
    </template>

    <GsModal
      v-if="declarando"
      titulo="Declarar os eixos do modelo"
      largura="media"
      @fechar="declarando = false"
    >
      <GsComboMultiplo
        v-model="eixosEscolhidos"
        label="Eixos"
        endpoint="/item-variants/attributes"
        :rotulo="(r) => String(r.name)"
        placeholder="Escolha os eixos"
        hint="Substitui a declaração atual do modelo."
      />

      <template #rodape>
        <GsButton variant="secondary" @click="declarando = false">Cancelar</GsButton>
        <GsButton
          variant="primary"
          :disabled="declarar.isPending.value || eixosEscolhidos.length === 0"
          @click="declarar.mutate()"
        >
          {{ declarar.isPending.value ? "Salvando..." : "Declarar" }}
        </GsButton>
      </template>
    </GsModal>

    <GsModal v-if="criando" titulo="Novo similar" largura="larga" @fechar="criando = false">
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GsInput v-model="nome" label="Nome" />
          <GsInput v-model="gtin" label="Código de barras" />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GsCombo
            v-for="eixo in listaDeEixos"
            :key="String(eixo.id)"
            v-model="valorPorEixo[Number(eixo.id)]"
            :label="`${eixo.name} *`"
            :endpoint="`/item-variants/attributes/${Number(eixo.id)}/values`"
            :rotulo="(r) => String(r.value ?? r.abbreviation ?? r.id)"
            placeholder="Escolha o valor"
          />
        </div>
      </div>

      <template #rodape>
        <GsButton variant="secondary" @click="criando = false">Cancelar</GsButton>
        <GsButton
          variant="primary"
          :disabled="criarVariante.isPending.value || faltaEixo"
          @click="criarVariante.mutate()"
        >
          {{ criarVariante.isPending.value ? "Criando..." : "Criar similar" }}
        </GsButton>
      </template>
    </GsModal>
  </div>
</template>
