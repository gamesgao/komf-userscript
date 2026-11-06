<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" :persistent="loading" @keyup.enter="handleEnterKeyPress">
    <q-card class="q-dialog-plugin identify-dialog" :style="cardStyle">
      <q-card-section>

        <div class="text-h6 gt-xs q-pb-lg">
          <q-icon :name="settings.mediaServer === MediaServer.Komga?
           'mdi-pencil' :'fa fa-pen'"
          />
          Identify
        </div>

        <div v-if="errorMessage" class="text-negative q-pb-md" role="alert">{{ errorMessage }}</div>
        <div v-if="jobId" class="text-caption q-pb-md">Task {{ jobId }}. Closing this dialog does not cancel the server task.</div>

        <q-card flat v-if="search">

          <q-toolbar class="lt-sm" id="identify_toolbar">
            <q-btn flat icon="mdi-close" :disable="loading && !jobId" @click="onDialogCancel" />
            <q-toolbar-title>Identify</q-toolbar-title>
            <q-space />
            <q-btn color="secondary" :loading="loading" :disable="loading || form.title === ''" @click="searchSeries">
              Search
            </q-btn>
          </q-toolbar>


          <div class="col">
            <q-input class="q-pt-sm q-pb-sm" v-model="form.title" label="title" :disable="loading" filled />

            <div v-if="linksMatchEnabled && linkHits.length" class="text-caption q-pt-sm">
              Komf still prioritizes existing links. Disable linksMatchEnabled in Processing settings to force a new match.
            </div>
          </div>

          <q-card-actions align="right" class="gt-xs q-pt-lg q-pb-sm">
            <q-btn :disable="loading && !jobId" @click="onDialogCancel">Cancel</q-btn>
            <q-btn :loading="loading" :disable="loading || form.title === ''" color="secondary" @click="searchSeries">
              Search
            </q-btn>
          </q-card-actions>
        </q-card>

        <q-card flat v-if="!search && !results && linkHits.length > 0">
          <q-toolbar class="lt-sm">
            <q-btn flat icon="mdi-close" :disable="loading && !jobId" @click="onDialogCancel" />
            <q-toolbar-title>Identify</q-toolbar-title>
            <q-space />
            <q-btn color="secondary" :disable="loading || (!selectedLink && !aggregateMode)" :loading="loading && !addingLink" @click="dialogConfirm">{{ jobId ? 'Check status' : 'Confirm' }}</q-btn>
          </q-toolbar>
          <div class="q-pa-md">
            <q-btn flat :disable="loading || !!jobId" @click="startSearch">Search by title</q-btn>
            <div class="text-body2 q-pb-sm">Choose a series link:</div>
            <q-list bordered separator>
              <q-item
                v-if="linkHits.length > 1 && aggregateEnabled"
                clickable
                :disable="loading || !!jobId"
                :active="aggregateMode"
                @click="aggregateMode = true; selectedLink = null"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-layers" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Aggregate all providers</q-item-label>
                  <q-item-label caption>Use the server's aggregation settings for these provider links</q-item-label>
                </q-item-section>
              </q-item>
              <q-item
                v-for="(hit, i) in linkHits"
                :key="i"
                clickable
                :disable="loading || !!jobId"
                :active="!aggregateMode && selectedLink === hit"
                @click="aggregateMode = false; selectedLink = hit"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-link" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ hit.label }}</q-item-label>
                  <q-item-label caption>{{ hit.provider }} · {{ hit.providerSeriesId }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <q-card-actions align="right" class="gt-xs q-pt-lg q-pb-sm">
            <q-btn :disable="loading && !jobId" @click="onDialogCancel">Cancel</q-btn>
            <q-btn color="secondary" :disable="loading || (!selectedLink && !aggregateMode)" :loading="loading && !addingLink" @click="dialogConfirm">{{ jobId ? 'Check status' : 'Confirm' }}</q-btn>
          </q-card-actions>
        </q-card>

        <q-card flat v-if="results">

          <q-toolbar class="lt-sm">
            <q-btn flat icon="mdi-close" :disable="loading && !jobId" @click="onDialogCancel">
            </q-btn>
            <q-toolbar-title>Identify</q-toolbar-title>
            <q-space />
            <q-btn color="secondary" :disable="!selected || loading" :loading="loading && !addingLink" @click="dialogConfirm">{{ jobId ? 'Check status' : 'Confirm' }}</q-btn>
          </q-toolbar>

          <q-btn flat :disable="loading || !!jobId" @click="startSearch">Search again</q-btn>
          <q-btn v-if="settings.mediaServer === MediaServer.Komga" flat color="secondary"
                 :loading="addingLink" :disable="!selected || !selectedSourceUrl || loading || !!jobId"
                 @click="addLinkOnly">Add link only</q-btn>
          <div v-if="searchResults.length === 0" class="q-pa-md" role="status">
            No matches found. Try another title or check the enabled providers.
          </div>
          <div class="row">
            <div class="col-auto"
                 style="padding: 16px 16px 16px 16px;"
                 v-for="(item, index) in searchResults"
                 :key="index"
            >
              <identify-card :item="item" :selected="isResultSelected(item)" @on-select-result="selectResult" />
            </div>
          </div>
          <q-card-actions align="right" class="gt-xs q-pt-lg q-pb-sm" v-if="results">
            <q-btn flat :disable="loading && !jobId" @click="onDialogCancel">Cancel</q-btn>
            <q-btn color="secondary" :disable="!selected || loading" :loading="loading && !addingLink" @click="dialogConfirm">{{ jobId ? 'Check status' : 'Confirm' }}</q-btn>
          </q-card-actions>
        </q-card>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, reactive, ref } from 'vue'
import type { IdentifyRequest, SearchResult } from '@/types/metadata'
import IdentifyCard from '@/components/IdentifyCard.vue'
import type KomfMetadataService from '../services/komf-metadata.service'
import { komfConfigKey, komfMetadataKey } from '@/injection-keys'
import { useSettingsStore } from '@/stores/settings'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import MediaServer from '@/types/mediaServer'
import { getSourceUrl, parseProviderLink } from '@/providerLinks'
import { addSeriesLink } from '@/services/komga-metadata.service'

defineEmits([
    ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const metadataService = inject<KomfMetadataService>(
    komfMetadataKey
) as KomfMetadataService
const configService = inject(komfConfigKey)!

const props = defineProps({
    seriesTitle: {
        type: String
    }
})

const $q = useQuasar()
const settings = useSettingsStore()

// Pin the dialog size/theme inline: host CSS (Tailwind preflight or a stale
// injected copy) can defeat external rules — inline !important always wins.
// The dark palette follows the Quasar dark state (kept in sync by the host
// theme probe), so the panel is correct even if the [data-komf-theme] marker
// or the global override sheet failed to apply on this host.
const cardStyle = computed(() => {
  const dark = $q.dark.isActive
  return {
    maxWidth: '820px',
    width: '820px !important',
    ...(dark
      ? { background: '#131316 !important', color: '#f4f4f5 !important' }
      : {}),
  }
})

const search = ref(true)
const results = ref(false)
const loading = ref(false)
const addingLink = ref(false)
const errorMessage = ref('')
const initialized = ref(false)
const linksMatchEnabled = ref(false)
const aggregateEnabled = ref(false)
const selected = ref(false)
const form = reactive({ title: props.seriesTitle ?? '' })
const jobId = ref<string | null>(null)
let disposed = false
onBeforeUnmount(() => { disposed = true })
const searchResults = ref<SearchResult[]>([])
const selectedResult = ref<SearchResult>({} as SearchResult)
const selectedSourceUrl = computed(() => getSourceUrl(selectedResult.value.url))
const linkHits = ref<{ provider: string, providerSeriesId: string, label: string, url: string }[]>([])
const selectedLink = ref<{ provider: string, providerSeriesId: string, label: string, url: string } | null>(null)
const aggregateMode = ref(false)

const seriesId = computed(() => {
    let path = window.location.pathname.split('/')
    return path[path.findIndex(el => el == 'series' || el == 'oneshot') + 1]
})

const libraryId = ref<string | undefined>()

async function resolveLibraryId() {
    if (settings.mediaServer == MediaServer.Komga) {
        // Komga library pages carry the id in the URL
        const pathTokens = window.location.pathname.split('/')
        const libraryIdx = pathTokens.findIndex(el => el == 'libraries')
        if (libraryIdx > 0) {
            libraryId.value = pathTokens[libraryIdx + 1]
            return
        }
        // Detail pages (/series/:id, /oneshot/:id) don't; fetch it from the API
        try {
            const resp = await fetch(`/api/v1/series/${seriesId.value}`, { credentials: 'include' })
            if (resp.ok) {
                const s = await resp.json()
                libraryId.value = s.libraryId
            }
        } catch (_e) { /* optional */ }
    } else {
        const pathTokens = window.location.pathname.split('/')
        if (pathTokens[1] == 'library') {
            libraryId.value = pathTokens[2]
        }
    }
}

async function initialize() {
    loading.value = true
    errorMessage.value = ''
    try {
        await resolveLibraryId()
        const config = await configService.getConfig()
        const update = settings.mediaServer === MediaServer.Kavita
            ? config.kavita.metadataUpdate : config.komga.metadataUpdate
        const processing = (libraryId.value && update.library[libraryId.value]) || update.default
        linksMatchEnabled.value = processing.postProcessing.linksMatchEnabled ?? true
        aggregateEnabled.value = processing.aggregate
        await fetchProviderLink()
        initialized.value = true
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e)
    } finally {
        loading.value = false
    }
}

async function dialogConfirm() {
    if (loading.value) return
    loading.value = true
    errorMessage.value = ''
    try {
        if (!jobId.value) jobId.value = await editMetadata()
        const deadline = Date.now() + 5 * 60 * 1000
        while (!disposed && Date.now() < deadline) {
            const job = await metadataService.getJob(jobId.value)
            if (disposed) return
            if (job.status === 'COMPLETED') {
                $q.notify({ message: 'Metadata updated', color: 'positive', timeout: 3000 })
                onDialogOK()
                return
            }
            if (job.status === 'FAILED') {
                jobId.value = null
                throw new Error(job.message || 'Identify failed')
            }
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
        if (!disposed) throw new Error('Task is still running. Check status again; no new task will be submitted.')
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e)
    } finally {
        loading.value = false
    }
}

async function searchSeries() {
    if (loading.value) return
    if (!initialized.value) {
        await initialize()
        if (!initialized.value) return
    }
    loading.value = true
    errorMessage.value = ''
    try {
        searchResults.value = await metadataService.searchSeries(form.title, libraryId.value, seriesId.value)
        selected.value = false
        results.value = true
        search.value = false

    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e)
    } finally {
        loading.value = false
    }
}

function startSearch() {
    search.value = true
    results.value = false
    selected.value = false
    errorMessage.value = ''
}

async function addLinkOnly() {
    if (loading.value || jobId.value || !selectedSourceUrl.value || !seriesId.value) return
    loading.value = true
    addingLink.value = true
    errorMessage.value = ''
    try {
        const added = await addSeriesLink(seriesId.value, {
            label: selectedResult.value.provider,
            url: selectedSourceUrl.value
        })
        $q.notify({ message: added ? 'Link added to Komga' : 'Link already exists in Komga', color: 'positive', timeout: 3000 })
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e)
    } finally {
        addingLink.value = false
        loading.value = false
    }
}

async function editMetadata() {
    if (!seriesId.value) throw new Error('Could not resolve series id')
    // aggregateMode 时服务端自动用所有 links（受 aggregateMetadata 控制），
    // 这里传第一个命中作为 fallback provider
    const info = results.value ? null : aggregateMode.value ? linkHits.value[0] : selectedLink.value
    const request: IdentifyRequest = {
        libraryId: libraryId.value,
        seriesId: seriesId.value,
        provider: info ? info.provider : selectedResult.value.provider,
        providerSeriesId: info ? info.providerSeriesId : selectedResult.value.resultId
    }

    return metadataService.identifySeries(request)
}

function selectResult(searchResult: SearchResult) {
    if (loading.value || jobId.value) return
    selectedResult.value = searchResult
    selected.value = true
}

function isResultSelected(item: SearchResult): boolean {
    return selectedResult.value === item
}

function handleEnterKeyPress() {
    if (search.value && !loading.value && form.title) {
        searchSeries()
    }
}

async function fetchProviderLink() {
    if (settings.mediaServer == MediaServer.Komga && seriesId.value && linksMatchEnabled.value) {
        try {
            const resp = await fetch(`/api/v1/series/${seriesId.value}`, { credentials: 'include' })
            let allLinks: { label?: string, url?: string }[] = []
            let isOneshotSeries = false
            if (resp.ok) {
                const s = await resp.json()
                allLinks = (s.metadata && s.metadata.links) || []
                isOneshotSeries = !!s.oneshot
            }
            // oneshot 且 series metadata 无 links → 读 book-level links
            if (allLinks.length === 0 && isOneshotSeries) {
                try {
                    const booksResp = await fetch(`/api/v1/series/${seriesId.value}/books?unpaged=true`, { credentials: 'include' })
                    if (booksResp.ok) {
                        const booksData = await booksResp.json()
                        const books = booksData.content || booksData || []
                        for (const b of books) {
                            const bl = (b.metadata && b.metadata.links) || []
                            allLinks = allLinks.concat(bl)
                        }
                    }
                } catch (_e) { /* optional */ }
            }
            const hits = allLinks.map(parseProviderLink).filter(Boolean) as { provider: string, providerSeriesId: string, label: string, url: string }[]
            if (hits.length > 0) {
                linkHits.value = hits
                selectedLink.value = hits[0]
                search.value = false
            }
        } catch (e) {
            console.error('[komf-userscript] fetchProviderLink error:', e)
        }
    }
}

initialize()
</script>

<style scoped lang="scss">
@import '../styles/scoped.scss';
</style>
