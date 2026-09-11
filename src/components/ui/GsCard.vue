<script setup lang="ts">
defineProps<{ title?: string; flush?: boolean; alto?: boolean }>();
</script>

<template>
  <section
    class="rounded-card border border-line bg-surface"
    :class="alto ? 'flex h-full flex-col' : ''"
  >
    <header
      v-if="title || $slots.action"
      class="flex items-center justify-between gap-4 px-6 pt-6 pb-4"
    >
      <h3 v-if="title" class="text-h3 text-ink">{{ title }}</h3>
      <div v-if="$slots.action" class="flex shrink-0 items-center gap-2">
        <slot name="action" />
      </div>
    </header>

    <div
      :class="[flush ? '' : 'px-6 pt-6 pb-6', alto ? 'flex min-h-0 flex-1 flex-col' : '']"
      :style="title && !flush ? 'padding-top:0' : ''"
    >
      <slot />
    </div>
  </section>
</template>
