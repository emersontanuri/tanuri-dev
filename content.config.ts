import { defineCollection, defineContentConfig, z } from '@nuxt/content'
import { passoDaCadeia, projeto } from './shared/projetos.ts'

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

    // `page`, not `data`, so every project takes its route from its file path
    // and its body renders as authored markdown. A new file at
    // content/projetos/<slug>.md becomes /projetos/<slug> with no code change.
    //
    // The rules live in shared/projetos.ts, which is also what the check in
    // app/utils/assertProjects.ts and the tests use. See that file before
    // touching the zod dependency.
    projetos: defineCollection({
      type: 'page',
      source: 'projetos/**/*.md',
      schema: projeto,
    }),
  },
})
