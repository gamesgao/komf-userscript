# 0.13.14 — Normalize Link-only URLs

## Scope and design

Only the candidate-card `+ / Add link only` action changes. It remains a Komga Links-only write, not an Identify, automatic library migration, or backend patch.

- MangaUpdates: save `https://www.mangaupdates.com/series.html?id=<resultId>`, using the decimal **modern API ID in the search result**. Do not infer the ID from an old `series.html?id=33` website URL. Preserve the ID string without floating-point conversion.
- MangaBaka: save `https://mangabaka.org/<resultId>`, its working short redirect URL.
- Provider-name navigation keeps the original response URL. Other providers keep their existing URLs. Missing/unsafe URLs still have no action; nonnumeric IDs do not trigger this normalization.
- If the selected work already has a modern MU URL or a MangaBaka long URL, replace that equivalent URL in place instead of appending after it. komf-rs otherwise selects the first link per provider and can keep reading the broken MU variant.
- Deduplicate equivalent URLs for this selected work, preserving the first existing label and position. Keep unrelated links and different works from the same provider. Do not guess mappings for unresolved old MU IDs.
- Keep 0.13.13's One-shot behavior: each of the Book and Series layers retains its own links/labels, and both layers are updated. Retain the existing partial-failure/retry handling.

## Automated verification

- Baseline: all 39 existing tests passed.
- Added regression tests failed before implementation (missing normalization helpers).
- Final `npm test`: **51 passed, 0 failed**.
- `npm run build`: TypeScript checks and Vite production build passed.
- Coverage: original provider navigation, modern result-ID precedence, legacy-ID distinction, large integer strings, MU alias replacement and duplicate suppression, MangaBaka long/short forms, unchanged other providers, One-shot independent labels/fields, unresolved legacy IDs, existing HTTP failure/retry cases.

## Real browser / server verification

Environment: real Komga 1.30.0 and komf-rs 1.14.5, isolated config/database/generated-CBZ library. No NAS access or production credentials. Final services bound to 127.0.0.1:25601 and :18096. The unchanged built userscript bundle was loaded into the real Komga dashboard as a script module, then exercised via the actual candidate cards; no provider/API responses were mocked. This does not test Tampermonkey installation itself.

The local test harness initially omitted the Komf bind/port settings, detected the wrong listener, stopped that process, and restarted with explicit loopback environment settings; lsof then verified both listener addresses. An AniList config-key typo (`anilist` rather than `aniList`) was corrected before the final multi-provider test. These were isolated harness configuration errors, not product code changes.

Verified checks:
1. Ordinary series: clicking MU `+` replaces an existing base36 alias with the decimal query URL, preserving its label and other Links.
2. Title, tags, summary and other metadata stay unchanged during Link-only.
3. Repeated `+` makes no additional PATCH.
4. Provider anchor still points to the original canonical page; selecting another card remains unchanged when adding MU.
5. Link-only makes no Identify request.
6. One-shot: both Book and Series aliases become the compatibility URL, each keeping its own label and unrelated metadata; repeated click makes no PATCH.
7. AniList `+` continues to save its original URL on both layers.
8. Selecting Aggregate all after the saves completes a real komf-rs job. Backend logs show `using link from MANGA_UPDATES` and `merging link metadata from ANILIST`, with no `invalid MangaUpdates` error. Komga contains both source links and **18 tags**.
9. Backend writes its canonical MU base36 URL back. Clicking the MU `+` again replaces it on both layers, without duplicating Links or altering the 18 tags.

Browser request/check evidence and metadata snapshots are in `/Users/openclaw/tmp/komf-userscript-0.13.14-e2e/`. Release asset is verified against the exact browser-tested bundle by SHA-256.

## Known boundaries

- komf-rs 1.14.5 still writes its canonical MU URL after Identify. This release intentionally does not rewrite backend results automatically; another explicit MU `+` restores the compatibility URL before a subsequent aggregation.
- MangaBaka short URL normalization does **not** make its missing backend Links aggregation branch exist. Its URL helper is regression-tested; this run's live aggregation used MU and AniList only.
- Unknown old numeric MU IDs are not resolved or bulk-migrated. Existing same-provider links for different works retain their ordering, and komf-rs still chooses only one per provider.
- No title/cover/tag changes are made by Link-only; the separate, explicitly invoked Identify remains responsible for metadata changes.
