<script setup lang="ts">
import type { Projeto } from '../../shared/projetos'

/**
 * One Projeto on the index. The whole card is the link, so there is a single
 * target to reach and a single focus stop to tab through.
 */
defineProps<{ projeto: Projeto & { path: string } }>()
</script>

<template>
  <NuxtLink
    :to="projeto.path"
    class="group flex flex-col gap-4 py-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
  >
    <ProjectTypeBadge :tipo="projeto.tipo" />

    <h2
      class="text-xl font-medium tracking-tight text-ink text-balance transition-colors group-hover:text-accent"
    >
      {{ projeto.title }}
    </h2>

    <p class="max-w-prose text-sm text-ink-muted text-pretty">
      {{ projeto.resumo }}
    </p>
  </NuxtLink>
</template>
