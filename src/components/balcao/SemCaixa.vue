<script setup lang="ts">
import { useRouter } from "vue-router";
import { Store } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsModal from "@/components/ui/GsModal.vue";

const emit = defineEmits<{ (e: "fechar"): void }>();

const router = useRouter();

function irParaCaixas(): void {
  emit("fechar");
  void router.push({ path: "/caixas", query: { novo: "1" } });
}
</script>

<template>
  <GsModal
    titulo="Nenhum caixa cadastrado"
    subtitulo="Balcão / Caixas"
    largura="media"
    centralizado
    @fechar="emit('fechar')"
  >
    <div class="flex flex-col gap-3">
      <p class="text-body text-ink-soft">
        Toda venda do balcão é registrada em um caixa: é ele que define a lista de preços, o
        depósito de saída e os meios de pagamento aceitos. Sem nenhum caixa nesta empresa, não há
        onde registrar a venda.
      </p>
      <p class="text-body text-ink-soft font-bold">
        Cadastre o primeiro caixa no Menu Lateral > Balcão > Caixas e volte para vender.
      </p>
    </div>

    <template #rodape>
      <GsButton variant="secondary" @click="emit('fechar')">Agora não</GsButton>
      <GsButton @click="irParaCaixas">
        <Store class="size-4" />
        Criar um novo caixa
      </GsButton>
    </template>
  </GsModal>
</template>
