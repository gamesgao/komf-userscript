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
    let target = `series/${encodeURIComponent(seriesId)}`
    const series = await (await request(target)).json()
    let metadata = series.metadata
    if (series.oneshot) {
        const books = await (await request(`${target}/books?unpaged=true`)).json()
        if (books.content.length !== 1) throw new Error('Could not resolve the single book for this One-shot.')
        const book = books.content[0]
        target = `books/${encodeURIComponent(book.id)}`
        metadata = book.metadata
    }

    const links: WebLink[] = metadata.links ?? []
    if (links.some(existing => existing.url === link.url)) return false
    await request(`${target}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: [...links, link] })
    })
    return true
}
