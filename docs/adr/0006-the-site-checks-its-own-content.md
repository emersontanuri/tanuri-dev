# The site checks its own content, because Nuxt Content does not

A Projeto is checked against the collection schema while the page that lists the collection renders, and a document that does not match stops the build. The check lives in `app/utils/assertProjects.ts`, the rules it applies live in `shared/projetos.ts` and the modules that schema is built from, and `nitro.prerender.failOnError` is what turns a page that threw into a failed build. The browser is left out of it: the schema is imported behind an `import.meta.server` guard, so a visitor is never sent a validator to re-check content the build already accepted.

This exists because `@nuxt/content` does not do it. Its docs say a collection schema "enforces data consistency", and it does turn a schema into database columns and generated types — but it never checks the values that go into them. Measured, not guessed: with `tipo: ProdutoX` in a content file, the build succeeded, and `select tipo from _content_projetos` returned `ProdutoX` alongside the five valid rows. Nothing warns, nothing fails, and the page renders it as though it were fine. A build only stops if something refuses the document, so the site refuses it.

The check runs at render time because that is where the framework hands over a parsed document — the same one the page is about to render. A Nitro plugin was tried first and abandoned: a plugin's async throw is not awaited by the server's startup, so the build carried on and logged an unhandled rejection instead of stopping.

Two things about what the content layer delivers were found by the check, and neither is visible in the frontmatter:

- A field that is not in the frontmatter arrives as `null`, not `undefined`, so the schema uses `.nullish()` and the pages guard with `?.length`.
- A number arrives as text — `ordem` reads back as `"1"` — because the column is created as TEXT. The schema reads it with `z.coerce.number()` and states that the ordering starts at 1, so an ordering that is missing cannot quietly become 0. The index sorts on that number rather than in SQL, where the strings would sort "10" before "2".

The refusal is written to the console as well as thrown. Nitro lists a route it could not prerender by the error's status message, and h3 has announced that a long status message will be sanitized away, so the detail is said where it cannot be reformatted, and the error carries it in both `statusMessage` and `message` while the two conventions overlap.

One trap is worth recording because it cost an afternoon and leaves no error behind. `@nuxt/content` converts a schema with the zod it resolves. Installing a different zod major at the project root gives the tree two copies, and schemas built by the project's copy are then foreign to that conversion: it fails silently, the `content/types` template stops compiling, and every collection query loses its types — the only signal is a `NUXT_B1001` warning that says the template could not be compiled and nothing about zod. Keep `zod` on the version `@nuxt/content` depends on; `npm ls zod` should print one line.

What this does not cover: the check is per collection and runs where a collection is queried, so a collection no page lists is not checked. The `paginas` collection is in that position today, and is covered by the generated-output tests instead.
