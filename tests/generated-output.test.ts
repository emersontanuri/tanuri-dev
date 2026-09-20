import { spawn } from 'node:child_process'
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { projeto, tiposDeProjeto } from '../shared/projetos'
import type { Fluxo } from '../shared/fluxos'
import { fluxo } from '../shared/fluxos'
import { assertProjects } from '../app/utils/assertProjects'

/**
 * The single test seam: the generated static output.
 *
 * The site is built once, then every assertion runs against the pages as a
 * visitor would receive them. Failure modes like a missing route, a dead link,
 * an unfilled placeholder leaking into the interface or a styling class that
 * never made it into the output are only observable here.
 *
 * Keep every generated-output assertion in this file so the build happens once.
 */
const root = process.cwd()
const outputDir = resolve(root, '.output/public')

/** The minifier emits 3-digit hex where it can, so both forms must be read. */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * Fixtures the content gate writes to prove the build refuses invalid content,
 * and a new file becomes a route. They are swept before the site is built as
 * well as after each test, so a run that was killed mid-test cannot leave a
 * stray project that fails the next run for the wrong reason.
 */
/**
 * Fixtures the content gate writes into the collection to prove that the build
 * refuses invalid content and that a new content file becomes a route. Every
 * one is named with this prefix and swept before and after, so a run that was
 * killed mid-test cannot leave a stray project behind to fail the next run for
 * the wrong reason.
 */
const projetosDir = resolve(root, 'content/projetos')

const FIXTURE_PREFIX = 'zz-prova'

const fixture = (name: string) => resolve(projetosDir, `${name}.md`)

function sweepFixtures() {
  for (const name of readdirSync(projetosDir)) {
    if (name.startsWith(FIXTURE_PREFIX)) {
      rmSync(resolve(projetosDir, name), { force: true })
    }
  }
}

/**
 * The site, built once, without blocking the event loop.
 *
 * `execSync`/`spawnSync` would hold the worker's event loop for the fifteen
 * seconds a build takes — long enough that Vitest's heartbeat between the
 * worker and the main process times out, and the run ends reporting an
 * unhandled error with every test passing and a non-zero exit code. A red run
 * that means nothing would be worse than no run at all, so the build is
 * awaited.
 *
 * NODE_ENV is dropped rather than inherited: Vitest sets it to `test`, and Nuxt
 * answers that with a logger that drops the lines naming the routes it could
 * not prerender. The CLI chooses the mode itself, which is what happens when a
 * person runs the build.
 */
function gerar(opcoes: { herdarSaida?: boolean } = {}) {
  const env = { ...process.env }
  delete env.NODE_ENV

  return new Promise<{ code: number | null; saida: string }>((resolve, reject) => {
    const processo = spawn('npm', ['run', 'generate'], {
      cwd: root,
      shell: true,
      env,
      stdio: opcoes.herdarSaida ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    })

    // setEncoding, rather than toString per chunk, so a character split across
    // two writes is not mangled.
    processo.stdout?.setEncoding('utf8')
    processo.stderr?.setEncoding('utf8')

    let saida = ''

    processo.stdout?.on('data', (pedaco: string) => {
      saida += pedaco
    })
    processo.stderr?.on('data', (pedaco: string) => {
      saida += pedaco
    })

    processo.on('error', reject)
    processo.on('close', (code) => resolve({ code, saida }))
  })
}

beforeAll(async () => {
  sweepFixtures()

  const { code } = await gerar({ herdarSaida: true })

  if (code !== 0) throw new Error(`a geração do site falhou (código ${code})`)
}, 600_000)

function page(relativePath: string): string {
  return readFileSync(resolve(outputDir, relativePath), 'utf8')
}

/** The single stylesheet the build emits, wherever it landed. */
function stylesheet(): string {
  const dir = resolve(outputDir, '_nuxt')

  return readdirSync(dir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(resolve(dir, name), 'utf8'))
    .join('\n')
}

/**
 * The custom properties declared on one selector, merged in cascade order.
 *
 * Scans leaf blocks rather than matching the selector textually, because the
 * build nests rules (inside `@layer`, `@supports`) and can split one authored
 * block into several.
 */
function tokens(selector: string): Record<string, string> {
  const found: Record<string, string> = {}

  for (const [, rawSelector, body] of stylesheet().matchAll(
    /([^{}]*)\{([^{}]*)\}/g,
  )) {
    if (rawSelector.trim() !== selector) continue

    for (const declaration of body.split(';')) {
      const [name, value] = declaration.split(':')
      if (name?.trim().startsWith('--')) found[name.trim()] = (value ?? '').trim()
    }
  }

  expect(
    Object.keys(found),
    `the stylesheet declares custom properties on ${selector}`,
  ).not.toHaveLength(0)

  return found
}

/** WCAG 2.1 relative luminance of an `#rgb` or `#rrggbb` colour. */
function luminance(hex: string): number {
  const digits = hex.slice(1)
  const expanded =
    digits.length === 3
      ? digits
        .split('')
        .map((digit) => digit + digit)
        .join('')
      : digits

  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(expanded.slice(offset, offset + 2), 16) / 255

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** WCAG 2.1 contrast ratio between two `#rrggbb` colours. */
function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  )

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * The Cadeia de pensamento section, lifted out of the page so its assertions
 * cannot be satisfied by unrelated text elsewhere on the site.
 */
function cadeia(html: string): string {
  const start = html.indexOf('id="cadeia-de-pensamento"')
  expect(start, 'the home page has no Cadeia de pensamento section').toBeGreaterThan(-1)

  return html.slice(start, html.indexOf('</ol>', start))
}

/**
 * The section under a heading, so that a method or a technology can only
 * satisfy an assertion inside the section it belongs to. Returns undefined when
 * the section is not on the page, which is how the omission rule is asserted.
 */
function secao(html: string, titulo: string): string | undefined {
  const heading = new RegExp(`<h2[^>]*>\\s*${titulo}\\s*</h2>`).exec(html)

  if (!heading) return undefined

  const resto = html.slice(heading.index + heading[0].length)
  const proximo = resto.search(/<h2[\s>]/)

  return proximo === -1 ? resto : resto.slice(0, proximo)
}

/** `&` is escaped in HTML, and three project titles contain one. */
function escaped(text: string): string {
  return text.replaceAll('&', '&amp;')
}

describe('generated site', () => {
  it('emits the home page', () => {
    expect(existsSync(resolve(outputDir, 'index.html'))).toBe(true)
  })

  it('renders the positioning statement from content on the home page', () => {
    expect(page('index.html')).toContain('Planning complex systems')
  })

  it('renders the disciplines from content on the home page', () => {
    const html = page('index.html')

    for (const discipline of [
      'Planning',
      'Data',
      'Decision Science',
      'AI',
      'Software',
    ]) {
      expect(html).toContain(discipline)
    }
  })

  it('declares the document language', () => {
    expect(page('index.html')).toContain('lang="pt-BR"')
  })
})

describe('cadeia de pensamento', () => {
  const perguntas = [
    'What is happening?',
    'Why is it happening?',
    'What could happen?',
    'What should we do?',
    'Can we automate it?',
  ]

  const disciplinas = [
    'Dados',
    'Modelos',
    'Simulação',
    'Decision Science',
    'Software e IA',
  ]

  it('renders the five questions as one ordered sequence, in order', () => {
    const chain = cadeia(page('index.html'))

    expect(chain).toMatch(/<ol[\s>]/)

    const positions = perguntas.map((pergunta) => chain.indexOf(pergunta))
    expect(positions).not.toContain(-1)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('pairs each question with the discipline that answers it', () => {
    const chain = cadeia(page('index.html'))

    for (const disciplina of disciplinas) {
      expect(chain).toContain(disciplina)
    }
  })

  it('carries the full meaning without JavaScript', () => {
    const chain = cadeia(page('index.html'))

    for (const explicacao of [
      'Dados ajudam a entender.',
      'Modelos ajudam a explicar.',
      'Simulação ajuda a explorar.',
      'Decision Science ajuda a decidir.',
      'Software e IA ajudam a transformar a decisão em sistema.',
    ]) {
      expect(chain).toContain(explicacao)
    }
  })

  it('exposes every step to the keyboard', () => {
    const chain = cadeia(page('index.html'))

    expect(chain.match(/tabindex="0"/g)).toHaveLength(perguntas.length)
  })
})

describe('theme', () => {
  it('ships no theme class, so dark is the default without JavaScript', () => {
    const htmlTag = /<html[^>]*>/.exec(page('index.html'))?.[0] ?? ''

    expect(htmlTag).toContain('lang="pt-BR"')
    // A class here would be re-applied by the head manager during hydration,
    // undoing whatever the pre-paint script had chosen.
    expect(htmlTag).not.toContain('light')
    expect(htmlTag).not.toContain('dark')
  })

  it('reads that absence as dark and the opt-out class as light', () => {
    const byDefault = tokens(':root')['--canvas'] ?? ''
    const optedOut = tokens(':root.light')['--canvas'] ?? ''

    expect(byDefault, 'the classless default declares a canvas').toMatch(HEX)
    expect(optedOut, 'the opt-out declares a canvas').toMatch(HEX)
    expect(luminance(byDefault)).toBeLessThan(0.1)
    expect(luminance(optedOut)).toBeGreaterThan(0.8)
  })

  it('applies the stored theme in the head, before the page paints', () => {
    const html = page('index.html')
    const head = html.slice(0, html.indexOf('</head>'))
    const scripts = [...head.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    const bootstrap = scripts.find(([, , body]) =>
      body.includes('prefers-color-scheme'),
    )

    expect(bootstrap, 'the head carries a theme bootstrap script').toBeDefined()
    // A deferred, async or module script would run after the first paint and
    // show the wrong theme. This is the whole mechanism behind "no flash".
    expect(bootstrap![1]).not.toMatch(/\b(defer|async)\b/)
    expect(bootstrap![1]).not.toMatch(/type=["']module["']/)
  })

  it('keeps text at WCAG AA contrast in both themes', () => {
    const themes = [
      ['dark', tokens(':root')],
      ['light', tokens(':root.light')],
    ] as const

    // Every surface text lands on, and every token used as a text colour.
    const surfaces = ['--canvas', '--surface']
    const textRoles = ['--ink', '--ink-muted', '--accent']

    for (const [name, palette] of themes) {
      for (const surface of surfaces) {
        expect(
          palette[surface],
          `the ${name} theme defines ${surface}`,
        ).toMatch(HEX)

        for (const role of textRoles) {
          expect(palette[role], `the ${name} theme defines ${role}`).toMatch(HEX)

          const ratio = contrast(palette[role], palette[surface])

          expect(
            ratio,
            `${name}: ${role} on ${surface} is ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})

/**
 * The Data Quality AI Agent workflow, as the source material drew it: a chain of
 * seven steps, in order, and the only flow a project has published so far.
 */
const etapasDosAgentes = [
  'Data Sources',
  'Data Source Analyst',
  'QA Structure Agent',
  'Human Validation',
  'Senior Data Analyst',
  'Execution',
  'Report',
]

/**
 * The five Projetos, and what each must show.
 *
 * The order is written out rather than derived from the files, because the
 * order is a decision: delivered work first, then the applied study, the
 * experiment, the laboratory, and the environment underneath all of it last.
 *
 * `problema` is the line on the page that states what the project addresses:
 * the body prose where the source published it, and a resumo where the source
 * published nothing else.
 *
 * `metodos`, `stack` and `fluxos` are the published lists. An empty one means
 * the source never published it, and the page must not invent a section for it.
 */
const projetos = [
  {
    slug: 'agendatrip',
    titulo: 'AgendaTrip',
    tipo: 'Produto',
    problema: 'O projeto explora problemas como',
    metodos: [] as string[],
    stack: ['FastAPI', 'Nuxt', 'Python', 'Docker'],
    fluxos: [] as Fluxo[],
  },
  {
    slug: 'pipeline-planning-simulation',
    titulo: 'Pipeline Planning & Simulation',
    tipo: 'Estudo',
    problema: 'Problemas estudados incluem',
    metodos: ['Monte Carlo', 'Discrete Event Simulation', 'SimPy'],
    stack: [] as string[],
    fluxos: [] as Fluxo[],
  },
  {
    slug: 'data-quality-ai-agent',
    titulo: 'Data Quality AI Agent',
    tipo: 'Experimento',
    problema: 'analisar e validar a qualidade de dados',
    metodos: ['Regras determinísticas', 'LLMs', 'Validação humana'],
    stack: [] as string[],
    fluxos: [
      { titulo: 'Fluxo dos agentes', etapas: etapasDosAgentes },
    ] as Fluxo[],
  },
  {
    slug: 'optimization-simulation-lab',
    titulo: 'Optimization & Simulation Lab',
    tipo: 'Laboratório',
    problema: 'O laboratório explora como diferentes métodos quantitativos',
    metodos: ['Teoria das Filas', 'Bayesian Modeling', 'Risk Analysis'],
    stack: [] as string[],
    fluxos: [] as Fluxo[],
  },
  {
    slug: 'homelab-ai-infrastructure',
    titulo: 'Homelab & AI Infrastructure',
    tipo: 'Infraestrutura',
    problema: 'O ambiente funciona como laboratório',
    metodos: [] as string[],
    stack: ['Ubuntu Server', 'Docker', 'Cloudflare Tunnel', 'n8n'],
    fluxos: [] as Fluxo[],
  },
] as const

function projetoPage(slug: string): string {
  return page(`projetos/${slug}/index.html`)
}

describe('projetos', () => {
  it('lists every project on the index, in the deliberate order', () => {
    const html = page('projetos/index.html')

    const positions = projetos.map(({ titulo }) =>
      html.indexOf(escaped(titulo)),
    )

    expect(positions, 'every project is listed').not.toContain(-1)
    expect(
      positions,
      'the index presents them in the intended order',
    ).toEqual([...positions].sort((a, b) => a - b))
  })

  it('gives every project its own route, linked from the index', () => {
    const html = page('projetos/index.html')

    for (const { slug } of projetos) {
      expect(
        existsSync(resolve(outputDir, 'projetos', slug, 'index.html')),
        `${slug} has a page of its own`,
      ).toBe(true)

      expect(html, `${slug} is linked from the index`).toContain(
        `href="/projetos/${slug}"`,
      )
    }
  })

  it('states on every project page the problem it addresses', () => {
    for (const { slug, problema } of projetos) {
      expect(projetoPage(slug), `${slug} states its problem`).toContain(problema)
    }
  })

  it('names the methods and the stack each project was built with', () => {
    for (const { slug, metodos, stack } of projetos) {
      const html = projetoPage(slug)

      if (metodos.length > 0) {
        const secaoMetodos = secao(html, 'Métodos')
        expect(secaoMetodos, `${slug} has a Métodos section`).toBeDefined()

        for (const metodo of metodos) {
          expect(secaoMetodos, `${slug} names ${metodo}`).toContain(metodo)
        }
      }

      if (stack.length > 0) {
        const secaoStack = secao(html, 'Stack')
        expect(secaoStack, `${slug} has a Stack section`).toBeDefined()

        for (const item of stack) {
          expect(secaoStack, `${slug} names ${item}`).toContain(item)
        }
      }
    }
  })

  it('omits the section for a list the source never published', () => {
    for (const { slug, metodos, stack } of projetos) {
      const html = projetoPage(slug)

      if (metodos.length === 0) {
        expect(secao(html, 'Métodos'), `${slug} has no Métodos section`).toBeUndefined()
      }

      if (stack.length === 0) {
        expect(secao(html, 'Stack'), `${slug} has no Stack section`).toBeUndefined()
      }
    }
  })

  it('generates one page per project in the collection, and no others', () => {
    const arquivos = readdirSync(resolve(root, 'content/projetos'))
      .filter((nome) => nome.endsWith('.md'))
      .map((nome) => nome.replace(/\.md$/, ''))
      .sort()

    const paginas = readdirSync(resolve(outputDir, 'projetos'), {
      withFileTypes: true,
    })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name)
      .sort()

    expect(paginas).toEqual(arquivos)
  })
})

/**
 * Um Fluxo on a project page: the diagram that replaced the monospace block.
 *
 * The chain is asserted in the order the source drew it, because that order is
 * the meaning of the flow, and the arrows are asserted to be hidden from
 * assistive technology, because a diagram whose connectors are announced
 * between every pair of steps is read as noise. Whether the diagram fits a
 * phone is not observable here: it is checked in a browser, and the layout is
 * a column at every width so that there is nothing to overflow.
 */
describe('fluxos', () => {
  /** The Fluxos section of a project page, so a step cannot satisfy the
   * assertions from elsewhere on the page. */
  function secaoDeFluxos(slug: string): string {
    const encontrada = secao(projetoPage(slug), 'Fluxos')

    expect(encontrada, `${slug} has a Fluxos section`).toBeDefined()

    return encontrada!
  }

  it('draws a flow as a diagram with one item per step of the chain', () => {
    const html = secaoDeFluxos('data-quality-ai-agent')

    expect(html, 'the flow is named where it is drawn').toContain(
      'Fluxo dos agentes',
    )
    expect(
      html.match(/<li[\s>]/g),
      'every step of the chain is an item of the list',
    ).toHaveLength(etapasDosAgentes.length)
  })

  it('keeps the chain in the order the source drew it', () => {
    const html = secaoDeFluxos('data-quality-ai-agent')

    const posicoes = etapasDosAgentes.map((etapa) => html.indexOf(etapa))

    expect(posicoes, 'every step is on the page').not.toContain(-1)
    expect(
      posicoes,
      'the reading order is the order of the chain',
    ).toEqual([...posicoes].sort((a, b) => a - b))
  })

  it('carries every step as text, so the diagram can be read aloud', () => {
    const html = secaoDeFluxos('data-quality-ai-agent')

    expect(html, 'the diagram is not an image').not.toMatch(
      /<img|<svg|role="img"/,
    )

    for (const etapa of etapasDosAgentes) {
      expect(html, `${etapa} is a text node`).toMatch(
        new RegExp(`>\\s*${etapa}\\s*<`),
      )
    }
  })

  it('keeps the arrows out of the reading, because they carry no meaning', () => {
    const html = secaoDeFluxos('data-quality-ai-agent')

    expect(html.match(/aria-hidden="true"/g)).toHaveLength(
      etapasDosAgentes.length - 1,
    )
  })

  it('leaves the section out of a project the source drew no flow for', () => {
    for (const { slug, fluxos } of projetos) {
      if (fluxos.length > 0) continue

      expect(
        secao(projetoPage(slug), 'Fluxos'),
        `${slug} has no Fluxos section`,
      ).toBeUndefined()
    }
  })
})

describe('the projeto schema', () => {
  const valido = {
    title: 'Um Projeto',
    resumo: 'Um resumo publicado.',
    tipo: 'Produto',
    ordem: 1,
  }

  it('accepts each of the five Tipos de projeto', () => {
    for (const tipo of tiposDeProjeto) {
      expect(
        projeto.safeParse({ ...valido, tipo }).success,
        `${tipo} is a valid Tipo de projeto`,
      ).toBe(true)
    }
  })

  it('rejects any other value for the type', () => {
    for (const tipo of ['ProdutoX', 'produto', 'Case study', '']) {
      const resultado = projeto.safeParse({ ...valido, tipo })

      expect(resultado.success, `${tipo} is not a Tipo de projeto`).toBe(false)
    }
  })

  it('rejects a project that is missing required frontmatter', () => {
    for (const campo of ['title', 'resumo', 'tipo', 'ordem'] as const) {
      const incompleto: Record<string, unknown> = { ...valido }
      delete incompleto[campo]

      expect(
        projeto.safeParse(incompleto).success,
        `a project without ${campo} is rejected`,
      ).toBe(false)
    }
  })

  it('reads the ordering as a number, whoever wrote it', () => {
    // The content database stores a number as text, so "2" is what the schema
    // usually sees, while frontmatter can be written as 2. Both mean 2, and an
    // ordering that is missing or nonsensical is still refused.
    expect(projeto.safeParse({ ...valido, ordem: '2' }).data?.ordem).toBe(2)
    expect(projeto.safeParse({ ...valido, ordem: 2 }).data?.ordem).toBe(2)

    for (const ordem of [0, -1, 1.5, 'dois', null, '']) {
      expect(
        projeto.safeParse({ ...valido, ordem }).success,
        `ordem ${JSON.stringify(ordem)} is rejected`,
      ).toBe(false)
    }
  })

  it('accepts a flow, and refuses one that is not a chain', () => {
    const umFluxo = { titulo: 'Um fluxo', etapas: ['Uma etapa', 'Outra'] }

    expect(projeto.safeParse({ ...valido, fluxos: [umFluxo] }).success).toBe(
      true,
    )
    // A project the source drew no flow for is still a valid project: an
    // unpublished field arrives as null rather than undefined.
    expect(projeto.safeParse({ ...valido, fluxos: null }).success).toBe(true)
    expect(
      projeto.safeParse({
        ...valido,
        fluxos: [{ titulo: 'Etapa única', etapas: ['Só isto'] }],
      }).success,
    ).toBe(false)
  })
})

/**
 * The rules of a Fluxo, exercised without a build.
 *
 * They are few and they are the whole difference between a chain and a box, so
 * they are worth covering exhaustively here rather than paying a build for
 * each one. What the build has to prove is that the rules are applied to
 * content, which its own tests do.
 */
describe('the fluxo schema', () => {
  const umFluxo = { titulo: 'Um fluxo', etapas: ['Uma etapa', 'Outra etapa'] }

  it('accepts a titled chain of two steps or more', () => {
    expect(fluxo.safeParse(umFluxo).success).toBe(true)
    expect(
      fluxo.safeParse({ ...umFluxo, etapas: ['Um', 'Dois', 'Três'] }).success,
    ).toBe(true)
  })

  it('refuses one step, because a single step is not a chain', () => {
    expect(fluxo.safeParse({ ...umFluxo, etapas: ['Só isto'] }).success).toBe(
      false,
    )
    expect(fluxo.safeParse({ ...umFluxo, etapas: [] }).success).toBe(false)
  })

  it('refuses a nameless step and a flow with no title', () => {
    expect(fluxo.safeParse({ ...umFluxo, etapas: ['Um', ''] }).success).toBe(
      false,
    )
    expect(fluxo.safeParse({ ...umFluxo, titulo: '' }).success).toBe(false)
    expect(fluxo.safeParse({ etapas: umFluxo.etapas }).success).toBe(false)
  })
})

/**
 * The gate as a rule: what it refuses, and what it says about it.
 *
 * These run against the check itself, with no build at all, so the rules are
 * covered exhaustively at the speed of a unit test. The suite below proves that
 * the build is wired to them.
 */
describe('the content gate', () => {
  /**
   * A project as the content layer actually delivers one: a field that is not
   * in the frontmatter arrives as null, and a number arrives as text.
   */
  const entregue = {
    path: '/projetos/exemplo',
    title: 'Exemplo',
    resumo: 'Um resumo publicado.',
    tipo: 'Produto',
    ordem: '1',
    stack: ['Nuxt'],
    metodos: null,
    fluxos: null,
    periodo: null,
  }

  /** Everything the refusal says, wherever the error keeps it. */
  async function refusal(projetos: readonly unknown[]) {
    const erro = await assertProjects(projetos).then(
      () => undefined,
      (e: { message?: string; statusMessage?: string }) => e,
    )

    return `${erro?.message ?? ''}\n${erro?.statusMessage ?? ''}`
  }

  it('accepts what the content layer delivers, nulls and text and all', async () => {
    await expect(assertProjects([entregue])).resolves.toBeUndefined()
    await expect(assertProjects([])).resolves.toBeUndefined()
  })

  it('refuses a type outside the five, and says which one it was given', async () => {
    await expect(refusal([{ ...entregue, tipo: 'ProdutoX' }])).resolves.toContain(
      'ProdutoX',
    )
  })

  it('refuses a project that is missing a required field, and names it', async () => {
    for (const campo of ['title', 'resumo', 'tipo', 'ordem'] as const) {
      await expect(
        refusal([{ ...entregue, [campo]: null }]),
        `a project without ${campo} is refused`,
      ).resolves.toContain(campo)
    }
  })

  it('refuses a flow that is not a chain, and names the field', async () => {
    await expect(
      refusal([
        { ...entregue, fluxos: [{ titulo: 'Etapa única', etapas: ['Só isto'] }] },
      ]),
    ).resolves.toContain('fluxos')
  })

  it('reports every project that fails, not just the first', async () => {
    const motivo = await refusal([
      { ...entregue, path: '/projetos/um', resumo: null },
      { ...entregue, path: '/projetos/dois', tipo: 'Estudo de caso' },
    ])

    expect(motivo).toContain('/projetos/um')
    expect(motivo).toContain('/projetos/dois')
  })
})

/**
 * The same gate, in the build.
 *
 * The rules, and everything the refusal says, are asserted above without a
 * build. What only a build can add is that they are wired in: a project that
 * breaks the schema stops `nuxt generate`, and a project that does not becomes
 * a route. The two tests here are a pair — the same build machinery refuses one
 * fixture and accepts the other — which is what pins the refusal on the schema
 * rather than on the fixture being a file at all.
 *
 * Nothing here reads the wording out of a build log. Nuxt's logger drops the
 * lines naming the failed route depending on how it was started, so a log is
 * not something a test can rely on; what the refusal says is checked above.
 *
 * These rebuild over `.output`, so this suite stays last in the file. A fixture
 * left behind by a crashed run would otherwise be built into the site, so they
 * are swept before and after — see sweepFixtures.
 */
describe('the content gate, in the build', () => {
  const invalido = fixture('zz-prova-invalido')
  const novo = fixture('zz-prova-novo')

  afterEach(sweepFixtures)

  it('refuses to build a site with a project that breaks the schema', async () => {
    writeFileSync(
      invalido,
      [
        '---',
        'title: Prova inválida',
        'resumo: Um arquivo escrito por um teste.',
        'tipo: ProdutoX',
        'ordem: 99',
        '---',
        '',
        'Corpo de prova.',
        '',
      ].join('\n'),
    )

    const { code, saida } = await gerar()

    expect(code, `the build refuses to ship it:\n${saida}`).not.toBe(0)
    // Safe to read this log: it is the check's own line, written to the console
    // rather than to Nuxt's logger, which is the one that comes and goes.
    expect(saida, `the refusal names the file:\n${saida}`).toContain(
      '/projetos/zz-prova-invalido',
    )
  }, 120_000)

  it('turns a new content file into a working route, flow and all, with no code change', async () => {
    writeFileSync(
      novo,
      [
        '---',
        'title: Projeto de Prova',
        'resumo: Um arquivo escrito por um teste.',
        'tipo: Estudo',
        'ordem: 99',
        'fluxos:',
        '  - titulo: Fluxo de prova',
        '    etapas:',
        '      - Primeira etapa',
        '      - Segunda etapa',
        '---',
        '',
        'Um problema declarado por um teste.',
        '',
      ].join('\n'),
    )

    const { code, saida } = await gerar()

    expect(code, `the build accepts it:\n${saida}`).toBe(0)
    expect(
      existsSync(resolve(outputDir, 'projetos/zz-prova-novo/index.html')),
      'the new file has a page of its own',
    ).toBe(true)
    expect(
      page('projetos/index.html'),
      'and the index links to it',
    ).toContain('href="/projetos/zz-prova-novo"')

    // The criteria this fixture exists for: a flow authored in a content file
    // reaches a visitor as a diagram, with no component naming it.
    const pagina = page('projetos/zz-prova-novo/index.html')
    const posicoes = ['Primeira etapa', 'Segunda etapa'].map((etapa) =>
      pagina.indexOf(etapa),
    )

    expect(posicoes, 'the steps of the new flow are on the page').not.toContain(
      -1,
    )
    expect(posicoes, 'in the order they were authored').toEqual(
      [...posicoes].sort((a, b) => a - b),
    )
  }, 120_000)
})
