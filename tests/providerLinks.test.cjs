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
const { getSourceUrl, getLinkToSave, normalizeStoredLink } = context.exports

const muResult = {
    provider: 'MANGA_UPDATES', resultId: '2034633929',
    url: 'https://www.mangaupdates.com/series/0xnd9l5/aibuka-kari'
}
const muSaved = 'https://www.mangaupdates.com/series.html?id=2034633929'

test('Link-only stores the authoritative MU API ID in a working compatibility URL', () => {
    assert.equal(getLinkToSave(muResult), muSaved)
    assert.equal(getSourceUrl(muResult.url), muResult.url, 'provider navigation stays unchanged')
    assert.equal(muResult.url, 'https://www.mangaupdates.com/series/0xnd9l5/aibuka-kari')
    assert.equal(parseProviderLink({ url: muSaved }).providerSeriesId, muResult.resultId)
})

test('Link-only uses the result ID, not an old decimal website ID or an all-digit base36 slug', () => {
    assert.equal(getLinkToSave({ ...muResult, resultId: '55099564912', url: 'https://www.mangaupdates.com/series.html?id=33' }),
        'https://www.mangaupdates.com/series.html?id=55099564912')
    assert.equal(getLinkToSave({ ...muResult, url: 'https://www.mangaupdates.com/series/123/title' }), muSaved)
    assert.equal(getLinkToSave({ ...muResult, resultId: '18446744073709551615' }),
        'https://www.mangaupdates.com/series.html?id=18446744073709551615')
})

test('Link-only normalizes MangaBaka long and short result URLs to the short form', () => {
    for (const url of ['https://mangabaka.org/118181', 'https://mangabaka.org/manga/118181/Idol-Club-KARI']) {
        const result = { provider: 'MANGA_BAKA', resultId: '118181', url }
        assert.equal(getLinkToSave(result), 'https://mangabaka.org/118181')
        assert.equal(getSourceUrl(url), url)
    }
})

test('other providers, missing URLs and nonnumeric result IDs keep existing behavior', () => {
    const eh = { provider: 'EHENTAI', resultId: '123;abc', url: 'https://exhentai.org/g/123/abc/' }
    assert.equal(getLinkToSave(eh), eh.url)
    for (const url of [undefined, null, '', 'javascript:alert(1)']) assert.equal(getLinkToSave({ ...muResult, url }), undefined)
    assert.equal(getLinkToSave({ ...muResult, resultId: 'invalid' }), muResult.url)
})

test('existing equivalent MU URLs normalize for replacement, not a second same-provider link', () => {
    for (const url of [muResult.url, 'http://mangaupdates.com/series/0XND9L5?x=1', muSaved + '#info']) {
        assert.equal(normalizeStoredLink(url), muSaved)
    }
    assert.equal(normalizeStoredLink('https://www.mangaupdates.com/series/123/title'),
        `https://www.mangaupdates.com/series.html?id=${parseInt('123', 36)}`)
    assert.equal(normalizeStoredLink('https://www.mangaupdates.com/series.html?id=33'),
        'https://www.mangaupdates.com/series.html?id=33', 'legacy IDs must not be guessed')
})

test('existing MangaBaka aliases normalize; unrelated and malformed URLs stay untouched', () => {
    assert.equal(normalizeStoredLink('https://mangabaka.org/manga/118181/Idol-Club-KARI'), 'https://mangabaka.org/118181')
    for (const url of ['https://example.org/series/0xnd9l5', 'https://mangaupdates.com.example.org/series/0xnd9l5', 'not a URL']) {
        assert.equal(normalizeStoredLink(url), url)
    }
})

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
