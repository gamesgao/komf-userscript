# 0.13.12 — in-dialog success feedback

## UI contract

- Identify completion replaces the confirmation button's spinner with a green SVG check, holds it for 650 ms, then fades the dialog and backdrop out over 280 ms. No global success notification.
- The exit transition is opacity-only. Existing viewport centering / transform suppression remains intact. Reduced-motion mode skips the fade.
- Failed tasks remain open with their error and an enabled retry; no success check or automatic close.
- Link-only completion shows the same check in the clicked card's add button, then restores the plus; the dialog and selection remain unchanged. No Identify request is made by this action.
- Removed `Search again` and the `Komf still prioritizes existing links...` helper. The earlier removed Task-ID caption remains absent. Link matching configuration itself is unchanged.

## Verification

- `npm test`: 31 passed, including three tests rendering the actual ActionFeedback component for pending/completed/link-only states.
- `sh build.sh`: type-check and production packaging passed; `git diff --check` passed.
- Actual packaged userscript exercised in a browser against a local synthetic Komga/Komf fixture, not the NAS.
- Normal-speed success run: rotating spinner → green check → intermediate opacity frames → dialog removal. One Identify submission; no notifications; no horizontal or vertical dialog movement. Observed first check at ~1023 ms, fade beginning ~1724 ms; frame sampling is not an exact animation-duration benchmark.
- Failure run: server FAILED response stayed visible in the dialog after >1 second, retry available, no check/toast.
- Link-only run: selected A, added B's URL, green check stayed within the dialog, A remained selected, dialog stayed open, zero Identify requests.
- Narrow embedded viewport (388 CSS px): visible green check fully inside the dialog and viewport; completion closed the dialog without a global toast.
- Existing-link flow still permits Search by title, with the priority warning removed.
- Screenshot visually inspected the real rendered success state. Its hold timer was paused only for capture; normal timings were tested separately.
- No uncaught browser errors in the exercised flows. Removed text verified absent from source and the packaged artifact.

Build SHA-256: `4c15012c66dbd3f41ede89326c69854ab274725ed783aa64b89c1533023a8ca8`.
