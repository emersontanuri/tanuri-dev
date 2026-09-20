<script setup lang="ts">
/**
 * Every Projeto, in the deliberate order.
 *
 * The order is applied here rather than in SQL because the content database
 * stores a number as text, where "10" sorts before "2". `ordem` is a number
 * again once it is read, so sorting on it stays right as the collection grows.
 */
const { data } = await useAsyncData('projetos', () =>
  queryCollection('projetos').all(),
)

if (!data.value) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Não foi possível ler os projetos.',
  })
}

// This page is the one place that sees the whole collection, so it is where the
// collection is checked against its schema. See app/utils/assertProjects.ts.
await assertProjects(data.value)

const projetos = [...data.value].sort((a, b) => a.ordem - b.ordem)
</script>

<template>
  <main class="mx-auto max-w-6xl px-6 py-24 sm:py-32">
    <h1 class="font-mono text-2xs uppercase tracking-[0.2em] text-ink-muted">
      Projetos
    </h1>

    <ol class="mt-10 border-t border-line">
      <li
        v-for="projeto in projetos"
        :key="projeto.path"
        class="border-b border-line"
      >
        <ProjectCard :projeto="projeto" />
      </li>
    </ol>
  </main>
</template>
