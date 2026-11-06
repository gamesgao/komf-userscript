# [Komf](https://github.com/dyphire/komf) user script for Komga and Kavita

Adds komf integration to Komga and Kavita ui.

### Fork additions (0.13.9)

- Provider names open the search result's source URL in a new tab without changing card selection. Missing/non-web URLs stay plain text.
- Select a result, then use **Add link only** to append its URL to Komga without Identify. The dialog stays open for further additions. Identical URLs are skipped.
- Ordinary series update series links; One-shots update their single book's links. Each action reads current links and PATCHes only `links`, preserving other metadata and lock flags.
- This uses the current Komga page session and requires an administrator account. It does not use or send the Komf auth key. Kavita is not supported for link-only writes.
- Restore the original button spinners by allowing their two animations inside Identify only. Remove the extra waiting text/progress bar; keep empty-result, error and job-completion feedback. Dialog positioning animations remain disabled.

See [0.13.9 verification](tests/VERIFICATION-0.13.9.md). Link-only additions do not fetch or merge metadata, and do not prevent a later metadata job from replacing links.

### Initial fork fixes (0.13.8)

- Load Identify settings for the current server and library; Kavita settings no longer overwrite Komga's link matching flag.
- Use API provider IDs for existing links, and convert MangaUpdates public base-36 IDs to decimal IDs.
- Show empty results and inline errors; allow searching again without closing the dialog.
- Use asynchronous Identify and poll the returned job ID (Rust `id` / official `jobId`). Show success only for `COMPLETED`, and display the backend reason for `FAILED`.
- Status checks can be resumed after an error/timeout without submitting another task. Closing the dialog stops polling, not the server task.
- The asynchronous API does not expose the legacy `edition` parameter, so the unused edition input was removed.

[Download the userscript](https://github.com/gamesgao/komf-userscript/releases/latest/download/komf.user.js).
Disable the original Komf userscript before installing this fork, and retain your server URL includes.

Checks: `npm ci`, `npm test`, `npm run build`. Package with `sh build.sh`.

---

### New menus in ui:

- Config dialog in main view
- Menu in library toolbar with option to automatically identify all series inside
- Menu in series toolbar with options to manually or automatically match current series

### Installation

Requires tampermonkey or any other supported userscript manager.

- Build or download the latest version from release page
- Import the file into script manager
- Set `@include`  to your komga or kavita server url (or both)
- Set `komf url` in Komf settings from the UI
