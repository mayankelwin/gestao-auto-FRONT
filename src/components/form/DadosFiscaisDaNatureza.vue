<script setup lang="ts">
import { ref } from "vue";
import GsFormulario from "./GsFormulario.vue";
import type { Formulario, ReferenciaDeCampo, Valores } from "@/lib/formulario";
import type { Registro } from "@/api/lista";

defineProps<{ registro: Registro }>();

/**
 * Uma referencia no mesmo molde da do CFOP -- busca em cima, lista embaixo --, porem inerte.
 *
 * O `endpointDe` devolvendo null e o que a mantem assim: o GsCampo desabilita o combo e o
 * GsCombo nem chega a consultar. Apontar para um caminho que ainda nao existe traria a falha da
 * requisicao para dentro do campo, e um erro vermelho num campo que so esta esperando o backend
 * diria que algo quebrou, quando nada quebrou.
 *
 * Quando a lista existir, e trocar o `endpointDe` pelo caminho dela.
 */
function referenciaFiscal(endpoint: string): ReferenciaDeCampo {
  return {
    endpoint,
    endpointDe: () => null,
    busca: true,
    chave: "code",
    parametroDaChave: "code",
    rotulo: (r) => [r.code, r.title].filter(Boolean).join(" — "),
    linha: (r) => ({ prefixo: String(r.code ?? ""), titulo: String(r.title ?? "") }),
  };
}

/**
 * Os campos fiscais que acompanham as regras da natureza.
 *
 * Continuam vazios de proposito: quem publica as tabelas de origem, CSOSN e CST e o backend.
 */
const formulario: Formulario = [
  {
    campos: [
      {
        campo: "origin",
        label: "Origem",
        tipo: "referenciaTexto",
        referencia: referenciaFiscal("/tax-origins"),
        placeholder: "Selecione a origem",
      },
      {
        campo: "csosn",
        label: "CSOSN",
        tipo: "referenciaTexto",
        referencia: referenciaFiscal("/csosn"),
        placeholder: "Selecione o CSOSN",
      },
      {
        campo: "pisCst",
        label: "CST PIS",
        tipo: "referenciaTexto",
        referencia: referenciaFiscal("/cst-pis"),
        placeholder: "Selecione CST PIS",
      },
      {
        campo: "cofinsCst",
        label: "CST COFINS",
        tipo: "referenciaTexto",
        referencia: referenciaFiscal("/cst-cofins"),
        placeholder: "Selecione CST COFINS",
      },
      {
        campo: "ipiCst",
        label: "CST IPI",
        tipo: "referenciaTexto",
        referencia: referenciaFiscal("/cst-ipi"),
        placeholder: "Selecione CST IPI",
      },
      {
        campo: "ipiFrameworkCode",
        label: "Código Enquadramento IPI",
        tipo: "referenciaTexto",
        referencia: referenciaFiscal("/ipi-framework-codes"),
        placeholder: "Selecione o enquadramento",
      },
      {
        campo: "ipiRate",
        label: "Percentual IPI",
        tipo: "decimal",
        min: 0,
        max: 100,
      },
      {
        campo: "ipiUnitValue",
        label: "Valor Unitário do IPI",
        tipo: "decimal",
        min: 0,
      },
    ],
  },
];

const valores = ref<Valores>({});
</script>

<template>
  <section class="mt-5 flex flex-col gap-3 border-t border-line pt-5">
    <div class="flex flex-col gap-1">
      <h3 class="text-overline text-ink-mute uppercase">Dados fiscais</h3>
      <p class="text-small text-ink-soft">
        Origem, CSOSN e os CST que acompanham as regras desta natureza. As listas ainda vêm
        vazias — o backend é quem as publica.
      </p>
    </div>

    <GsFormulario v-model="valores" :formulario="formulario" />
  </section>
</template>
