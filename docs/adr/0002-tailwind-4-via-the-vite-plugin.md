# Tailwind 4 through the Vite plugin, not the Nuxt Tailwind module

Tailwind 4 is integrated by registering `@tailwindcss/vite` as a Vite plugin, rather than by installing `@nuxtjs/tailwindcss`.

This deliberately deviates from the obvious path. The Nuxt Tailwind module is the first thing a Nuxt developer reaches for, but its stable release still targets Tailwind 3, and its Tailwind 4 support is published only as a beta. The Vite plugin is what Tailwind's own Nuxt guide documents. The consequence to remember: this is why there is no `tailwind.config.js` in the repository, and why any styling question is answered in the global stylesheet instead.
