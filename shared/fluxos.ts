import { z } from 'zod'

/**
 * Um Fluxo: a chain of steps, authored as content and rendered as a diagram
 * (CONTEXT.md: Fluxo).
 *
 * The source material draws these with arrows and blank space - problem to
 * model to algorithm to API to interface to deploy, the agents of a
 * data-quality workflow, the stages of a career - and in the body of a project
 * they rendered as a block of monospace text, which is unreadable on a phone
 * and gives a screen reader a column of arrow glyphs. So a flow is data: the
 * steps are an ordered list of strings, the shape a diagram needs, and the
 * component that draws it reads nothing else. A new flow is a content change.
 *
 * `titulo` is required because the diagram is a figure and the title is its
 * caption. It is also the flow's name in the accessibility tree, and a flow
 * nobody has named is one the site cannot present.
 *
 * `etapas` requires two steps or more. One is not a chain, and a flow authored
 * with a single step is a mistake the build should say out loud rather than
 * render as a lonely box. A step is text, not markup: the component decides
 * how a step looks, so no author can smuggle a layout choice into content.
 *
 * The rules live here, in a plain module, for the same three callers as the
 * Projeto model: the collection definition, the build-time check and the
 * tests. See shared/projetos.ts, and docs/adr/0007 for why a flow is authored
 * rather than drawn.
 */
export const fluxo = z.object({
  titulo: z.string().min(1),
  etapas: z.array(z.string().min(1)).min(2),
})

export type Fluxo = z.infer<typeof fluxo>
