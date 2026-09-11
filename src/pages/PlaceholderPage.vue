<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Construction, TriangleAlert } from "lucide-vue-next";

const route = useRoute();
const title = computed(() => (route.meta.title as string | undefined) ?? "Em construção");
const pending = computed(() => route.meta.pending as string | undefined);
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div class="flex max-w-md flex-col items-center gap-3 text-center">
      <component
        :is="pending ? TriangleAlert : Construction"
        class="size-8"
        :class="pending ? 'text-warning' : 'text-ink-mute'"
      />
      <h2 class="text-h3 text-ink">{{ title }}</h2>
      <p v-if="pending" class="text-body text-ink-soft">{{ pending }}</p>
      <p v-else class="text-body text-ink-soft">
        Esta tela ainda não foi construída. A API já expõe o recurso.
      </p>
    </div>
  </div>
</template>
