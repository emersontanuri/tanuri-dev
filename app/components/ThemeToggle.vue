<script setup lang="ts">
/**
 * Switches between the light and the dark theme, and remembers the choice.
 *
 * The icons are chosen by CSS off the document's theme class, so the right one
 * shows immediately, in the static HTML and before hydration. Only the
 * accessible state comes from the composable, and it is settled on mount.
 *
 * `aria-checked` therefore ships carrying the default theme's value and is
 * corrected during hydration. That is deliberate: reading the document during
 * setup instead would make the client's first render disagree with the server
 * markup. The switch cannot be reached by keyboard before hydration finishes,
 * so the stale value is never announced to anyone who could act on it.
 */
const { theme, syncWithDocument, toggleTheme } = useTheme()

onMounted(syncWithDocument)
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="theme === 'dark'"
    aria-label="Tema escuro"
    class="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-line text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    @click="toggleTheme"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      class="h-4 w-4 dark:hidden"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
      />
    </svg>

    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="hidden h-4 w-4 dark:block"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>
