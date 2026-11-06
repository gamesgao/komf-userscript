const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { runInNewContext } = require('node:vm')
const ts = require('typescript')

// Exercise the actual TypeScript helper using the compiler already used by the repo.
const source = readFileSync(join(__dirname, '../src/providerLinks.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
})
const context = { exports: {}, URL }
runInNewContext(compiled.outputText, context)
const { parseProviderLink } = context.exports
const { getSourceUrl } = context.exports

test('uses the supplied source URL rather than guessing from provider IDs', () => {
    const url = 'https://exhentai.org/g/123/AbC123/'
    assert.equal(getSourceUrl(url), url)
    assert.equal(getSourceUrl('http://example.org/source'), 'http://example.org/source')
})

test('missing, malformed and non-web URLs have no link action', () => {
    for (const url of [undefined, null, '', 'not a URL', '/relative', 'javascript:alert(1)', 'data:text/html,test']) {
        assert.equal(getSourceUrl(url), undefined)
    }
})

for (const [url, provider, id] of [
    ['https://bgm.tv/subject/123', 'BANGUMI', '123'],
    ['https://bangumi.tv/subject/123#info', 'BANGUMI', '123'],
    ['https://e-hentai.org/g/123/AbC123/?p=1', 'EHENTAI', '123;AbC123'],
    ['https://exhentai.org/g/123/AbC123?inline_set=dm_l', 'EHENTAI', '123;AbC123'],
    ['https://anilist.co/manga/123/title', 'ANILIST', '123'],
    ['https://myanimelist.net/manga/123/title', 'MAL', '123'],
    ['https://mangadex.org/title/test-id#details', 'MANGADEX', 'test-id'],
    ['https://www.mangaupdates.com/series/123', 'MANGA_UPDATES', '123'],
    ['https://www.mangaupdates.com/series.html?id=123', 'MANGA_UPDATES', '123'],
    ['https://www.mangaupdates.com/series/abc/title', 'MANGA_UPDATES', '13368'],
    ['https://www.mangaupdates.com/series/ABC', 'MANGA_UPDATES', '13368'],
    ['https://www.mangaupdates.com/series/3w5e11264sgsf', 'MANGA_UPDATES', '18446744073709551615']
]) {
    test(`parses ${url}`, () => {
        const result = parseProviderLink({ url, label: 'Display label is not a provider ID' })
        assert.equal(result.provider, provider)
        assert.equal(result.providerSeriesId, id)
        assert.equal(result.url, url)
        assert.equal(result.label, 'Display label is not a provider ID')
    })
}

test('ignores empty and unsupported links', () => {
    assert.equal(parseProviderLink({}), null)
    assert.equal(parseProviderLink({ url: 'https://example.com/book/1' }), null)
})
