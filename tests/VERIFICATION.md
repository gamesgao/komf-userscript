# 0.13.8 verification

## Automated checks

- `npm ci`: installed the existing lockfile without upgrading dependencies.
- `npm test`: 19 tests passed (provider IDs/URL parsing, MangaUpdates ID conversion, async `id`/`jobId`, missing task ID, status and error handling).
- `sh build.sh`: Vue type check and production build passed; produced `komf.user.js`.
- `git diff --check`: passed.

## Browser checks

The production userscript bundle was executed in a local Komga-like page with synthetic HTTP fixtures. It was loaded as a module to isolate top-level bundle names, as a userscript manager normally does. No real library was used.

Verified through DOM assertions and recorded requests:

- Komga `linksMatchEnabled=false` is not overwritten by Kavita=true or an unrelated library override.
- Current-library overrides work in both directions.
- Search shows readable waiting text and a progress bar; the button is disabled, not blank. Also visually checked a screenshot.
- Results render; an empty response shows an explanation and a Search again action.
- Search failure leaves an inline backend message and permits retry.
- Confirm sends one request to `/api/komga/metadata/identify`, then polls `/api/jobs/{id}`.
- Both `id` and `jobId` responses work.
- `COMPLETED` produces a success notification and closes the dialog.
- `FAILED` displays the backend message without a success notification.
- Polling HTTP failure retains the job ID; Check status resumes without creating another task.
- Closing a running dialog stops polling, without cancelling the server job.
- The five-minute polling deadline was exercised by advancing the browser clock; Check status resumes the same task.
- Existing-link aggregation sends `MANGA_UPDATES` and a decimal ID; the aggregate option respects the server setting.
- Search by title submits the new selected result rather than the old link and warns about backend link precedence.
- No uncaught browser errors in the completed regression scenarios.

## Real server check

The modified TypeScript API service was also run against the actual komf-rs **1.14.5** binary on loopback. Its media-server address deliberately pointed at an unreachable loopback port. Identify returned a real task UUID; polling reached `FAILED` and preserved the actual connection error. This validates the async wire format without writing a real library.

Not claimed: installation inside Tampermonkey, a full Komga/NextUI host matrix, real provider fetch success or real NAS metadata writes. The local browser page is a fixture, not a production Komga deployment.
