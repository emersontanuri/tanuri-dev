import { z } from 'zod'
import { fluxo } from './fluxos'

/**
 * The content model for Projetos, kept in a plain module rather than inline in
 * `content.config.ts`, because three callers in three different places need it:
 * the collection definition, which is build-time configuration; the check that
 * the content matches it, which runs on the server while the site is built; and
 * the tests.
 *
 * One thing to know before touching the zod dependency here. `@nuxt/content`
 * converts a collection schema to JSON Schema — and from there to the database
 * columns and the collection's generated types — with the zod it resolves. If
 * this project ends up with a second copy of zod, the schemas built by it are
 * foreign to that conversion, the conversion fails without saying so, and every
 * collection query quietly loses its types. Keep `zod` on the same version
 * `@nuxt/content` depends on; `npm ls zod` should show one line.
 */

/**
 * The Cadeia de pensamento: a question and the discipline that answers it. It
 * is the site's central argument, so it is authored content rather than copy
 * hardcoded in a component.
 */
export const passoDaCadeia = z.object({
  pergunta: z.string(),
  disciplina: z.string(),
  explicacao: z.string(),
})

export type PassoDaCadeia = z.infer<typeof passoDaCadeia>

/**
 * The closed set of project types (CONTEXT.md: Tipo de projeto). It is the
 * distinction the site exists to make explicit: delivered work at one end,
 * exploration at the other. The list is the single source of truth for both the
 * schema and the union type, so a value can never be accepted by one and
 * rejected by the other.
 */
export const tiposDeProjeto = [
  'Produto',
  'Estudo',
  'Experimento',
  'Laboratório',
  'Infraestrutura',
] as const

export type TipoDeProjeto = (typeof tiposDeProjeto)[number]

/**
 * A Projeto.
 *
 * `stack`, `metodos`, `fluxos` and `periodo` are nullish rather than optional
 * because that is how an unpublished field arrives: the source material has no
 * stack for two projects, no methods for one, no flow for four of the five, and
 * no period for any, and `@nuxt/content` stores a field that is not in the
 * frontmatter as NULL. A list or a date the owner never supplied is omitted
 * rather than invented, so the schema accepts its absence and nothing else.
 *
 * `ordem` is read as a number because the content database stores it as text,
 * so "1" is what usually arrives however it was authored. The ordering is
 * stated as starting at 1 so that a project without one cannot read as 0.
 *
 * The markdown body carries the problem the project addresses. It is prose, it
 * is the part that differs most between projects, and it has to be editable
 * without touching a component, so it does not belong in frontmatter.
 */
export const projeto = z.object({
  title: z.string().min(1),
  resumo: z.string().min(1),
  tipo: z.enum(tiposDeProjeto),
  ordem: z.coerce.number().int().min(1),
  stack: z.array(z.string()).nullish(),
  metodos: z.array(z.string()).nullish(),
  fluxos: z.array(fluxo).nullish(),
  periodo: z.string().min(1).nullish(),
})

export type Projeto = z.infer<typeof projeto>
