# 0.13.10 — card-local Add link only

Moved the add action from the result toolbar to a compact **+** button directly to the right of each card's Provider name. Tooltip and accessible label: `Add link only`. It acts on the clicked card, not the current Identify selection; selection is not required and is not changed. Only the clicked card spins. Existing Komga service and write semantics are unchanged.

Verification:
- `npm test`: 28 passed; `sh build.sh`: type check and production build passed; `git diff --check`: passed.
- Browser executed the built script against the local synthetic fixture. Ten assertions passed: no toolbar add action; per-card buttons; no selection prerequisite; missing URL disabled; same-row placement right of Provider; SVG plus icon; clicked-card-only spinner with other add actions disabled; selection preserved; clicking B while A is selected writes B's URL/provider; no Identify submitted. No uncaught browser errors.
- Screenshot visually checked: Provider and plus are adjacent, within card bounds; long names truncate instead of pushing the button out.
- No NAS or real-library writes. Backend and dependency versions unchanged.
