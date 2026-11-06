const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { runInNewContext } = require('node:vm')
const ts = require('typescript')

const source = readFileSync(join(__dirname, '../src/services/komga-metadata.service.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
})
const providerContext = { exports: {}, URL }
runInNewContext(ts.transpileModule(readFileSync(join(__dirname, '../src/providerLinks.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, providerContext)
const oldLink = { label: 'Existing', url: 'https://example.org/existing' }
const newLink = { label: 'EHENTAI', url: 'https://e-hentai.org/g/123/abc/' }

function fixture({ oneshot = false, patchStatus = 204, patchStatuses = {}, readStatus = 200, bookReadStatus = readStatus, bookCount = 1 } = {}) {
    const series = { id: 's1', oneshot, metadata: { links: [oldLink], title: 'Unchanged', linksLock: true } }
    const book = { id: 'b1', metadata: { links: [oldLink], title: 'Book unchanged', tags: ['keep'], linksLock: false } }
    const calls = []
    const context = { exports: {}, require: () => providerContext.exports, fetch: async (url, init) => {
        calls.push({ url, ...init })
        if (init.method === 'PATCH') {
            const status = patchStatuses[url.includes('/books/') ? 'book' : 'series'] ?? patchStatus
            if (status === 204) {
                Object.assign(url.includes('/books/') ? book.metadata : series.metadata, JSON.parse(init.body))
            }
            return { ok: status === 204, status }
        }
        const status = url.includes('/books?') ? bookReadStatus : readStatus
        return {
            ok: status === 200, status,
            json: async () => structuredClone(url.includes('/books?') ? { content: Array(bookCount).fill(book) } : series)
        }
    } }
    runInNewContext(compiled.outputText, context)
    return { add: context.exports.addSeriesLink, calls, series, book }
}

const muSource = 'https://www.mangaupdates.com/series/0xnd9l5/aibuka-kari'
const muLink = { label: 'MANGA_UPDATES', url: 'https://www.mangaupdates.com/series.html?id=2034633929' }

test('selected MU webpage alias is replaced in place, keeping its label and other providers', async () => {
    const f = fixture()
    f.series.metadata.links = [oldLink, { label: 'My MU label', url: muSource }, newLink]
    assert.equal(await f.add('s1', muLink, muSource), true)
    assert.deepEqual(f.series.metadata.links, [oldLink, { ...muLink, label: 'My MU label' }, newLink])
    assert.equal(await f.add('s1', muLink, muSource), false)
    assert.equal(f.calls.filter(c => c.method === 'PATCH').length, 1)
})

test('MU aliases collapse to one compatible link, while distinct MU records stay untouched', async () => {
    const f = fixture()
    const other = { label: 'Other MU work', url: 'https://www.mangaupdates.com/series/pb8uwds/one-piece' }
    f.series.metadata.links = [{ label: 'Keep', url: 'https://mangaupdates.com/series/0xnd9l5#info' }, other, muLink]
    await f.add('s1', muLink, muSource)
    assert.deepEqual(f.series.metadata.links, [{ ...muLink, label: 'Keep' }, other])
})

test('One-shot normalizes each layer with its own label and preserves unrelated fields', async () => {
    const f = fixture({ oneshot: true })
    f.book.metadata.links = [{ label: 'Book MU', url: muSource }]
    f.series.metadata.links = [oldLink, { label: 'Series MU', url: muSource }]
    await f.add('s1', muLink, muSource)
    assert.deepEqual(f.book.metadata.links, [{ ...muLink, label: 'Book MU' }])
    assert.deepEqual(f.series.metadata.links, [oldLink, { ...muLink, label: 'Series MU' }])
    assert.deepEqual(f.book.metadata.tags, ['keep'])
    assert.equal(f.series.metadata.title, 'Unchanged')
    for (const call of f.calls.filter(c => c.method === 'PATCH')) assert.deepEqual(Object.keys(JSON.parse(call.body)), ['links'])
})

test('MangaBaka long link is replaced rather than duplicated', async () => {
    const f = fixture()
    const original = 'https://mangabaka.org/manga/118181/Idol-Club-KARI'
    f.series.metadata.links = [{ label: 'MangaBaka', url: original }, oldLink]
    const normalized = { label: 'MANGA_BAKA', url: 'https://mangabaka.org/118181' }
    await f.add('s1', normalized, original)
    assert.deepEqual(f.series.metadata.links, [{ ...normalized, label: 'MangaBaka' }, oldLink])
})

test('an exact legacy source URL can be updated with its known modern search-result ID', async () => {
    const f = fixture()
    const legacy = 'https://www.mangaupdates.com/series.html?id=33'
    const current = { label: 'MANGA_UPDATES', url: 'https://www.mangaupdates.com/series.html?id=55099564912' }
    f.series.metadata.links = [{ label: 'Old label', url: legacy }]
    await f.add('s1', current, legacy)
    assert.deepEqual(f.series.metadata.links, [{ ...current, label: 'Old label' }])
})

test('unknown legacy IDs are not silently reinterpreted or rewritten', async () => {
    const f = fixture()
    const legacy = { label: 'Unresolved old ID', url: 'https://www.mangaupdates.com/series.html?id=33' }
    f.series.metadata.links = [legacy]
    await f.add('s1', muLink, muSource)
    assert.deepEqual(f.series.metadata.links, [legacy, muLink])
})

test('adds only links, preserves existing metadata and uses page credentials without Komf auth', async () => {
    const f = fixture()
    assert.equal(await f.add('s1', newLink), true)
    assert.equal(f.calls[1].url, '/api/v1/series/s1/metadata')
    assert.deepEqual(JSON.parse(f.calls[1].body), { links: [oldLink, newLink] })
    assert.equal(f.series.metadata.title, 'Unchanged')
    assert.equal(f.series.metadata.linksLock, true)
    for (const call of f.calls) {
        assert.equal(call.credentials, 'include')
        assert.equal(call.headers?.Authorization, undefined)
    }
})

test('duplicate URL does not PATCH or change the existing label', async () => {
    const f = fixture()
    assert.equal(await f.add('s1', { ...oldLink, label: 'Another label' }), false)
    assert.equal(f.calls.length, 1)
    assert.deepEqual(f.series.metadata.links, [oldLink])
})

test('One-shot appends to both layers without copying unrelated links or changing metadata', async () => {
    const f = fixture({ oneshot: true })
    const bookOnly = { label: 'Book only', url: 'https://example.org/book-only' }
    f.book.metadata.links = [bookOnly]
    assert.equal(await f.add('s1', newLink), true)
    assert.deepEqual(f.book.metadata.links, [bookOnly, newLink])
    assert.deepEqual(f.book.metadata.tags, ['keep'])
    assert.equal(f.book.metadata.title, 'Book unchanged')
    assert.equal(f.book.metadata.linksLock, false)
    assert.deepEqual(f.series.metadata.links, [oldLink, newLink])
    assert.equal(f.series.metadata.linksLock, true)
    assert.equal(f.series.metadata.title, 'Unchanged')
    for (const call of f.calls) {
        assert.equal(call.credentials, 'include')
        assert.equal(call.headers?.Authorization, undefined)
        if (call.method === 'PATCH') assert.deepEqual(Object.keys(JSON.parse(call.body)), ['links'])
    }
})

test('successive additions re-read links, including different galleries from the same provider', async () => {
    const f = fixture()
    const another = { ...newLink, url: 'https://e-hentai.org/g/456/def/' }
    await f.add('s1', newLink)
    await f.add('s1', another)
    assert.deepEqual(f.series.metadata.links, [oldLink, newLink, another])
})

test('403 is an error, not success', async () => {
    const f = fixture({ patchStatus: 403 })
    await assert.rejects(f.add('s1', newLink), /403.*administrator/)
    assert.deepEqual(f.series.metadata.links, [oldLink])
})

test('failed metadata read never proceeds to PATCH', async () => {
    const f = fixture({ readStatus: 404 })
    await assert.rejects(f.add('s1', newLink), /404/)
    assert.equal(f.calls.length, 1)
})

test('One-shot retries fill the missing Series side without duplicating Book links', async () => {
    const statuses = { series: 500 }
    const f = fixture({ oneshot: true, patchStatuses: statuses })
    await assert.rejects(f.add('s1', newLink), /saved to Book.*Series update failed.*Retry.*500/)
    assert.deepEqual(f.book.metadata.links, [oldLink, newLink])
    assert.deepEqual(f.series.metadata.links, [oldLink])
    statuses.series = 204
    assert.equal(await f.add('s1', newLink), true)
    assert.deepEqual(f.book.metadata.links, [oldLink, newLink])
    assert.deepEqual(f.series.metadata.links, [oldLink, newLink])
    assert.equal(f.calls.filter(c => c.method === 'PATCH' && c.url.includes('/books/')).length, 1)
})

test('One-shot first-side failure stops before writing the other side', async () => {
    const f = fixture({ oneshot: true, patchStatuses: { book: 403 } })
    await assert.rejects(f.add('s1', newLink), /403/)
    assert.deepEqual(f.book.metadata.links, [oldLink])
    assert.deepEqual(f.series.metadata.links, [oldLink])
    assert.equal(f.calls.filter(c => c.method === 'PATCH' && c.url.includes('/series/')).length, 0)
})

test('One-shot Book read failure does not write either side', async () => {
    const f = fixture({ oneshot: true, bookReadStatus: 404 })
    await assert.rejects(f.add('s1', newLink), /404/)
    assert.equal(f.calls.filter(c => c.method === 'PATCH').length, 0)
})

for (const existingSide of ['book', 'series']) {
    test(`One-shot URL already on ${existingSide} is added only to the missing layer`, async () => {
        const f = fixture({ oneshot: true })
        const existing = { ...newLink, label: 'Keep my label' }
        f[existingSide].metadata.links.push(existing)
        assert.equal(await f.add('s1', newLink), true)
        assert.equal(f.calls.filter(c => c.method === 'PATCH').length, 1)
        assert.deepEqual(f[existingSide].metadata.links, [oldLink, existing])
        assert.deepEqual(f[existingSide === 'book' ? 'series' : 'book'].metadata.links, [oldLink, newLink])
    })
}

test('One-shot duplicate on both layers makes no writes and preserves both labels', async () => {
    const f = fixture({ oneshot: true })
    f.book.metadata.links = [{ ...newLink, label: 'Book label' }]
    f.series.metadata.links = [{ ...newLink, label: 'Series label' }]
    assert.equal(await f.add('s1', newLink), false)
    assert.equal(f.calls.filter(c => c.method === 'PATCH').length, 0)
    assert.equal(f.book.metadata.links[0].label, 'Book label')
    assert.equal(f.series.metadata.links[0].label, 'Series label')
})

test('One-shot repeated additions preserve both layers and distinct galleries of the same provider', async () => {
    const f = fixture({ oneshot: true })
    const another = { ...newLink, url: 'https://e-hentai.org/g/456/def/' }
    await f.add('s1', newLink)
    await f.add('s1', another)
    assert.deepEqual(f.series.metadata.links, [oldLink, newLink, another])
    assert.deepEqual(f.book.metadata.links, [oldLink, newLink, another])
    assert.equal(await f.add('s1', another), false)
})

test('One-shot with no book fails before any write', async () => {
    const f = fixture({ oneshot: true, bookCount: 0 })
    await assert.rejects(f.add('s1', newLink), /single book/)
    assert.equal(f.calls.filter(c => c.method === 'PATCH').length, 0)
})

test('ambiguous One-shot refuses to choose a book arbitrarily', async () => {
    const f = fixture({ oneshot: true, bookCount: 2 })
    await assert.rejects(f.add('s1', newLink), /single book/)
    assert.equal(f.calls.filter(call => call.method === 'PATCH').length, 0)
})
