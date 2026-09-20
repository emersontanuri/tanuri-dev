<script setup lang="ts">
const route = useRoute()

const { data } = await useAsyncData(`projeto:${route.path}`, () =>
  queryCollection('projetos').path(route.path).first(),
)

if (!data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Projeto não encontrado.',
  })
}

const projeto = data.value
</script>

<template>
  <main class="mx-auto max-w-6xl px-6 py-24 sm:py-32">
    <article class="max-w-prose">
      <NuxtLink
        to="/projetos"
        class="font-mono text-2xs uppercase tracking-[0.2em] text-ink-muted transition-colors hover:text-accent"
      >
        Projetos
      </NuxtLink>

      <div class="mt-10">
        <ProjectTypeBadge :tipo="projeto.tipo" />
      </div>

      <h1
        class="mt-6 text-2xl font-medium leading-tight tracking-tight text-ink text-balance"
      >
        {{ projeto.title }}
      </h1>

      <p class="mt-6 text-lg text-ink-muted text-pretty">
        {{ projeto.resumo }}
      </p>

      <p v-if="projeto.periodo" class="mt-4 font-mono text-2xs text-ink-muted">
        {{ projeto.periodo }}
      </p>

      <div class="prose mt-12">
        <ContentRenderer :value="projeto" />
      </div>

      <section v-if="projeto.metodos?.length" class="mt-12">
        <h2
          class="font-mono text-2xs uppercase tracking-[0.2em] text-ink-muted"
        >
          Métodos
        </h2>

        <ul class="mt-6 flex flex-wrap gap-2">
          <li
            v-for="metodo in projeto.metodos"
            :key="metodo"
            class="rounded-full border border-line px-2.5 py-1 font-mono text-2xs text-ink-muted"
          >
            {{ metodo }}
          </li>
        </ul>
      </section>

      <section v-if="projeto.stack?.length" class="mt-12">
        <h2
          class="font-mono text-2xs uppercase tracking-[0.2em] text-ink-muted"
        >
          Stack
        </h2>

        <ul class="mt-6 flex flex-wrap gap-2">
          <li
            v-for="item in projeto.stack"
            :key="item"
            class="rounded-full border border-line px-2.5 py-1 font-mono text-2xs text-ink-muted"
          >
            {{ item }}
          </li>
        </ul>
      </section>
    </article>
  </main>
</template>
