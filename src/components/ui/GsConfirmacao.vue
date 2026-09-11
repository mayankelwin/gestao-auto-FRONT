<script setup lang="ts">
import GsButton from "./GsButton.vue";
import GsModal from "./GsModal.vue";

withDefaults(
  defineProps<{
    titulo: string;
    mensagem: string;
    rotuloConfirmar?: string;
    perigo?: boolean;
    ocupado?: boolean;
  }>(),
  { rotuloConfirmar: "Confirmar" },
);

const emit = defineEmits<{ (e: "confirmar"): void; (e: "fechar"): void }>();
</script>

<template>
  <GsModal :titulo="titulo" largura="media" @fechar="emit('fechar')">
    <p class="text-body text-ink-soft">{{ mensagem }}</p>

    <template #rodape>
      <GsButton variant="secondary" :disabled="ocupado" @click="emit('fechar')">Cancelar</GsButton>
      <GsButton
        :variant="perigo ? 'danger' : 'primary'"
        :disabled="ocupado"
        @click="emit('confirmar')"
      >
        {{ ocupado ? "Aguarde..." : rotuloConfirmar }}
      </GsButton>
    </template>
  </GsModal>
</template>
