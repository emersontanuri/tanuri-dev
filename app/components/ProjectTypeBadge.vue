<script setup lang="ts">
import type { TipoDeProjeto } from '../../shared/projetos'

/**
 * The Tipo de projeto, shown wherever a project is named.
 *
 * It is the distinction the site exists to make, so it is rendered as a label
 * rather than a tag among tags, and its text is the type itself.
 */
defineProps<{ tipo: TipoDeProjeto }>()
</script>

<template>
  <span
    class="inline-block rounded-full border border-line px-2.5 py-1 font-mono text-2xs text-accent"
  >
    {{ tipo }}
  </span>
</template>
