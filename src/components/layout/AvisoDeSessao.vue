<script setup lang="ts">
import { Clock } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import { useTempoDeSessao } from "@/auth/tempoDeSessao";

const sessao = useTempoDeSessao();
</script>

<template>
  <div
    v-if="sessao.avisando"
    class="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-3 rounded-panel border border-line bg-surface p-4 shadow-2xl"
    role="status"
  >
    <div class="flex items-start gap-2.5">
      <Clock class="mt-0.5 size-4 shrink-0 text-warning" />
      <div class="flex flex-col gap-1">
        <p class="text-body font-medium text-ink">
          Sua sessão expira em {{ sessao.contagem }}
        </p>
        <p class="text-small text-ink-mute">
          O que você estiver preenchendo fica guardado e volta quando você entrar de novo.
        </p>
      </div>
    </div>

    <GsButton variant="primary" :disabled="sessao.renovando" @click="sessao.continuar">
      {{ sessao.renovando ? "Renovando..." : "Continuar conectado" }}
    </GsButton>
  </div>
</template>
