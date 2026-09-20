<script setup lang="ts">
import type { Fluxo } from '../../shared/fluxos'

/**
 * Um Fluxo, drawn as a diagram: a titled figure whose steps are an ordered
 * list, a box each, joined by an arrow.
 *
 * The chain is a single column at every width. A flow is a sequence, and a
 * column can neither reorder it nor overflow it, so the order a screen reader
 * follows is the order the eye follows, however narrow the viewport. That is
 * what the monospace block this replaces could not promise: it scrolled
 * sideways on a phone and read as a column of arrow glyphs.
 *
 * Every step is text, so the diagram is read aloud in full and nothing is lost
 * when the stylesheet does not arrive. The arrows are the one thing here that
 * is not content - "downwards arrow", said between every pair of steps, is
 * noise - so they are hidden from assistive technology. The steps carry no
 * visible numbering for the same reason: the list is already ordered, and a
 * number on every box would repeat, out loud, what the order already says.
 *
 * The steps and the title arrive from content. Nothing about a flow is decided
 * here.
 */
defineProps<{ fluxos: readonly Fluxo[] }>()
</script>

<template>
  <div class="mt-6 space-y-10">
    <figure v-for="(fluxo, indice) in fluxos" :key="indice">
      <figcaption
        class="font-mono text-2xs uppercase tracking-[0.2em] text-ink-muted"
      >
        {{ fluxo.titulo }}
      </figcaption>

      <ol class="mt-4">
        <li v-for="(etapa, posicao) in fluxo.etapas" :key="posicao">
          <span
            v-if="posicao > 0"
            aria-hidden="true"
            class="flex justify-center py-2 text-accent"
          >
            ↓
          </span>

          <div
            class="rounded-sm border border-line bg-surface px-4 py-3 text-sm font-medium text-ink wrap-break-word"
          >
            {{ etapa }}
          </div>
        </li>
      </ol>
    </figure>
  </div>
</template>
