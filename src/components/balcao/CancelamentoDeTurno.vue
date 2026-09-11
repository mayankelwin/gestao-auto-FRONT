<script setup lang="ts">
import { ref } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { TriangleAlert } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsModal from "@/components/ui/GsModal.vue";
import { cancelarTurno } from "@/api/balcao";
import type { Registro } from "@/api/lista";

const props = defineProps<{ turno: Registro }>();
const emit = defineEmits<{ (e: "fechar"): void; (e: "cancelado"): void }>();

const motivo = ref("Aberto por engano");
const falha = ref<string | null>(null);

const cancelar = useMutation({
  mutationFn: () => cancelarTurno(Number(props.turno.id), motivo.value),
  onSuccess: () => emit("cancelado"),
  onError: (erro: unknown) => {
    falha.value = erro instanceof Error ? erro.message : String(erro);
  },
});
</script>

<template>
  <GsModal
    :titulo="`Cancelar o turno ${turno.number}`"
    subtitulo="Só serve para turno aberto por engano."
    @fechar="emit('fechar')"
  >
    <div class="flex flex-col gap-5">
      <div
        v-if="falha"
        class="flex items-start gap-2.5 rounded-card border border-danger bg-danger-bg px-4 py-3"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-danger" />
        <p class="text-body text-danger">{{ falha }}</p>
      </div>

      <p class="text-body text-ink-soft">
        Turno que já vendeu não se cancela: ele se fecha contando. Se houver venda, a API recusa e
        você fecha pelo botão de fechamento.
      </p>

      <GsInput v-model="motivo" label="Motivo" placeholder="Aberto por engano" />

      <div class="flex justify-end gap-2">
        <GsButton variant="secondary" @click="emit('fechar')">Voltar</GsButton>
        <GsButton
          variant="danger"
          :disabled="motivo.trim() === '' || cancelar.isPending.value"
          @click="cancelar.mutate()"
        >
          Cancelar o turno
        </GsButton>
      </div>
    </div>
  </GsModal>
</template>
