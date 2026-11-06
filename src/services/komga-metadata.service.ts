interface WebLink {
    label: string,
    url: string,
}

// Use the Komga page session, not the Komf client/auth interceptor.
async function request(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(`/api/v1/${path}`, { credentials: 'include', ...init })
    if (!response.ok) {
        throw new Error(`Komga request failed (HTTP ${response.status}).${response.status === 403 ? ' An administrator account is required.' : ''}`)
    }
    return response
}

export async function addSeriesLink(seriesId: string, link: WebLink): Promise<boolean> {
    const seriesPath = `series/${encodeURIComponent(seriesId)}`
    const series = await (await request(seriesPath)).json()
    const targets: { path: string, label: string, links: WebLink[] }[] = [
        { path: seriesPath, label: 'Series', links: series.metadata.links ?? [] }
    ]
    if (series.oneshot) {
        const books = await (await request(`${seriesPath}/books?unpaged=true`)).json()
        if (books.content.length !== 1) throw new Error('Could not resolve the single book for this One-shot.')
        const book = books.content[0]
        // Resolve both layers before writing. Each keeps its own links and labels.
        targets.unshift({ path: `books/${encodeURIComponent(book.id)}`, label: 'Book', links: book.metadata.links ?? [] })
    }

    const saved: string[] = []
    for (const target of targets) {
        const links: WebLink[] = target.links
        if (links.some(existing => existing.url === link.url)) continue
        try {
            await request(`${target.path}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: [...links, link] })
            })
        } catch (error) {
            if (saved.length) {
                const detail = error instanceof Error ? error.message : String(error)
                throw new Error(`Link saved to ${saved.join(' and ')}, but ${target.label} update failed. Retry to finish. ${detail}`)
            }
            throw error
        }
        saved.push(target.label)
    }
    return saved.length > 0
}
