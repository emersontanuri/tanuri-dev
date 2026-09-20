import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
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

beforeAll(() => {
  execSync('npm run generate', { cwd: root, stdio: 'inherit' })
}, 600_000)

function page(relativePath: string): string {
  return readFileSync(resolve(outputDir, relativePath), 'utf8')
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
