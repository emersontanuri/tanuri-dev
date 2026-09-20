/**
 * The content gate: every Projeto is checked against the collection schema, and
 * one that does not match stops the build.
 *
 * It exists because `@nuxt/content` does not do it. A collection schema becomes
 * SQL columns and generated types, but the values that go into those columns
 * are never checked: a project typed `ProdutoX`, or missing its `resumo`, is
 * written to the content database and rendered like any other, and nothing
 * downstream objects. This is the objecting.
 *
 * Server-side only. Enforcement is a build-time concern — `nuxt generate`
 * prerenders every route, so the check runs then, a failure makes the route
 * fail, and `nitro.prerender.failOnError` turns that into a failed build. Both
 * imports are made here, behind that guard, so the browser is never sent a
 * schema and a parser to re-check content the build has already accepted.
 *
 * It is deliberately a function over documents rather than something wired into
 * the build, so that the rules can be exercised directly, without a build.
 *
 * See docs/adr/0006.
 */
export async function assertProjects(projetos: readonly unknown[]) {
  if (import.meta.client) return

  const [{ createError }, { projeto }] = await Promise.all([
    import('h3'),
    import('#shared/projetos'),
  ])

  const problemas: string[] = []

  for (const doc of projetos) {
    const parsed = projeto.safeParse(doc)

    if (parsed.success) continue

    const path = (doc as { path?: string }).path ?? 'sem caminho'
    const fields = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
      .join('; ')

    problemas.push(`${path} — ${fields}`)
  }

  if (problemas.length > 0) {
    const detalhe = problemas.map((problema) => `- ${problema}`).join('\n')

    // Said here, before throwing, because this is the only surface the person
    // who broke the content is guaranteed to see. Nitro lists a route it could
    // not prerender by its status message, and h3 has announced that a long
    // status message will be sanitized away; a console write is not.
    console.error(
      `\nProjetos que não passam no schema (o build não vai continuar):\n${detalhe}\n`,
    )

    throw createError({
      statusCode: 500,
      statusMessage: 'Projeto inválido',
      message: `Projetos que não passam no schema:\n${detalhe}`,
    })
  }
}
