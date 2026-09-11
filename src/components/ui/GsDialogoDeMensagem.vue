<script setup lang="ts">
import { useRouter } from "vue-router";
import { ArrowRight, Check } from "lucide-vue-next";
import GsButton from "./GsButton.vue";
import GsModal from "./GsModal.vue";
import GsAlerta from "./GsAlerta.vue";
import { useAvisos } from "@/lib/avisos";

const avisos = useAvisos();
const router = useRouter();

function irParaCorrecao(): void {
  const destino = avisos.dialogo?.destino;
  if (!destino) return;

  avisos.fecharDialogo();
  void router.push({
    path: destino.rota,
    query: destino.campo ? { destacar: destino.campo } : undefined,
  });
}
</script>

<template>
  <GsModal
    v-if="avisos.dialogo"
    :titulo="avisos.dialogo.titulo"
    largura="media"
    centralizado
    @fechar="avisos.fecharDialogo()"
  >
    <GsAlerta
      :tom="avisos.dialogo.tom"
      :texto="avisos.dialogo.texto"
      :orientacao="avisos.dialogo.orientacao"
    />

    <template #rodape>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <GsButton variant="secondary" class="w-full sm:w-auto" @click="avisos.fecharDialogo()">
          <Check class="size-4" />
          Entendi
        </GsButton>

        <GsButton
          v-if="avisos.dialogo.destino"
          variant="primary"
          class="w-full sm:w-auto"
          @click="irParaCorrecao"
        >
          {{ avisos.dialogo.destino.rotulo }}
          <ArrowRight class="size-4" />
        </GsButton>
      </div>
    </template>
  </GsModal>
</template>
