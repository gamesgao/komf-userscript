import axios, { type AxiosInstance } from 'axios'
import type { IdentifyRequest, MetadataJob, SearchResult } from '@/types/metadata'
import { useSettingsStore } from '@/stores/settings'
import MediaServer from '@/types/mediaServer'

export default class KomfMetadataService {
    private http: AxiosInstance
    private settings = useSettingsStore()

    constructor(http: AxiosInstance) {
        this.http = http
    }

    async searchSeries(seriesName: string, libraryId?: string, seriesId?: string): Promise<SearchResult[]> {
        try {
            return (
                await this.http.get(`${this.settings.komfUrl}/${this.settings.mediaServer}/search`, {
                    params: { name: seriesName, libraryId: libraryId, seriesId: seriesId },
                    paramsSerializer: { indexes: null }
                })
            ).data
        } catch (e: unknown) {
            let msg = 'Failed to retrieve search results'

            if (axios.isAxiosError(e)) {
                msg += `: ${e.response?.data?.message ?? e.message}`
            }
            throw new Error(msg)
        }
    }

    async identifySeries(request: IdentifyRequest): Promise<string> {
        let data
        try {
            data = (await this.http.post(
                `${this.settings.komfUrl}/api/${this.settings.mediaServer}/metadata/identify`, request
            )).data
        } catch (e) {
            let msg = 'Failed to identify series'
            if (axios.isAxiosError(e)) {
                msg += `: ${e.response?.data?.message ?? e.message}`
            }
            throw new Error(msg)
        }
        const jobId = data?.id ?? data?.jobId
        if (!jobId) throw new Error('Identify returned no job ID. Check job history before retrying.')
        return jobId
    }

    async getJob(jobId: string): Promise<MetadataJob> {
        try {
            return (await this.http.get(`${this.settings.komfUrl}/api/jobs/${encodeURIComponent(jobId)}`, {
                timeout: 10000
            })).data
        } catch (e) {
            let msg = 'Failed to check Identify status'
            if (axios.isAxiosError(e)) msg += `: ${e.response?.data?.message ?? e.message}`
            throw new Error(msg)
        }
    }

    async matchLibrary(libraryId: string) {
        try {
            await this.http.post(
                `${this.settings.komfUrl}/${this.settings.mediaServer}/match/library/${libraryId}`
            )
        } catch (e) {
            let msg = 'Failed to match library'
            if (axios.isAxiosError(e)) {
                if (e.response?.status == 409) msg += ': Scan is already in progress'
                else msg += `: ${e.message}`
            }
            throw new Error(msg)
        }
    }

    async matchSeries(libraryId: string, seriesId: string) {
        try {
            await this.http.post(
                `${this.settings.komfUrl}/${this.settings.mediaServer}/match/library/${libraryId}/series/${seriesId}`
            )
        } catch (e) {
            let msg = 'Failed to match series'
            if (axios.isAxiosError(e)) {
                msg += `: ${e.message}`
            }
            throw new Error(msg)
        }
    }

    async resetSeries(libraryId: string, seriesId: string) {
        try {
            await this.http.post(
                `${this.settings.komfUrl}/${this.settings.mediaServer}/reset/library/${libraryId}/series/${seriesId}`
            )
        } catch (e) {
            let msg = 'Failed to reset series'
            if (axios.isAxiosError(e)) {
                msg += `: ${e.message}`
            }
            throw new Error(msg)
        }
    }

    async resetLibrary(libraryId: string) {
        try {
            await this.http.post(
                `${this.settings.komfUrl}/${this.settings.mediaServer}/reset/library/${libraryId}`
            )
        } catch (e) {
            let msg = 'Failed to reset library'
            if (axios.isAxiosError(e)) {
                msg += `: ${e.message}`
            }
            throw new Error(msg)
        }
    }

    async checkConnection(url: string) {
        let data
        try {
            data = (await this.http.get(`${url}/${this.settings.mediaServer}/providers`)).data
        } catch (e) {
            let msg = 'Connection Failed'
            if (axios.isAxiosError(e)) {
                msg = e.response?.status == 401
                    ? 'Unauthorized: enter the komf auth key in Connection settings'
                    : e.message
            }
            throw new Error(msg)
        }

        if (!Array.isArray(data)) {
            throw new Error('Connection Failed')
        }
    }

    /**
     * Resolve the current series context (libraryId + title).
     *
     * Komga: prefer the library id from the URL when present
     * (`/libraries/:id/...`), otherwise fall back to the Komga API since
     * detail pages (`/series/:id`, `/oneshot/:id`) do not carry the library
     * id in the path. Kavita keeps the original DOM logic.
     */
    async resolveSeriesContext(seriesId: string): Promise<{ libraryId?: string, title?: string }> {
        if (this.settings.mediaServer == MediaServer.Kavita) {
            let pathTokens = window.location.pathname.split('/')
            const libraryId = pathTokens[pathTokens.findIndex(el => el == 'library') + 1]
            return {
                libraryId: libraryId,
                title: (document.querySelector('app-series-detail .info-container div h4 span') as HTMLElement)?.innerText
            }
        }

        const pathTokens = window.location.pathname.split('/')
        const libraryIdx = pathTokens.findIndex(el => el == 'libraries')
        if (libraryIdx > 0) {
            return { libraryId: pathTokens[libraryIdx + 1], title: this.seriesTitleFromDom() }
        }

        try {
            const resp = await fetch(`/api/v1/series/${seriesId}`, { credentials: 'include' })
            if (resp.ok) {
                const s = await resp.json()
                return {
                    libraryId: s.libraryId,
                    title: (s.metadata && s.metadata.title) || s.name
                }
            }
        } catch (_e) { /* fall back to DOM below */ }

        return { libraryId: undefined, title: this.seriesTitleFromDom() }
    }

    private seriesTitleFromDom(): string | undefined {
        return (
            document.querySelector('.v-main__wrap .v-toolbar__title span') ||
            document.querySelector('.v-main__wrap .container--fluid .container span.text-h6') ||
            document.querySelector('main h1')
        )?.textContent?.trim() || undefined
    }
}
