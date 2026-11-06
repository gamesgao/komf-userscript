const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createSSRApp, h } = require('vue')
const { renderToString } = require('@vue/server-renderer')

const filename = path.resolve(__dirname, '../src/components/ActionFeedback.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const compiled = compileScript(descriptor, { id: 'feedback-test', inlineTemplate: true })
const js = ts.transpileModule(compiled.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText
const context = { exports: {}, require }
vm.runInNewContext(js, context)
const component = context.exports.default

async function render(props) {
  const app = createSSRApp(component, props)
  app.component('q-spinner', { render: () => h('span', { 'data-pending-spinner': 'true' }) })
  return renderToString(app)
}

test('pending feedback renders the spinner, not a success check', async () => {
  const html = await render({ success: false })
  assert.match(html, /data-pending-spinner/)
  assert.doesNotMatch(html, /komf-action-success/)
})

test('completed feedback replaces the spinner with an accessible SVG check', async () => {
  const html = await render({ success: true, label: 'Metadata updated' })
  assert.match(html, /<svg/)
  assert.match(html, /class="komf-action-success"/)
  assert.match(html, /aria-label="Metadata updated"/)
  assert.doesNotMatch(html, /data-pending-spinner/)
  assert.doesNotMatch(html, />Metadata updated</)
})

test('link-only feedback uses its own accessible label without visible helper text', async () => {
  const html = await render({ success: true, label: 'Link saved' })
  assert.match(html, /aria-label="Link saved"/)
  assert.doesNotMatch(html, />Link saved</)
})
