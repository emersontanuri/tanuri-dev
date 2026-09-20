<script setup lang="ts">
import type { PassoDaCadeia } from '../../shared/projetos'

/**
 * A Cadeia de pensamento: the five questions, each paired with the discipline
 * that answers it, rendered in order.
 *
 * The steps arrive from content. Nothing about them is decided here.
 *
 * The whole chain is rendered in the served HTML with no JavaScript involved,
 * so the site's central argument survives a failed script or a poor connection.
 * Each step is also focusable, because the ticket requires every step to be
 * reachable by the keyboard with a visible focus indicator.
 *
 * The layout is a single column at every width. A five-step reasoning chain
 * reads as a sequence down the page, and a column can never force the
 * horizontal scrolling the ticket rules out on mobile.
 */
defineProps<{
  passos: readonly PassoDaCadeia[]
}>()
</script>

<template>
  <section
    id="cadeia-de-pensamento"
    aria-labelledby="cadeia-de-pensamento-titulo"
    class="mt-24 sm:mt-32"
  >
    <h2
      id="cadeia-de-pensamento-titulo"
      class="font-mono text-2xs uppercase tracking-[0.2em] text-ink-muted"
    >
      Cadeia de pensamento
    </h2>

    <ol class="mt-10">
      <li
        v-for="(passo, indice) in passos"
        :key="passo.pergunta"
        tabindex="0"
        class="rounded-sm border-l-2 border-line pb-10 pl-6 transition-colors last:pb-0 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <p class="font-mono text-2xs text-ink-muted">
          {{ String(indice + 1).padStart(2, '0') }}
        </p>

        <p class="mt-3 text-lg font-medium tracking-tight text-ink text-pretty">
          {{ passo.pergunta }}
        </p>

        <span
          class="mt-3 inline-block rounded-full border border-line px-2.5 py-1 font-mono text-2xs text-accent"
        >
          {{ passo.disciplina }}
        </span>

        <p class="mt-3 max-w-prose text-sm text-ink-muted">
          {{ passo.explicacao }}
        </p>
      </li>
    </ol>
  </section>
</template>
