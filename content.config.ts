import { defineCollection, defineContentConfig, z } from '@nuxt/content'

/**
 * One step of the Cadeia de pensamento: a question and the discipline that
 * answers it. The chain is the site's central argument, so it is authored
 * content rather than copy hardcoded in a component.
 */
export const passoDaCadeia = z.object({
  pergunta: z.string(),
  disciplina: z.string(),
  explicacao: z.string(),
})

export type PassoDaCadeia = {
  pergunta: string
  disciplina: string
  explicacao: string
}

export default defineContentConfig({
  collections: {
    paginas: defineCollection({
      type: 'page',
      source: 'paginas/**/*.md',
      schema: z.object({
        tagline: z.string(),
        disciplines: z.array(z.string()),
        // Optional because this collection is every standalone page, and only
        // the home page carries a chain. A malformed step still fails the
        // build, and the home page's own chain is asserted by the tests.
        cadeia: z.array(passoDaCadeia).optional(),
      }),
    }),
  },
})
