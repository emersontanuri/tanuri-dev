type Theme = 'light' | 'dark'

/**
 * Must stay in step with the pre-paint script in `nuxt.config.ts`, which reads
 * the same key. That script cannot import this module: it has to run before any
 * of it exists.
 */
const STORAGE_KEY = 'theme'

/**
 * Light is the opt-out, so this class is the only thing that has to be toggled:
 * no class means dark, which is the theme the document ships with.
 */
const LIGHT_CLASS = 'light'

/**
 * Module-level, so every consumer shares one value.
 *
 * Deliberately not `useState`: the server cannot know the visitor's theme, so
 * putting it in the hydration payload would force the default back over the
 * theme the pre-paint script already applied.
 */
const theme = ref<Theme>('dark')

function applyTheme(next: Theme) {
  theme.value = next
  document.documentElement.classList.toggle(LIGHT_CLASS, next === 'light')
}

export function useTheme() {
  /**
   * Reads the theme the pre-paint script settled on. Called on mount rather
   * than during render, so the first client render matches the server markup
   * and hydration stays free of mismatches; the value is only knowable in the
   * browser.
   */
  function syncWithDocument() {
    theme.value = document.documentElement.classList.contains(LIGHT_CLASS)
      ? 'light'
      : 'dark'
  }

  function setTheme(next: Theme) {
    applyTheme(next)

    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable. The choice then lasts for this page only,
      // which is better than refusing to switch.
    }
  }

  return {
    theme: readonly(theme),
    syncWithDocument,
    setTheme,
    toggleTheme: () => setTheme(theme.value === 'dark' ? 'light' : 'dark'),
  }
}
