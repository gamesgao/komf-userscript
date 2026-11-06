export interface SearchResult {
    imageUrl: string,
    title: string,
    provider: string
    resultId: string,
    language?: string,
    mediaType?: string,
}

export interface IdentifyRequest {
    libraryId?: string,
    seriesId: string,
    provider: string,
    providerSeriesId: string,
}

export interface MetadataJob {
    id: string,
    status: 'RUNNING' | 'COMPLETED' | 'FAILED',
    message: string | null,
}
