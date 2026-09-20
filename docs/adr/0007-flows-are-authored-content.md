# Flows are authored as content, and drawn as a column of steps

A Fluxo is a property of the document that owns it: `fluxos` is a list of flows, each one a title and an ordered list of steps, declared in `shared/fluxos.ts` and validated by the same schema, the same content gate and the same tests as the rest of a Projeto. One component, `app/components/Fluxos.vue`, draws every flow on the site, and a step is a string with no markup in it, so an author cannot smuggle a layout decision into content.

The alternative was to leave the flows where they were: fenced blocks in the markdown body, drawn with arrows and blank space. Two things were wrong with that. The first is the reader on a phone — the source material's diagrams are 20 characters wide and the arrow column is the only thing holding the shape together, so they scroll sideways or wrap into nonsense at 320px. The second is that a code block is invisible to the content gate: the schema checks frontmatter, the body is rendered as authored, and a flow with one step or none would sail through the build and reach a visitor.

Also rejected:

- **A markdown directive or custom node type**, parsed by a remark plugin. It would put the flow in the body, where the Cadeia de pensamento and the project frontmatter already decided content does not go, and it would add a parser to maintain for the same result.
- **Mermaid**, which the source's syntax resembles. It is a client-side library that draws in JavaScript, so a flow would vanish for a visitor whose script failed, and the site's argument has to survive that.
- **An inline SVG or a generated image.** The steps would stop being text in the accessibility tree, and a diagram that cannot be selected, searched or read aloud is a picture of a flow, not a flow.

The diagram is a single column at every width: one box per step, joined by a small arrow. A flow is a sequence, and a column cannot reorder it, so the order a screen reader follows is the order the eye follows, and there is nothing to overflow. The arrows are the one part of a flow that is not content — "downwards arrow", announced between every pair of steps, is noise — so they are hidden from assistive technology with `aria-hidden`.

Two rules live in the schema rather than in a component, because they are about the shape of a flow and not about how it looks. `titulo` is required, since the diagram is a figure and the title is its caption and its name in the accessibility tree. `etapas` requires two steps or more, because a single step is not a chain: that is an authoring mistake, and the build is where it should be said, not a visitor's browser.

Two places are deliberately not covered. The site's other flows are not authored yet — the source draws four, and the one published so far is the Data Quality AI Agent workflow, which moved out of a code block in the project body and into the property. And nothing here describes a flow that branches or merges: the positioning diagram on the source's first page fans four disciplines into one outcome, and a linear chain of steps cannot express it. If that diagram is ever authored, it needs its own shape rather than a taller `etapas`.
