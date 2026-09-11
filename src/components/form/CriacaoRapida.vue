<script setup lang="ts">
import FormularioDeRecurso from "./FormularioDeRecurso.vue";
import { concluirCriacao, inicioDoFormulario, pedidosDeCriacao } from "@/lib/criacaoRapida";
</script>

<template>
  <FormularioDeRecurso
    v-for="pedido in pedidosDeCriacao"
    :key="pedido.id"
    :titulo="pedido.recurso.rotuloNovo ?? 'Novo registro'"
    subtitulo="Ao salvar, volta para o formulário anterior com este registro escolhido."
    :endpoint="pedido.recurso.endpoint"
    :formulario="pedido.recurso.formulario ?? []"
    :linhas="pedido.recurso.linhas"
    :largura="pedido.recurso.larguraDoFormulario"
    :registro="inicioDoFormulario(pedido.recurso, pedido.texto)"
    @salvo="(registro) => concluirCriacao(pedido.id, registro)"
    @fechar="concluirCriacao(pedido.id, null)"
  />
</template>
