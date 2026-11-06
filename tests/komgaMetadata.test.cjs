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
const oldLink = { label: 'Existing', url: 'https://example.org/existing' }
const newLink = { label: 'EHENTAI', url: 'https://e-hentai.org/g/123/abc/' }

function fixture({ oneshot = false, patchStatus = 204, readStatus = 200, bookCount = 1 } = {}) {
    const series = { id: 's1', oneshot, metadata: { links: [oldLink], title: 'Unchanged', linksLock: true } }
    const book = { id: 'b1', metadata: { links: [oldLink], title: 'Book unchanged', tags: ['keep'], linksLock: false } }
    const calls = []
    const context = { exports: {}, fetch: async (url, init) => {
        calls.push({ url, ...init })
        if (init.method === 'PATCH') {
            if (patchStatus === 204) {
                Object.assign(url.includes('/books/') ? book.metadata : series.metadata, JSON.parse(init.body))
            }
            return { ok: patchStatus === 204, status: patchStatus }
        }
        return {
            ok: readStatus === 200, status: readStatus,
            json: async () => structuredClone(url.includes('/books?') ? { content: Array(bookCount).fill(book) } : series)
        }
    } }
    runInNewContext(compiled.outputText, context)
    return { add: context.exports.addSeriesLink, calls, series, book }
}

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

test('One-shot writes book links, not series links', async () => {
    const f = fixture({ oneshot: true })
    assert.equal(await f.add('s1', newLink), true)
    assert.equal(f.calls[2].url, '/api/v1/books/b1/metadata')
    assert.deepEqual(f.book.metadata.links, [oldLink, newLink])
    assert.deepEqual(f.book.metadata.tags, ['keep'])
    assert.equal(f.book.metadata.title, 'Book unchanged')
    assert.equal(f.book.metadata.linksLock, false)
    assert.deepEqual(f.series.metadata.links, [oldLink])
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

test('ambiguous One-shot refuses to choose a book arbitrarily', async () => {
    const f = fixture({ oneshot: true, bookCount: 2 })
    await assert.rejects(f.add('s1', newLink), /single book/)
    assert.equal(f.calls.filter(call => call.method === 'PATCH').length, 0)
})
