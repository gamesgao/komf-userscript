import { defineStore } from 'pinia'
import type { Ref } from 'vue'
import { reactive, ref } from 'vue'
import type {
    BookMetadataConfigDto,
    BookMetadataConfigUpdateDto,
    AppriseConfigDto,
    AppriseConfigUpdateDto,
    DiscordConfigDto,
    DiscordConfigUpdateDto,
    EventListenerConfigDto,
    EventListenerConfigUpdateDto,
    KavitaConfigDto,
    KavitaConfigUpdateDto,
    KomfConfigDto,
    KomfConfigUpdateDto,
    KomgaConfigDto,
    KomgaConfigUpdateDto,
    MetadataPostProcessingConfigUpdateDto,
    MetadataProcessingConfigDto,
    MetadataProcessingConfigUpdateDto,
    MetadataProvidersConfigUpdateDto,
    MetadataUpdateConfigDto,
    MetadataUpdateConfigUpdateDto,
    NotificationConfigDto,
    NotificationConfigUpdateDto,
    ProviderConfigDto,
    ProviderConfigUpdateDto,
    ProvidersConfigDto,
    ProvidersConfigUpdateDto,
    SeriesMetadataConfigDto,
    SeriesMetadataConfigUpdateDto
} from '@/types/komf-config'
import { DefaultProviderConfig } from '@/types/komf-config'
import { useSettingsStore } from '@/stores/settings'
import MediaServer from '@/types/mediaServer'

const defaultSearchTitleExtraction = () => ({
    enabled: false,
    bracketRegex: null as string | null,
    authorSeparator: null as string | null,
    titleSplitters: [] as string[],
    symbolNormalizeRegex: "[:：•·․,，。'’?？!！~⁓～]" as string,
    charMappings: [] as string[][],
    cleanupRegex: [] as string[]
})

const defaultChineseConversion = () => ({
    enabled: false,
    direction: 't2s',
    search: true,
    matching: true,
    update: { enabled: true, fields: ['title'] as string[] }
})

export const useConfigUpdateStore = defineStore('settingsUpdate', () => {
    const settings = useSettingsStore()
    const libraries = ref([{ id: '', name: '' }])
    const currentConfig: Ref<KomfConfigDto | null> = ref(null)
    const providersWithBooks = ['mangaBaka', 'nautiljon', 'yenPress', 'kodansha', 'viz', 'bookWalker', 'mangaDex', 'bangumi', 'comicVine', 'webtoons']
    const providersWithMediaType = ['mangaBaka', 'mangaUpdates', 'mal', 'nautiljon', 'aniList', 'yenPress', 'bookWalker', 'bangumi', 'webtoons', 'eHentai']

    const notifications = reactive({
        webhooks: [
            {
                value: '' as string | null,
                existing: false
            }
        ],
        seriesCover: false,
        apprise: {
            urls: [
                {
                    value: '' as string | null,
                    existing: false
                }
            ],
            seriesCover: false
        }
    })

    const metadataProviders = reactive({
        malClientId: '',
        malClientIdDisabled: false,
        comicVineClientId: '',
        comicVineClientIdDisabled: false,
        bangumiToken: '',
        bangumiTokenDisabled: true,
        comicVineSearchLimit: null as number | null,
        comicVineIssueName: null as string | null,
        comicVineIdFormat: null as string | null,
        nameMatchingMode: 'CLOSEST_MATCH',
        defaultProviders: [{
            name: 'MangaUpdates',
            books: false,
            mediaTypeEnabled: false,
            ...new DefaultProviderConfig() as ProviderConfigDto
        }],

        defaultDisabledProviders: [{
            name: 'MangaUpdates',
            books: false,
            mediaTypeEnabled: false,
            ...new DefaultProviderConfig() as ProviderConfigDto
        }],
        libraryProviders: [{
            id: '123',
            name: '',
            deleted: false,
            providers: [{
                name: 'MangaUpdates',
                books: false,
                mediaTypeEnabled: false,
                ...new DefaultProviderConfig() as ProviderConfigDto
            }],
            disabledProviders: [{
                name: 'MangaUpdates',
                books: false,
                mediaTypeEnabled: false,
                ...new DefaultProviderConfig() as ProviderConfigDto
            }]
        }]
    })

    const processingDefaults = () => ({
        libraryType: 'MANGA',
        aggregateMetadata: false,
        mergeTags: false,
        mergeGenres: false,
        modes: ['API'],
        bookCovers: false,
        seriesCovers: false,
        overrideExistingCovers: true,
        lockCovers: true,
        overrideComicInfo: false,
        seriesTitle: false,
        seriesTitleLanguage: 'en',
        alternativeTitles: false,
        alternativeTitleLanguages: ['en', 'ja', 'ja-ro'],
        fallbackToAltTitle: false,
        orderBooks: false,
        readingDirectionValue: null as string | null,
        languageValue: null as string | null,
        scoreTagName: null as string | null,
        originalPublisherTagName: null as string | null,
        publisherTagNames: [] as { tagName: string, language: string }[],
        alternateTitleLabels: { romaji: null as string | null, native: null as string | null, localized: null as string | null },
        linksSkipEnabled: true,
        linksMatchEnabled: true,
        searchTitleExtraction: defaultSearchTitleExtraction(),
        failedMatchCollectionName: null as string | null,
        mylarCovers: false,
        mylarOutputDir: null as string | null,
        chineseConversion: defaultChineseConversion()
    })

    const komgaMetadata = reactive({
        default: processingDefaults() as ProcessingUpdateModel,
        library: [] as ProcessingLibraryUpdateModel[]
    })

    const komga = reactive({
        baseUri: 'http://localhost:8080',
        user: 'admin@example.org',
        password: '',
        passwordDisabled: true,
        apiKey: '',
        apiKeyDisabled: true,
        eventListener: {
            enabled: false,
            libraries: [] as { name: string | undefined, id: string }[] | null,
            metadataSeriesExcludeFilter: [] as any,
            notificationsLibraryFilter: [] as any
        }
    })

    const kavita = reactive({
        baseUri: 'http://localhost:5000',
        apiKey: '',
        eventListener: {
            enabled: false,
            libraries: [] as { name: string | undefined, id: string }[] | null,
            metadataSeriesExcludeFilter: [] as any,
            notificationsLibraryFilter: [] as any
        }
    })
    const kavitaMetadata = reactive({
        default: processingDefaults() as ProcessingUpdateModel,
        library: [] as ProcessingLibraryUpdateModel[]
    })

    function providerExtras(key: string, value: ProviderConfigDto) {
        return {
            ...(key === 'bangumi' && !value.archive ? { archive: { enabled: false, dir: null, updateIntervalHours: 168, idleReleaseSecs: 60, staffChineseNames: false } } : {}),
            ...(key === 'bangumi' && value.archive && value.archive.staffChineseNames == undefined ? { archive: { ...value.archive, staffChineseNames: false } } : {}),
            ...(key === 'eHentai' && !value.archive ? { archive: { enabled: false, url: null, dbFile: null, updateIntervalHours: 168, idleReleaseSecs: 60, searchCategoryFilter: [], searchUploaderFilter: [] } } : {}),
            ...((key === 'mangaBaka' || key === 'bookWalker') && value.updateIntervalHours == undefined ? { updateIntervalHours: 24 } : {}),
            ...(key === 'mangaBaka' && !value.coverLanguages ? { coverLanguages: ['en', 'ja'] } : {})
        }
    }

    function reset(config: KomfConfigDto) {
        libraries.value = getLibraries()
        currentConfig.value = structuredClone(config)

        notifications.webhooks = Object.entries(config.notifications.discord?.webhooks ?? {})
            .map(([, value]) => {
                return { value: value, existing: true }
            })
        notifications.seriesCover = config.notifications.discord?.seriesCover
        notifications.apprise.urls = Object.entries(config.notifications.apprise?.urls ?? {})
            .map(([, value]) => {
                return { value: value, existing: true }
            })
        notifications.apprise.seriesCover = config.notifications.apprise?.seriesCover

        metadataProviders.malClientId = config.metadataProviders.malClientId
        metadataProviders.malClientIdDisabled = config.metadataProviders.malClientId != ''
        metadataProviders.comicVineClientId = config.metadataProviders.comicVineClientId ?? ''
        metadataProviders.comicVineClientIdDisabled = config.metadataProviders.comicVineClientId != undefined
        metadataProviders.bangumiToken = config.metadataProviders.bangumiToken ?? ''
        metadataProviders.bangumiTokenDisabled = config.metadataProviders.bangumiToken != ''
        metadataProviders.comicVineSearchLimit = config.metadataProviders.comicVineSearchLimit ?? null
        metadataProviders.comicVineIssueName = config.metadataProviders.comicVineIssueName ?? null
        metadataProviders.comicVineIdFormat = config.metadataProviders.comicVineIdFormat ?? null
        metadataProviders.nameMatchingMode = config.metadataProviders.nameMatchingMode
        metadataProviders.defaultProviders = Object.entries(config.metadataProviders.defaultProviders)
            .sort((a, b) => a[1].priority - b[1].priority)
            .map(([key, value]) => {
                let books = providersWithBooks.includes(key)
                let mediaType = providersWithMediaType.includes(key)
                return { ...(value as ProviderConfigDto), name: key, books: books, mediaTypeEnabled: mediaType,
                    ...providerExtras(key, value) }
            }).filter(provider => provider.enabled)

        metadataProviders.defaultDisabledProviders = Object.entries(config.metadataProviders.defaultProviders)
            .map(([key, value]) => {
                let books = providersWithBooks.includes(key)
                let mediaType = providersWithMediaType.includes(key)
                return { ...(value as ProviderConfigDto), name: key, books: books, mediaTypeEnabled: mediaType,
                    ...providerExtras(key, value) }
            }).filter(provider => !provider.enabled)
            .sort((a, b) => a.name.localeCompare(b.name))

        metadataProviders.libraryProviders = Object.entries(config.metadataProviders.libraryProviders)
            .map(([key, value]) => {
                return {
                    id: key,
                    name: libraries.value.find(l => l.id == key)?.name ?? '',
                    deleted: false,
                    providers: Object.entries(value as ProvidersConfigDto)
                        .sort((a, b) => a[1].priority - b[1].priority)
                        .map(([key, value]) => {
                            let books = providersWithBooks.includes(key)
                            let mediaType = providersWithMediaType.includes(key)
                            return {
                                ...value as ProviderConfigDto,
                                name: key,
                                books: books,
                                mediaTypeEnabled: mediaType,
                                ...providerExtras(key, value)
                            }
                        }).filter(provider => provider.enabled),
                    disabledProviders: Object.entries(value as ProvidersConfigDto).map(([key, value]) => {
                        let books = providersWithBooks.includes(key)
                        let mediaType = providersWithMediaType.includes(key)
                        return { ...value as ProviderConfigDto, name: key, books: books, mediaTypeEnabled: mediaType,
                            ...providerExtras(key, value) }
                    }).filter(provider => !provider.enabled)
                        .sort((a, b) => a.name.localeCompare(b.name))
                }
            })

        komga.baseUri = config.komga.baseUri
        komga.user = config.komga.komgaUser
        komga.password = ''
        komga.passwordDisabled = true
        komga.apiKey = config.komga.apiKey ?? ''
        komga.apiKeyDisabled = config.komga.apiKey != undefined && config.komga.apiKey != ''
        komga.eventListener.enabled = config.komga.eventListener.enabled
        komga.eventListener.libraries = config.komga.eventListener.metadataLibraryFilter
            .map(id => {
                return {
                    name: libraries.value.find(library => library.id == id)?.name,
                    id: id
                }
            })
        komga.eventListener.metadataSeriesExcludeFilter = config.komga.eventListener.metadataSeriesExcludeFilter ?? []
        komga.eventListener.notificationsLibraryFilter = config.komga.eventListener.notificationsLibraryFilter ?? []

        applyProcessing(komgaMetadata.default, config.komga.metadataUpdate.default)
        komgaMetadata.library = Object.entries(config.komga.metadataUpdate.library)
            .map(([libraryId, libraryConfig]) => mapLibraryProcessing(libraryId, libraryConfig))

        kavita.baseUri = config.kavita.baseUri
        kavita.eventListener.enabled = config.kavita.eventListener.enabled
        kavita.eventListener.libraries = config.kavita.eventListener.metadataLibraryFilter
            .map(id => {
                return {
                    name: libraries.value.find(library => library.id == id)?.name,
                    id: id
                }
            })
        kavita.eventListener.metadataSeriesExcludeFilter = config.kavita.eventListener.metadataSeriesExcludeFilter ?? []
        kavita.eventListener.notificationsLibraryFilter = config.kavita.eventListener.notificationsLibraryFilter ?? []
        kavita.apiKey = ''

        applyProcessing(kavitaMetadata.default, config.kavita.metadataUpdate.default)
        kavitaMetadata.library = Object.entries(config.kavita.metadataUpdate.library)
            .map(([libraryId, libraryConfig]) => mapLibraryProcessing(libraryId, libraryConfig))
    }

    function applyProcessing(model: ProcessingUpdateModel, dto: MetadataProcessingConfigDto) {
        model.aggregateMetadata = dto.aggregate
        model.mergeTags = dto.mergeTags
        model.mergeGenres = dto.mergeGenres
        model.modes = dto.updateModes
        model.bookCovers = dto.bookCovers
        model.seriesCovers = dto.seriesCovers
        model.overrideExistingCovers = dto.overrideExistingCovers
        model.lockCovers = dto.lockCovers ?? true
        model.overrideComicInfo = dto.overrideComicInfo ?? false
        model.seriesTitle = dto.postProcessing.seriesTitle
        model.seriesTitleLanguage = dto.postProcessing.seriesTitleLanguage
        model.fallbackToAltTitle = dto.postProcessing.fallbackToAltTitle ?? false
        model.orderBooks = dto.postProcessing.orderBooks
        model.readingDirectionValue = dto.postProcessing.readingDirectionValue
        model.languageValue = dto.postProcessing.languageValue
        model.scoreTagName = dto.postProcessing.scoreTagName ?? null
        model.originalPublisherTagName = dto.postProcessing.originalPublisherTagName ?? null
        model.publisherTagNames = dto.postProcessing.publisherTagNames ?? []
        model.alternateTitleLabels = dto.postProcessing.alternateTitleLabels ?? { romaji: null, native: null, localized: null }
        model.linksSkipEnabled = dto.postProcessing.linksSkipEnabled ?? true
        model.linksMatchEnabled = dto.postProcessing.linksMatchEnabled ?? true

        model.alternativeTitles = dto.postProcessing.alternativeSeriesTitles
        model.alternativeTitleLanguages = dto.postProcessing.alternativeSeriesTitleLanguages
        model.searchTitleExtraction = dto.searchTitleExtraction ?? defaultSearchTitleExtraction()
        model.failedMatchCollectionName = dto.failedMatchCollectionName ?? null
        model.mylarCovers = dto.mylarCovers ?? false
        model.mylarOutputDir = dto.mylarOutputDir ?? null
        model.chineseConversion = dto.chineseConversion ?? defaultChineseConversion()
    }

    function mapLibraryProcessing(libraryId: string, dto: MetadataProcessingConfigDto): ProcessingLibraryUpdateModel {
        let model = processingDefaults() as ProcessingLibraryUpdateModel
        model.id = libraryId
        model.name = libraries.value.find(l => l.id == libraryId)?.name ?? ''
        model.deleted = false
        applyProcessing(model, dto)
        return model
    }

    function getUpdates() {
        let config = currentConfig.value
        if (!config) throw Error('uninitialized config')

        let changes: KomfConfigUpdateDto = {}
        changes.kavita = getKavitaUpdates(config.kavita)
        changes.komga = getKomgaUpdates(config.komga)
        changes.metadataProviders = getMetadataProvidersUpdates()
        const discordChanges = getDiscordUpdates(config.notifications.discord)
        const appriseChanges = getAppriseUpdates(config.notifications.apprise)
        if (discordChanges || appriseChanges) {
            changes.notifications = {}
            if (discordChanges) changes.notifications.discord = discordChanges
            if (appriseChanges) changes.notifications.apprise = appriseChanges
        }
        return changes
    }

    function getAppriseUpdates(currentConfig: AppriseConfigDto | undefined): AppriseConfigUpdateDto | undefined {
        let changes: AppriseConfigUpdateDto = {}
        if (notifications.apprise.seriesCover != currentConfig?.seriesCover)
            changes.seriesCover = notifications.apprise.seriesCover
        let currentUrls = Object.entries(currentConfig?.urls ?? {})
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([, value]) => value)

        let urlChanges = notifications.apprise.urls.map((obj, index) => {
            return [index, obj.value]
        }).filter(([index, value]) => !(index as number in currentUrls) || currentUrls[index as number] != value)
        if (Object.entries(urlChanges).filter(val => val[1] != undefined).length != 0)
            changes.urls = Object.fromEntries(urlChanges)

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getKomgaUpdates(current: KomgaConfigDto): KomgaConfigUpdateDto | undefined {
        let changes: KomgaConfigUpdateDto = {}
        if (komga.baseUri != current.baseUri)
            changes.baseUri = komga.baseUri
        if (komga.user != current.komgaUser)
            changes.komgaUser = komga.user
        if (!komga.passwordDisabled && komga.password != '')
            changes.komgaPassword = komga.password
        if (!komga.apiKeyDisabled && komga.apiKey != '')
            changes.apiKey = komga.apiKey

        let eventListenerPatch = {
            enabled: komga.eventListener.enabled,
            metadataLibraryFilter: komga.eventListener.libraries?.map(library => library.id) ?? [],
            metadataSeriesExcludeFilter: komga.eventListener.metadataSeriesExcludeFilter,
            notificationsLibraryFilter: komga.eventListener.notificationsLibraryFilter
        }
        changes.eventListener = getEventListenerUpdates(current.eventListener, eventListenerPatch)
        changes.metadataUpdate = getMetadataUpdates(current.metadataUpdate, komgaMetadata)

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getKavitaUpdates(current: KavitaConfigDto): KavitaConfigUpdateDto | undefined {
        let changes: KavitaConfigUpdateDto = {}
        if (kavita.baseUri != current.baseUri)
            changes.baseUri = kavita.baseUri
        if (kavita.apiKey)
            changes.apiKey = kavita.apiKey

        let eventListenerPatch = {
            enabled: kavita.eventListener.enabled,
            metadataLibraryFilter: kavita.eventListener.libraries?.map(library => library.id) ?? [],
            metadataSeriesExcludeFilter: kavita.eventListener.metadataSeriesExcludeFilter,
            notificationsLibraryFilter: kavita.eventListener.notificationsLibraryFilter
        }
        changes.eventListener = getEventListenerUpdates(current.eventListener, eventListenerPatch)
        changes.metadataUpdate = getMetadataUpdates(current.metadataUpdate, kavitaMetadata)

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getMetadataUpdates(
        current: MetadataUpdateConfigDto,
        patch: { default: ProcessingUpdateModel, library: ProcessingLibraryUpdateModel[] }
    ): MetadataUpdateConfigUpdateDto | undefined {
        let changes: MetadataUpdateConfigUpdateDto = {}
        changes.default = getMetadataProcessingUpdates(current.default, patch.default)
        changes.library = getLibraryMetadataUpdates(current.library, patch.library)

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function toArray(val: unknown): string[] {
        if (Array.isArray(val)) return val as string[]
        return String(val ?? '').split(',').map(s => s.trim()).filter(s => s !== '')
    }

    function getMetadataProcessingUpdates(
        current: MetadataProcessingConfigDto | undefined,
        patch: ProcessingUpdateModel
    ): MetadataProcessingConfigUpdateDto | undefined {
        let changes: MetadataProcessingConfigUpdateDto = {}
        if (patch.libraryType != current?.libraryType)
            changes.libraryType = patch.libraryType
        if (patch.aggregateMetadata != current?.aggregate)
            changes.aggregate = patch.aggregateMetadata
        if (patch.mergeTags != current?.mergeTags)
            changes.mergeTags = patch.mergeTags
        if (patch.mergeGenres != current?.mergeGenres)
            changes.mergeGenres = patch.mergeGenres
        if (patch.bookCovers != current?.bookCovers)
            changes.bookCovers = patch.bookCovers
        if (patch.seriesCovers != current?.seriesCovers)
            changes.seriesCovers = patch.seriesCovers
        if (patch.overrideExistingCovers != current?.overrideExistingCovers)
            changes.overrideExistingCovers = patch.overrideExistingCovers
        if (patch.lockCovers != current?.lockCovers)
            changes.lockCovers = patch.lockCovers
        if (patch.overrideComicInfo != current?.overrideComicInfo)
            changes.overrideComicInfo = patch.overrideComicInfo
        if (!patch.modes.every((v, i) => v === current?.updateModes[i]))
            changes.updateModes = patch.modes

        let postProcessingChanges: MetadataPostProcessingConfigUpdateDto | undefined = {}
        if (patch.seriesTitle != current?.postProcessing.seriesTitle)
            postProcessingChanges.seriesTitle = patch.seriesTitle
        if (patch.seriesTitleLanguage != current?.postProcessing.seriesTitleLanguage)
            postProcessingChanges.seriesTitleLanguage = patch.seriesTitleLanguage
        if (patch.alternativeTitles != current?.postProcessing.alternativeSeriesTitles)
            postProcessingChanges.alternativeSeriesTitles = patch.alternativeTitles
        if (!equalArrays(patch.alternativeTitleLanguages, current?.postProcessing.alternativeSeriesTitleLanguages ?? []))
            postProcessingChanges.alternativeSeriesTitleLanguages = patch.alternativeTitleLanguages
        if (patch.fallbackToAltTitle != current?.postProcessing.fallbackToAltTitle)
            postProcessingChanges.fallbackToAltTitle = patch.fallbackToAltTitle
        if (patch.orderBooks != current?.postProcessing.orderBooks)
            postProcessingChanges.orderBooks = patch.orderBooks
        if (patch.readingDirectionValue != current?.postProcessing.readingDirectionValue)
            postProcessingChanges.readingDirectionValue = patch.readingDirectionValue
        if (patch.languageValue != current?.postProcessing.languageValue)
            postProcessingChanges.languageValue = patch.languageValue
        if (patch.scoreTagName != current?.postProcessing.scoreTagName)
            postProcessingChanges.scoreTagName = patch.scoreTagName
        if (patch.originalPublisherTagName != current?.postProcessing.originalPublisherTagName)
            postProcessingChanges.originalPublisherTagName = patch.originalPublisherTagName
        if (JSON.stringify(patch.publisherTagNames ?? []) != JSON.stringify(current?.postProcessing.publisherTagNames ?? []))
            postProcessingChanges.publisherTagNames = patch.publisherTagNames
        if (JSON.stringify(patch.alternateTitleLabels) != JSON.stringify(current?.postProcessing.alternateTitleLabels))
            postProcessingChanges.alternateTitleLabels = patch.alternateTitleLabels
        if (patch.linksSkipEnabled != current?.postProcessing.linksSkipEnabled)
            postProcessingChanges.linksSkipEnabled = patch.linksSkipEnabled
        if (patch.linksMatchEnabled != current?.postProcessing.linksMatchEnabled)
            postProcessingChanges.linksMatchEnabled = patch.linksMatchEnabled
        if (Object.entries(postProcessingChanges).every(val => val[1] === undefined)) postProcessingChanges = undefined

        changes.postProcessing = postProcessingChanges

        let searchTitleExtractionChanges: NonNullable<MetadataProcessingConfigUpdateDto['searchTitleExtraction']> | undefined = {}
        let curSte = current?.searchTitleExtraction
        if (patch.searchTitleExtraction.enabled != curSte?.enabled)
            searchTitleExtractionChanges.enabled = patch.searchTitleExtraction.enabled
        if (patch.searchTitleExtraction.bracketRegex != curSte?.bracketRegex)
            searchTitleExtractionChanges.bracketRegex = patch.searchTitleExtraction.bracketRegex
        if (patch.searchTitleExtraction.authorSeparator != curSte?.authorSeparator)
            searchTitleExtractionChanges.authorSeparator = patch.searchTitleExtraction.authorSeparator
        let titleSplittersVal = toArray(patch.searchTitleExtraction.titleSplitters)
        if (!equalArrays(titleSplittersVal, curSte?.titleSplitters ?? []))
            searchTitleExtractionChanges.titleSplitters = titleSplittersVal
        if (patch.searchTitleExtraction.symbolNormalizeRegex != curSte?.symbolNormalizeRegex)
            searchTitleExtractionChanges.symbolNormalizeRegex = patch.searchTitleExtraction.symbolNormalizeRegex
        let charMappingsVal: unknown = patch.searchTitleExtraction.charMappings
        if (typeof charMappingsVal === 'string' && charMappingsVal.trim() !== '') {
            try { charMappingsVal = JSON.parse(charMappingsVal) } catch (e) { charMappingsVal = [] }
        }
        if (JSON.stringify(charMappingsVal) != JSON.stringify(curSte?.charMappings))
            searchTitleExtractionChanges.charMappings = charMappingsVal as string[][]
        let cleanupRegexVal = toArray(patch.searchTitleExtraction.cleanupRegex)
        if (!equalArrays(cleanupRegexVal, curSte?.cleanupRegex ?? []))
            searchTitleExtractionChanges.cleanupRegex = cleanupRegexVal
        if (Object.entries(searchTitleExtractionChanges).every(val => val[1] === undefined)) searchTitleExtractionChanges = undefined
        changes.searchTitleExtraction = searchTitleExtractionChanges

        if (patch.failedMatchCollectionName != current?.failedMatchCollectionName)
            changes.failedMatchCollectionName = patch.failedMatchCollectionName

        if (patch.mylarCovers != current?.mylarCovers)
            changes.mylarCovers = patch.mylarCovers
        if (patch.mylarOutputDir != current?.mylarOutputDir)
            changes.mylarOutputDir = patch.mylarOutputDir ?? null

        let chineseConversionChanges: NonNullable<MetadataProcessingConfigUpdateDto['chineseConversion']> | undefined = {}
        let curCc = current?.chineseConversion
        if (patch.chineseConversion.enabled != curCc?.enabled)
            chineseConversionChanges.enabled = patch.chineseConversion.enabled
        if (patch.chineseConversion.direction != curCc?.direction)
            chineseConversionChanges.direction = patch.chineseConversion.direction
        if (patch.chineseConversion.search != curCc?.search)
            chineseConversionChanges.search = patch.chineseConversion.search
        if (patch.chineseConversion.matching != curCc?.matching)
            chineseConversionChanges.matching = patch.chineseConversion.matching
        let ccUpdateChanges: { enabled?: boolean, fields?: string[] } = {}
        if (patch.chineseConversion.update.enabled != curCc?.update.enabled)
            ccUpdateChanges.enabled = patch.chineseConversion.update.enabled
        let ccFieldsVal = toArray(patch.chineseConversion.update.fields)
        if (!equalArrays(ccFieldsVal, curCc?.update.fields ?? []))
            ccUpdateChanges.fields = ccFieldsVal
        if (Object.entries(ccUpdateChanges).length != 0)
            chineseConversionChanges.update = ccUpdateChanges
        if (Object.entries(chineseConversionChanges).every(val => val[1] === undefined)) chineseConversionChanges = undefined
        changes.chineseConversion = chineseConversionChanges

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getLibraryMetadataUpdates(
        current: Record<string, MetadataProcessingConfigDto>,
        patch: ProcessingLibraryUpdateModel[]
    ): Record<string, MetadataProcessingConfigUpdateDto | null> | undefined {
        let currentLibrariesConfig = new Map(Object.entries(current ?? {}))
        let updatedLibraryProviders = patch
            .map(libraryConfig => {
                let config: MetadataProcessingConfigUpdateDto | null | undefined
                if (libraryConfig.deleted) config = null
                else config = getMetadataProcessingUpdates(currentLibrariesConfig.get(libraryConfig.id), libraryConfig)

                return [libraryConfig.id, config]
            })
            .filter(val => val[1] !== undefined)

        let changes = Object.fromEntries(updatedLibraryProviders)
        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getEventListenerUpdates(
        current: EventListenerConfigDto,
        patch: EventListenerConfigDto
    ): EventListenerConfigUpdateDto | undefined {
        let changes: EventListenerConfigUpdateDto = {}

        if (patch.enabled != current.enabled)
            changes.enabled = patch.enabled

        if (patch.metadataLibraryFilter.length == 0 && current.metadataLibraryFilter.length != 0) {
            changes.metadataLibraryFilter = []
        } else if (patch.metadataLibraryFilter.length != 0 && !patch.metadataLibraryFilter.every((v, i) => v === current.metadataLibraryFilter[i])) {
            changes.metadataLibraryFilter = patch.metadataLibraryFilter
        }

        let currentExclude = Array.isArray(current.metadataSeriesExcludeFilter) ? current.metadataSeriesExcludeFilter : []
        let excludeVal = toArray(patch.metadataSeriesExcludeFilter)
        if (!equalArrays(excludeVal, currentExclude))
            changes.metadataSeriesExcludeFilter = excludeVal
        let currentNotify = Array.isArray(current.notificationsLibraryFilter) ? current.notificationsLibraryFilter : []
        let notifyVal = toArray(patch.notificationsLibraryFilter)
        if (!equalArrays(notifyVal, currentNotify))
            changes.notificationsLibraryFilter = notifyVal

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }


    function getDiscordUpdates(currentConfig: DiscordConfigDto | undefined): DiscordConfigUpdateDto | undefined {
        let changes: DiscordConfigUpdateDto = {}
        if (notifications.seriesCover != currentConfig?.seriesCover)
            changes.seriesCover = notifications.seriesCover

        if (JSON.stringify(notifications.webhooks) != JSON.stringify(currentConfig?.webhooks)) {
            let oldEntries = Object.entries(currentConfig?.webhooks ?? {})
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([, value]) => value)


            let webhookChanges = notifications.webhooks.map((obj, index) => {
                return [index, obj.value]
            }).filter(([index, value]) => !(index as number in oldEntries) || oldEntries[index as number] != value)
            if (Object.entries(webhookChanges).filter(val => val[1] != undefined).length != 0)
                changes.webhooks = Object.fromEntries(webhookChanges)
        }

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getMetadataProvidersUpdates(): MetadataProvidersConfigUpdateDto | undefined {
        if (!currentConfig.value) throw Error('uninitialized config')
        let currentProvidersConfig = currentConfig.value?.metadataProviders
        let changes: MetadataProvidersConfigUpdateDto = {}
        if (!metadataProviders.malClientIdDisabled)
            changes.malClientId = metadataProviders.malClientId
        if (!metadataProviders.comicVineClientIdDisabled)
            changes.comicVineClientId = metadataProviders.comicVineClientId
        if (!metadataProviders.bangumiTokenDisabled && metadataProviders.bangumiToken != currentProvidersConfig?.bangumiToken)
            changes.bangumiToken = metadataProviders.bangumiToken
        if (metadataProviders.comicVineSearchLimit != currentProvidersConfig?.comicVineSearchLimit)
            changes.comicVineSearchLimit = metadataProviders.comicVineSearchLimit
        if (metadataProviders.comicVineIssueName != currentProvidersConfig?.comicVineIssueName)
            changes.comicVineIssueName = metadataProviders.comicVineIssueName
        if (metadataProviders.comicVineIdFormat != currentProvidersConfig?.comicVineIdFormat)
            changes.comicVineIdFormat = metadataProviders.comicVineIdFormat
        if (metadataProviders.nameMatchingMode != currentProvidersConfig?.nameMatchingMode)
            changes.nameMatchingMode = metadataProviders.nameMatchingMode

        metadataProviders.defaultProviders.forEach((provider, index) => provider.priority = index + 1)
        let updatedProviders = Object.fromEntries(
            metadataProviders.defaultProviders.concat(metadataProviders.defaultDisabledProviders)
                .map(obj => [obj.name, obj as ProviderConfigDto]))
        changes.defaultProviders = getProvidersUpdates(currentProvidersConfig?.defaultProviders, updatedProviders)


        changes.libraryProviders = getLibraryProvidersUpdates()

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getLibraryProvidersUpdates(): Record<string, ProvidersConfigUpdateDto> | undefined {
        let currentLibrariesConfig = new Map(Object.entries(currentConfig.value?.metadataProviders?.libraryProviders ?? {}))
        let updatedLibraryProviders = metadataProviders.libraryProviders
            .map(libraryConfig => {
                libraryConfig.providers.forEach((provider, index) => provider.priority = index + 1)

                let config: ProvidersConfigUpdateDto | null | undefined
                if (libraryConfig.deleted) config = null
                else config = getProvidersUpdates(
                    currentLibrariesConfig.get(libraryConfig.id),
                    Object.fromEntries(libraryConfig.providers.concat(libraryConfig.disabledProviders)
                        .map(provider => [provider.name, provider as ProviderConfigDto])))

                return [libraryConfig.id, config]
            })
            .filter(val => val[1] !== undefined)

        let changes = Object.fromEntries(updatedLibraryProviders)
        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getProvidersUpdates(
        current: ProvidersConfigDto | undefined,
        updated: { [p: string]: ProviderConfigDto }
    ): ProvidersConfigUpdateDto | undefined {
        let changes: ProvidersConfigUpdateDto = {}
        Object.entries(updated).forEach(([key, value]) => {
            switch (key) {
                case 'mangaUpdates':
                    changes.mangaUpdates = getProviderUpdates(current?.mangaUpdates, value)
                    break
                case 'mal':
                    changes.mal = getProviderUpdates(current?.mal, value)
                    break
                case 'nautiljon':
                    changes.nautiljon = getProviderUpdates(current?.nautiljon, value)
                    break
                case 'aniList':
                    changes.aniList = getAniListUpdates(current?.aniList, value)
                    break
                case 'yenPress':
                    changes.yenPress = getProviderUpdates(current?.yenPress, value)
                    break
                case 'kodansha':
                    changes.kodansha = getProviderUpdates(current?.kodansha, value)
                    break
                case 'mangaBaka':
                    changes.mangaBaka = getMangaBakaUpdates(current?.mangaBaka, value)
                    break
                case 'viz':
                    changes.viz = getProviderUpdates(current?.viz, value)
                    break
                case 'bookWalker':
                    changes.bookWalker = getBookWalkerUpdates(current?.bookWalker, value)
                    break
                case 'mangaDex':
                    changes.mangaDex = getMangaDexUpdates(current?.mangaDex, value)
                    break
                case 'bangumi':
                    changes.bangumi = getBangumiUpdates(current?.bangumi, value)
                    break
                case 'comicVine':
                    changes.comicVine = getProviderUpdates(current?.comicVine, value)
                    break
                case 'webtoons':
                    changes.webtoons = getProviderUpdates(current?.webtoons, value)
                    break
                case 'eHentai':
                    changes.eHentai = getEhentaiUpdates(current?.eHentai, value)
                    break
                default:
                    return undefined
            }
        })

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getProviderUpdates(
        current: ProviderConfigDto | undefined,
        updated: ProviderConfigDto
    ): ProviderConfigUpdateDto | undefined {
        let changes: ProviderConfigUpdateDto = {}
        if (updated.enabled != current?.enabled)
            changes.enabled = updated.enabled
        if (updated.priority != current?.priority)
            changes.priority = updated.priority
        if (updated.nameMatchingMode != current?.nameMatchingMode)
            changes.nameMatchingMode = updated.nameMatchingMode
        if (!equalArrays(updated.authorRoles, current?.authorRoles ?? []))
            changes.authorRoles = updated.authorRoles
        if (!equalArrays(updated.artistRoles, current?.artistRoles ?? []))
            changes.artistRoles = updated.artistRoles
        if (updated.mediaType != current?.mediaType)
            changes.mediaType = updated.mediaType
        changes.seriesMetadata = getSeriesMetadataUpdates(current?.seriesMetadata, updated.seriesMetadata)
        changes.bookMetadata = getBookMetadataUpdates(current?.bookMetadata, updated.bookMetadata)

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getMangaBakaUpdates(
        current: ProviderConfigDto | undefined,
        updated: ProviderConfigDto
    ): ProviderConfigUpdateDto | undefined {
        let changes = getProviderUpdates(current, updated) || {}
        if (updated.mode != current?.mode)
            changes.mode = updated.mode
        let coverLanguages = toArray(updated.coverLanguages)
        if (!equalArrays(coverLanguages, current?.coverLanguages ?? []))
            changes.coverLanguages = coverLanguages
        if (updated.updateIntervalHours != current?.updateIntervalHours)
            changes.updateIntervalHours = updated.updateIntervalHours

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getBookWalkerUpdates(
        current: ProviderConfigDto | undefined,
        updated: ProviderConfigDto
    ): ProviderConfigUpdateDto | undefined {
        let changes = getProviderUpdates(current, updated) || {}
        if (updated.updateIntervalHours != current?.updateIntervalHours)
            changes.updateIntervalHours = updated.updateIntervalHours

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getEhentaiUpdates(
        current: ProviderConfigDto | undefined,
        updated: ProviderConfigDto
    ): ProviderConfigUpdateDto | undefined {
        let changes = getProviderUpdates(current, updated) || {}
        let preferredLanguages = toArray(updated.preferredLanguages)
        if (!equalArrays(preferredLanguages, current?.preferredLanguages ?? []))
            changes.preferredLanguages = preferredLanguages
        if (updated.titlePriority != current?.titlePriority)
            changes.titlePriority = updated.titlePriority
        let translatorKeywords = toArray(updated.translatorKeywords)
        if (!equalArrays(translatorKeywords, current?.translatorKeywords ?? []))
            changes.translatorKeywords = translatorKeywords
        if (updated.maleOnlyTagsFile != current?.maleOnlyTagsFile)
            changes.maleOnlyTagsFile = updated.maleOnlyTagsFile
        if (updated.titleTemplate != current?.titleTemplate)
            changes.titleTemplate = updated.titleTemplate
        if (updated.tagTranslationEnabled != current?.tagTranslationEnabled)
            changes.tagTranslationEnabled = updated.tagTranslationEnabled
        if (updated.tagTranslationUrl != current?.tagTranslationUrl)
            changes.tagTranslationUrl = updated.tagTranslationUrl
        if (updated.gidOnlyMatch != current?.gidOnlyMatch)
            changes.gidOnlyMatch = updated.gidOnlyMatch

        // ehentai archive offline data source
        const curEArch = current?.archive as any
        const newEArch = updated.archive as any
        if (newEArch) {
            const archChanges: any = {}
            if (newEArch.enabled != curEArch?.enabled) archChanges.enabled = newEArch.enabled
            if (newEArch.url != curEArch?.url) archChanges.url = newEArch.url ?? null
            if (newEArch.dbFile != curEArch?.dbFile) archChanges.dbFile = newEArch.dbFile ?? null
            if (newEArch.updateIntervalHours != curEArch?.updateIntervalHours) archChanges.updateIntervalHours = newEArch.updateIntervalHours
            if (newEArch.idleReleaseSecs != curEArch?.idleReleaseSecs) archChanges.idleReleaseSecs = newEArch.idleReleaseSecs ?? null
            const catFilter = Array.isArray(newEArch.searchCategoryFilter) ? newEArch.searchCategoryFilter : []
            const curCatFilter = Array.isArray(curEArch?.searchCategoryFilter) ? curEArch.searchCategoryFilter : []
            if (JSON.stringify(catFilter) !== JSON.stringify(curCatFilter)) archChanges.searchCategoryFilter = catFilter
            const upFilter = Array.isArray(newEArch.searchUploaderFilter) ? newEArch.searchUploaderFilter : []
            const curUpFilter = Array.isArray(curEArch?.searchUploaderFilter) ? curEArch.searchUploaderFilter : []
            if (JSON.stringify(upFilter) !== JSON.stringify(curUpFilter)) archChanges.searchUploaderFilter = upFilter
            if (Object.keys(archChanges).length > 0) changes.archive = archChanges
        }

        if (updated.searchDomain != current?.searchDomain)
            changes.searchDomain = updated.searchDomain
        if (updated.ipbMemberId != current?.ipbMemberId)
            changes.ipbMemberId = updated.ipbMemberId
        if (updated.ipbPassHash != current?.ipbPassHash)
            changes.ipbPassHash = updated.ipbPassHash

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getAniListUpdates(
        current: ProviderConfigDto | undefined,
        updated: ProviderConfigDto
    ): ProviderConfigUpdateDto | undefined {
        let changes = getProviderUpdates(current, updated) || {}
        if (updated.tagsScoreThreshold != current?.tagsScoreThreshold)
            changes.tagsScoreThreshold = updated.tagsScoreThreshold
        if (updated.tagsSizeLimit != current?.tagsSizeLimit)
            changes.tagsSizeLimit = updated.tagsSizeLimit
        let titleLanguagePriority = toArray(updated.titleLanguagePriority)
        if (!equalArrays(titleLanguagePriority, current?.titleLanguagePriority ?? []))
            changes.titleLanguagePriority = titleLanguagePriority

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getMangaDexUpdates(
        current: ProviderConfigDto | undefined,
        updated: ProviderConfigDto
    ): ProviderConfigUpdateDto | undefined {
        let changes = getProviderUpdates(current, updated) || {}
        let coverLanguages = toArray(updated.coverLanguages)
        if (!equalArrays(coverLanguages, current?.coverLanguages ?? []))
            changes.coverLanguages = coverLanguages

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getBangumiUpdates(
        current: ProviderConfigDto | undefined,
        updated: ProviderConfigDto
    ): ProviderConfigUpdateDto | undefined {
        let changes = getProviderUpdates(current, updated) || {}
        let tagWhitelist = toArray(updated.tagWhitelist)
        if (!equalArrays(tagWhitelist, current?.tagWhitelist ?? []))
            changes.tagWhitelist = tagWhitelist
        if (updated.tagWhitelistFile != current?.tagWhitelistFile)
            changes.tagWhitelistFile = updated.tagWhitelistFile

        // bangumi archive offline data source
        const curArch = current?.archive as any
        const newArch = updated.archive as any
        if (newArch) {
            const archChanges: any = {}
            if (newArch.enabled != curArch?.enabled) archChanges.enabled = newArch.enabled
            if (newArch.dir != curArch?.dir) archChanges.dir = newArch.dir ?? null
            if (newArch.updateIntervalHours != curArch?.updateIntervalHours) archChanges.updateIntervalHours = newArch.updateIntervalHours
            if (newArch.idleReleaseSecs != curArch?.idleReleaseSecs) archChanges.idleReleaseSecs = newArch.idleReleaseSecs ?? null
            if (newArch.staffChineseNames != curArch?.staffChineseNames) archChanges.staffChineseNames = newArch.staffChineseNames
            if (Object.keys(archChanges).length > 0) changes.archive = archChanges
        }

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getSeriesMetadataUpdates(
        current: SeriesMetadataConfigDto | undefined,
        updated: SeriesMetadataConfigDto
    ): SeriesMetadataConfigUpdateDto | undefined {
        let changes: SeriesMetadataConfigUpdateDto = {}
        if (updated.status != current?.status)
            changes.status = updated.status
        if (updated.title != current?.title)
            changes.title = updated.title
        if (updated.alternativeTitles != current?.alternativeTitles)
            changes.alternativeTitles = updated.alternativeTitles
        if (updated.summary != current?.summary)
            changes.summary = updated.summary
        if (updated.publisher != current?.publisher)
            changes.publisher = updated.publisher
        if (updated.readingDirection != current?.readingDirection)
            changes.readingDirection = updated.readingDirection
        if (updated.ageRating != current?.ageRating)
            changes.ageRating = updated.ageRating
        if (updated.language != current?.language)
            changes.language = updated.language
        if (updated.genres != current?.genres)
            changes.genres = updated.genres
        if (updated.tags != current?.tags)
            changes.tags = updated.tags
        if (updated.totalBookCount != current?.totalBookCount)
            changes.totalBookCount = updated.totalBookCount
        if (updated.authors != current?.authors)
            changes.authors = updated.authors
        if (updated.releaseDate != current?.releaseDate)
            changes.releaseDate = updated.releaseDate
        if (updated.thumbnail != current?.thumbnail)
            changes.thumbnail = updated.thumbnail
        if (updated.books != current?.books)
            changes.books = updated.books
        if (updated.links != current?.links)
            changes.links = updated.links
        if (updated.useOriginalPublisher != current?.useOriginalPublisher)
            changes.useOriginalPublisher = updated.useOriginalPublisher
        if (updated.score != current?.score)
            changes.score = updated.score
        if (updated.originalPublisherTagName != current?.originalPublisherTagName)
            changes.originalPublisherTagName = updated.originalPublisherTagName
        if (updated.englishPublisherTagName != current?.englishPublisherTagName)
            changes.englishPublisherTagName = updated.englishPublisherTagName
        if (updated.frenchPublisherTagName != current?.frenchPublisherTagName)
            changes.frenchPublisherTagName = updated.frenchPublisherTagName

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getBookMetadataUpdates(
        current: BookMetadataConfigDto | undefined,
        updated: BookMetadataConfigDto
    ): BookMetadataConfigUpdateDto | undefined {
        let changes: BookMetadataConfigUpdateDto = {}

        if (updated.title != current?.title)
            changes.title = updated.title
        if (updated.summary != current?.summary)
            changes.summary = updated.summary
        if (updated.number != current?.number)
            changes.number = updated.number
        if (updated.releaseDate != current?.releaseDate)
            changes.releaseDate = updated.releaseDate
        if (updated.authors != current?.authors)
            changes.authors = updated.authors
        if (updated.tags != current?.tags)
            changes.tags = updated.tags
        if (updated.isbn != current?.isbn)
            changes.isbn = updated.isbn
        if (updated.links != current?.links)
            changes.links = updated.links
        if (updated.thumbnail != current?.thumbnail)
            changes.thumbnail = updated.thumbnail

        if (Object.entries(changes).every(val => val[1] === undefined)) return undefined
        else return changes
    }

    function getLibraries() {
        // Library lists must always come from the media server API — parsing
        // the host DOM is unreliable across web UIs (Komga is Vuetify).
        // Komga exposes GET /api/v1/libraries; results arrive asynchronously
        // and flow into the reactive `libraries` ref that the settings panels bind.
        if (settings.mediaServer == MediaServer.Komga) {
            fetch('/api/v1/libraries', { credentials: 'include' })
                .then((resp) => resp.ok ? resp.json() : Promise.reject(new Error('unauthorized')))
                .then((apiLibs) => {
                    if (Array.isArray(apiLibs) && apiLibs.length > 0) {
                        libraries.value = apiLibs.map((l: any) => ({ id: l.id, name: l.name }))
                    }
                })
                .catch(() => {})
            return []
        } else {
            // Kavita: API only — async fetch with the JWT from localStorage,
            // same shape as the Komga branch (DOM scraping removed).
            try {
                let jwt = ''
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i)!
                    const val = localStorage.getItem(key) || ''
                    // JWT looks like three base64 segments separated by dots
                    if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(val)) { jwt = val; break }
                    // Some versions store JSON with token field
                    try {
                        const parsed = JSON.parse(val)
                        if (parsed && typeof parsed.token === 'string' && /^eyJ/.test(parsed.token)) { jwt = parsed.token; break }
                        if (parsed && parsed.user && typeof parsed.user.token === 'string') { jwt = parsed.user.token; break }
                    } catch (_e) { /* not JSON */ }
                }
                if (jwt) {
                    fetch('/api/Library/libraries', {
                        headers: { 'Authorization': 'Bearer ' + jwt, 'Accept': 'application/json' }
                    })
                        .then((resp) => resp.ok ? resp.json() : Promise.reject(new Error('unauthorized')))
                        .then((apiLibs) => {
                            if (Array.isArray(apiLibs) && apiLibs.length > 0) {
                                libraries.value = apiLibs.map((l: any) => ({ id: String(l.id), name: l.name }))
                            }
                        })
                        .catch(() => {})
                    return []
                }
            } catch (e) { /* ignore API errors */ }
            return []
        }
    }
    function equalArrays(a1: any[], a2: any[]): boolean {
        return a1.length == a2.length && a1.every((elem, index) => elem == a2[index])
    }

    return {
        currentConfig,
        notifications,
        metadataProviders,
        komgaMetadata,
        kavitaMetadata,
        libraries,
        providersWithBooks,
        providersWithMediaType,
        kavita,
        komga,
        reset,
        getUpdates
    }
})

export interface ProcessingUpdateModel {
    libraryType: string,
    aggregateMetadata: boolean,
    mergeTags: boolean,
    mergeGenres: boolean,
    modes: string[],
    seriesTitle: boolean,
    seriesTitleLanguage: string,
    alternativeTitles: boolean,
    alternativeTitleLanguages: string[],
    bookCovers: boolean,
    seriesCovers: boolean,
    overrideExistingCovers: boolean,
    lockCovers: boolean,
    overrideComicInfo: boolean,
    fallbackToAltTitle: boolean,
    orderBooks: boolean,
    readingDirectionValue?: null | string,
    languageValue?: null | string,
    scoreTagName?: null | string,
    originalPublisherTagName?: null | string,
    publisherTagNames: any,
    alternateTitleLabels: { romaji: string | null, native: string | null, localized: string | null },
    linksSkipEnabled: boolean,
    linksMatchEnabled: boolean,
    searchTitleExtraction: {
        enabled: boolean,
        bracketRegex: string | null,
        authorSeparator: string | null,
        titleSplitters: any,
        symbolNormalizeRegex: string | null,
        charMappings: any,
        cleanupRegex: any
    },
    failedMatchCollectionName: string | null,
    mylarCovers: boolean,
    mylarOutputDir: string | null,
    chineseConversion: {
        enabled: boolean,
        direction: string,
        search: boolean,
        matching: boolean,
        update: { enabled: boolean, fields: any }
    }
}

export interface ProcessingLibraryUpdateModel extends ProcessingUpdateModel {
    id: string,
    name: string,
    deleted: boolean,
}
