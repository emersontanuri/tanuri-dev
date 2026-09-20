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
