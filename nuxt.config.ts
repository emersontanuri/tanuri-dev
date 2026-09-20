import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-19',
  devtools: { enabled: false },

  modules: ['@nuxt/content'],

  // Node 26 ships node:sqlite, so the native connector avoids a native
  // better-sqlite3 build. Requires Node >= 22.5.0.
  content: {
    experimental: {
      sqliteConnector: 'native',
    },
  },

  css: ['~/assets/css/main.css'],

  // Tailwind 4 is wired in as a Vite plugin, not through @nuxtjs/tailwindcss.
  // See docs/adr for why.
  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR', class: 'dark' },
      title: 'Emerson Tanuri',
    },
  },
})
