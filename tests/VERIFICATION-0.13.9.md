# 0.13.9 design and verification

## Scope

Use the existing Vue/Quasar conventions and backend APIs; no added dependency or komf-rs changes.

- Source links use the search response's `url`, not constructed provider URLs. Only absolute HTTP(S) URLs enable actions. Provider anchors use `_blank`, `noopener noreferrer` and stop click propagation.
- `Add link only` is separate from Identify. It reads current Komga links using the page session, skips identical URLs, then PATCHes only the merged `links` field. Ordinary series use `/api/v1/series/{id}/metadata`; One-shots resolve their single book and use `/api/v1/books/{id}/metadata`. Existing metadata and lock flags are not sent back or altered by this action. The dialog stays open for more selections.
- A small separate Komga service uses same-origin fetch, not the Komf axios client with its auth interceptor. Komga's API requires ADMIN; 403 is an inline error, not success.
- No multi-selection redesign, automatic Identify, metadata fetching, automatic link locking or atomic/concurrent-writer guarantees. A later metadata process may replace links. Kavita link-only writes are deliberately not implemented.
- Restore native loading spinners, per user feedback. The original global portal rule disabled all animations to prevent dialog sliding. Only `.identify-dialog .q-spinner-mat` and its `.path` regain Quasar's `q-spin` and `q-mat-dash` animations. Extra loading text and the linear progress bar are removed; error/empty/job-status handling remains.

## Source contracts checked

- komf-rs 1.14.5 `SeriesSearchResult`: nullable `url` is already serialized in search results.
- Komga upstream `SeriesController`, `BookController`, `SeriesMetadataUpdateDto`, `BookMetadataUpdateDto`: metadata PATCH accepts only the fields to update and requires an administrator. Book PATCH preserves omitted fields/lock flags.
- Komga `BrowseOneshot.vue`: its context is a series ID with one underlying book.
- Installed Quasar `QSpinner.js` / `QSpinner.sass`: both SVG rotation and circle dash animations are needed.

## Executed verification

- `npm test`: **28 tests passed**, including the previous regression suite and new source-URL, append-only, duplicate, One-shot, successive-addition, read-failure, permission-failure and no-Komf-auth cases.
- `sh build.sh`: Vue type check and production build passed.
- `git diff --check`: passed.
- Browser executed the actual built script against local synthetic Komga/Komf endpoints, with **22 passing DOM/request assertions** and **zero uncaught errors**:
  - Computed spinner and circle animation names are correct; the SVG transform changes across sampled frames. Dialog animation is still `none`; no added waiting text or progress bar remains.
  - Source anchors have the real response URL and new-tab attributes. Click propagation does not change selection. Missing URLs have neither a source anchor nor an enabled add action.
  - Series addition sends only merged links, keeps the dialog open, does not send Komf Authorization, and makes no Identify or job-poll request. Repeating an identical URL sends no PATCH.
  - 403 stays inline and can be retried; adding another source preserves the first addition.
  - One-shot addition PATCHes the book, not the series.
  - Add link is disabled during an Identify job; Confirm still shows the restored spinner and handles a FAILED job correctly.
- An additional real browser click on the provider anchor opened the local source page; the fixture recorded the source request and the active browser page showed its source URL.

No NAS was contacted. Browser HTTP responses were synthetic; this is not a claim of real-library writes or a complete Tampermonkey/host-version compatibility matrix.
