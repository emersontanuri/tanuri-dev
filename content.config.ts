import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    paginas: defineCollection({
      type: 'page',
      source: 'paginas/**/*.md',
      schema: z.object({
        tagline: z.string(),
        disciplines: z.array(z.string()),
      }),
    }),
  },
})
