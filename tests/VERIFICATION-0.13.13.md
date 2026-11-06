# 0.13.13 — One-Shot Add link writes both layers

## Behavior

- Ordinary series: unchanged, append only to Series metadata.links.
- One-Shot: resolve the unique Book before any writes; append to Book then Series, each using its own current links and deduplicating by exact URL. Existing labels are not replaced.
- Re-adding a URL present on just one layer repairs only the missing layer. No automatic migration or merging of unrelated existing links between layers.
- PATCH payloads contain only links; titles, tags and lock flags remain unchanged. Current-page credentials are used, not Komf authentication.
- Both targets must finish successfully before the existing inline success check. If the second PATCH fails, report partial success and permit retry. This is not a transaction; no rollback or concurrent-write protection is claimed.
- No UI layout, metadata provider logic, or Identify submission changes.

## Verification

- `npm test`: 39 passed. Cases cover both-layer writes, per-layer duplicates and labels, repeat additions, missing/ambiguous Book, read/first-write/second-write failure, and retry after partial success.
- `sh build.sh`: type-check and production packaging passed; `git diff --check`: passed.
- Real Komga 1.30.0 on loopback port 25603 with an independent cloned synthetic test database. Modified actual service executed against its HTTP API, not the NAS.
- Existing Book-only MAL link was repaired with just one Series PATCH (204), leaving Book links unchanged.
- New Bangumi test link produced Book and Series PATCHes, both 204. Real GETs returned both links; all non-link metadata except normal lastModified timestamps matched the original snapshots.
- Repeating the URL made no PATCH and did not relabel it.
- One Series PATCH 503 was deliberately injected while Book writes remained real: partial failure was reported; a retry issued only the missing Series PATCH and left exactly one copy on each side.
- Replayed the actual picker against the resulting real GET data: newly added/repaired URLs were now present in its choices.
- No new browser visual run; UI components were unchanged. This test did not invoke Komf Identify or a remote provider.
- Real HTTP captures and assertions: `/Users/openclaw/tmp/komf-dual-link-test/result.json`; executable reproduction: `test.cjs` in the same directory. Test service stopped after verification.
