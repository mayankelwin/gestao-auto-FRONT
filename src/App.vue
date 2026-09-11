<script setup lang="ts">
import { RouterView } from "vue-router";
import EscolherTenantPage from "@/pages/EscolherTenantPage.vue";
import CriacaoRapida from "@/components/form/CriacaoRapida.vue";
import AvisoDeSessao from "@/components/layout/AvisoDeSessao.vue";
import GsAvisos from "@/components/ui/GsAvisos.vue";
import GsDialogoDeMensagem from "@/components/ui/GsDialogoDeMensagem.vue";
import { useTenant } from "@/auth/tenant";

const tenant = useTenant();
</script>

<template>
  <EscolherTenantPage v-if="tenant.precisaEscolher" />
  <RouterView v-else />
  <CriacaoRapida />
  <AvisoDeSessao />
  <GsAvisos />
  <GsDialogoDeMensagem />
</template>
