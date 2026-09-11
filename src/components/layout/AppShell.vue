<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppSidebar from "./AppSidebar.vue";
import AppTopbar from "./AppTopbar.vue";

const route = useRoute();
const title = computed(() => (route.meta.title as string | undefined) ?? "");
const breadcrumb = computed(() => route.meta.breadcrumb as string | undefined);
</script>

<template>
  <div class="flex h-full">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar :title="title" :breadcrumb="breadcrumb" />
      <main class="flex-1 overflow-y-auto px-8 pb-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
