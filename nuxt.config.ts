import tailwindcss from '@tailwindcss/vite'

/**
 * Settles the theme before the first paint, so a visitor who chose one never
 * sees the other flash past. It has to be a blocking inline script in the
 * head: a client plugin or an async script runs after the paint it exists to
 * prevent.
 *
 * The document ships with no theme class, which the stylesheet reads as dark,
 * so a visitor without JavaScript gets the designed default rather than an
 * unthemed page. This script is also the only writer of the class: Nuxt's
 * `htmlAttrs` is deliberately not used for it, because the head manager
 * re-applies those attributes during hydration and would undo the choice.
 */
const applyThemeBeforePaint = `
(() => {
  let theme = 'dark'

  try {
    const stored = localStorage.getItem('theme')

    if (stored === 'light' || stored === 'dark') {
      theme = stored
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light'
    }
  } catch {
    // Storage can be unavailable. The default theme still applies.
  }

  document.documentElement.classList.toggle('light', theme === 'light')
})()
`

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
      // No theme class here on purpose. See applyThemeBeforePaint above.
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Emerson Tanuri',
      script: [{ innerHTML: applyThemeBeforePaint }],
    },
  },
})
