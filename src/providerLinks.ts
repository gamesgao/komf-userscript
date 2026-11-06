/// <reference lib="es2020.bigint" />

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
            const id = /^\d+$/.test(m[1]) ? m[1] : [...m[1].toLowerCase()]
                .reduce((id, char) => id * BigInt(36) + BigInt(parseInt(char, 36)), BigInt(0)).toString()
            return { provider: 'MANGA_UPDATES', providerSeriesId: id, label, url }
        }
    }
    return null
}
