const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { runInNewContext } = require('node:vm')
const ts = require('typescript')

const source = readFileSync(join(__dirname, '../src/services/komf-metadata.service.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
})
const settings = { komfUrl: 'http://fixture.invalid', mediaServer: 'komga' }
const context = {
    exports: {},
    require: name => {
        if (name === '@/stores/settings') return { useSettingsStore: () => settings }
        if (name === '@/types/mediaServer') return { default: { Komga: 'komga', Kavita: 'kavita' } }
        return require(name)
    }
}
runInNewContext(compiled.outputText, context)
const Service = context.exports.default
const request = { libraryId: 'lib', seriesId: 'series', provider: 'ANILIST', providerSeriesId: '123' }

for (const field of ['id', 'jobId']) {
    test(`async Identify accepts ${field}`, async () => {
        let calls = 0
        const service = new Service({ post: async (url, body) => {
            calls++
            assert.equal(url, 'http://fixture.invalid/api/komga/metadata/identify')
            assert.equal(body, request)
            return { data: { [field]: 'test-job' } }
        } })
        assert.equal(await service.identifySeries(request), 'test-job')
        assert.equal(calls, 1)
    })
}

test('missing job ID is not treated as successful completion', async () => {
    const service = new Service({ post: async () => ({ data: {} }) })
    await assert.rejects(service.identifySeries(request), /no job ID/)
})

test('polls the single-job API and preserves FAILED details', async () => {
    const job = { id: 'test-job', status: 'FAILED', message: 'Provider request failed' }
    const service = new Service({ get: async (url, options) => {
        assert.equal(url, 'http://fixture.invalid/api/jobs/test-job')
        assert.equal(options.timeout, 10000)
        return { data: job }
    } })
    assert.equal(await service.getJob('test-job'), job)
})

test('Identify exposes backend error text', async () => {
    const service = new Service({ post: async () => {
        throw { isAxiosError: true, message: 'HTTP 400', response: { data: { message: 'unknown provider fixture' } } }
    } })
    await assert.rejects(service.identifySeries(request), /unknown provider fixture/)
})

test('search exposes backend error text', async () => {
    const service = new Service({ get: async () => {
        throw { isAxiosError: true, message: 'HTTP 502', response: { data: { message: 'Search unavailable' } } }
    } })
    await assert.rejects(service.searchSeries('fixture'), /Search unavailable/)
})
