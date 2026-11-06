# [Komf](https://github.com/dyphire/komf) user script for Komga and Kavita

Adds komf integration to Komga and Kavita ui.

### Fork fixes (0.13.8)

- Load Identify settings for the current server and library; Kavita settings no longer overwrite Komga's link matching flag.
- Use API provider IDs for existing links, and convert MangaUpdates public base-36 IDs to decimal IDs.
- Show readable loading text, empty results and inline errors; allow searching again without closing the dialog.
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
