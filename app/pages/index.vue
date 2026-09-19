<script setup lang="ts">
const { data: page } = await useAsyncData('home', () =>
  queryCollection('paginas').path('/paginas/home').first(),
)
</script>

<template>
  <main class="mx-auto max-w-6xl px-6 py-24 sm:py-32">
    <section aria-labelledby="hero-heading">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
        Emerson Tanuri
      </p>

      <h1
        id="hero-heading"
        class="mt-8 max-w-3xl text-3xl font-medium leading-[1.05] tracking-tight text-balance sm:text-4xl"
      >
        {{ page?.tagline }}
      </h1>

      <ul class="mt-12 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-ink-muted">
        <li v-for="discipline in page?.disciplines" :key="discipline">
          {{ discipline }}
        </li>
      </ul>
    </section>
  </main>
</template>
