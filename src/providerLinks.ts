/// <reference lib="es2020.bigint" />

import type { SearchResult } from '@/types/metadata'

function base36Id(id: string): string {
    return [...id.toLowerCase()]
        .reduce((value, char) => value * BigInt(36) + BigInt(parseInt(char, 36)), BigInt(0)).toString()
}

// Storage-only compatibility URLs. Provider navigation keeps the original URL.
export function getLinkToSave(item: Pick<SearchResult, 'provider' | 'resultId' | 'url'>): string | undefined {
    const url = getSourceUrl(item.url)
    if (!url || !/^\d+$/.test(item.resultId)) return url
    if (item.provider === 'MANGA_UPDATES') return `https://www.mangaupdates.com/series.html?id=${item.resultId}`
    if (item.provider === 'MANGA_BAKA') return `https://mangabaka.org/${item.resultId}`
    return url
}

// Compare aliases of the selected work; never guess a legacy MU ID mapping.
export function normalizeStoredLink(url: string): string {
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url
        const host = parsed.hostname.replace(/^www\./, '')
        if (host === 'mangaupdates.com') {
            const pathId = parsed.pathname.match(/^\/series\/([a-z0-9]+)(?:\/|$)/i)?.[1]
            if (pathId) return `https://www.mangaupdates.com/series.html?id=${base36Id(pathId)}`
            const id = parsed.searchParams.get('id')
            if (parsed.pathname === '/series.html' && id && /^\d+$/.test(id)) {
                return `https://www.mangaupdates.com/series.html?id=${id}`
            }
        }
        if (host === 'mangabaka.org') {
            const id = parsed.pathname.match(/^\/(?:manga\/)?(\d+)(?:\/|$)/)?.[1]
            if (id) return `https://mangabaka.org/${id}`
        }
    } catch (_e) { /* leave unrecognized existing links untouched */ }
    return url
}

export function getSourceUrl(url?: string | null): string | undefined {
    if (!url) return
    try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return url
    } catch (_e) { /* no usable source URL */ }
}

export function parseProviderLink(link: { url?: string, label?: string }) {
    const url = link.url || ''
    const lowerUrl = url.toLowerCase()
    const label = link.label || ''
    if ((lowerUrl.includes('bgm.tv') || lowerUrl.includes('bangumi.tv')) && lowerUrl.includes('/subject/')) {
        const m = url.match(/\/subject\/([^/?#]+)/)
        if (m) return { provider: 'BANGUMI', providerSeriesId: m[1], label, url }
    }
    if (lowerUrl.includes('e-hentai.org') || lowerUrl.includes('exhentai.org')) {
        const m = url.match(/\/g\/([^/?#]+)\/([^/?#]+)/)
        if (m) return { provider: 'EHENTAI', providerSeriesId: m[1] + ';' + m[2], label, url }
    }
    if (lowerUrl.includes('anilist.co')) {
        const m = url.match(/\/(anime|manga)\/(\d+)/)
        if (m) return { provider: 'ANILIST', providerSeriesId: m[2], label, url }
    }
    if (lowerUrl.includes('myanimelist.net')) {
        const m = url.match(/\/(anime|manga)\/(\d+)/)
        if (m) return { provider: 'MAL', providerSeriesId: m[2], label, url }
    }
    if (lowerUrl.includes('mangadex.org')) {
        const m = url.match(/\/title\/([^/?#]+)/)
        if (m) return { provider: 'MANGADEX', providerSeriesId: m[1], label, url }
    }
    if (lowerUrl.includes('mangaupdates.com')) {
        const m = url.match(/\/series\/([a-z0-9]+)(?:[/?#]|$)/i) || url.match(/series\.html\?id=(\d+)/)
        if (m) {
            // Public series URLs use base-36 IDs; the provider API uses decimal IDs.
            const id = /^\d+$/.test(m[1]) ? m[1] : base36Id(m[1])
            return { provider: 'MANGA_UPDATES', providerSeriesId: id, label, url }
        }
    }
    return null
}
