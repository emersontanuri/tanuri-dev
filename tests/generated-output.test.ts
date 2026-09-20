import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

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

beforeAll(() => {
  execSync('npm run generate', { cwd: root, stdio: 'inherit' })
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
