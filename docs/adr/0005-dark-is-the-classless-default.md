# Dark is the classless default, and the theme class is not Nuxt's to manage

tanuri.dev renders dark with no class at all, and treats `light` as the opt-out. `:root` therefore carries the dark tokens, `:root.light` carries the light ones, and the `dark:` variant is phrased against the absence of `light` rather than the presence of `dark`.

Two things forced this shape.

The first is the visitor without JavaScript. The theme is settled by a blocking inline script in the head, because it has to be decided before the first paint or the wrong theme flashes. That script never runs without JavaScript, and dark is the designed default, so dark has to be what the document renders as with no class present. Keeping the usual `:root` = light, `.dark` = dark split would have meant a script-less visitor receiving the light theme.

The second is a trap worth recording. Declaring the class in Nuxt's `htmlAttrs` is the obvious way to ship a default, but the head manager re-applies those attributes during hydration, after the first paint. A visitor whose operating system prefers light had the light theme applied correctly before paint and then silently overwritten with dark once the app hydrated. A mutation observer confirmed the sequence: the class was already correct at `interactive`, `DOMContentLoaded` and `load`, and changed only afterwards. Nuxt's `htmlAttrs` therefore carries no theme class, and the pre-paint script and `useTheme` are the only writers of it.

The cost is a `dark:` variant that departs from Tailwind's documented `&:where(.dark, .dark *)` form, and an opt-out written as `:root.light` so that it wins on specificity rather than on file order.
