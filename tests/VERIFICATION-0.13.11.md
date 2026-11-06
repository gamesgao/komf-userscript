# 0.13.11 — remove task-detail caption

Removed the Identify dialog's `Task <jobId>. Closing this dialog does not cancel the server task.` caption. No replacement explanatory text was added.

Verification:
- `npm test`: 28 passed.
- `sh build.sh`: Vue type check and production build passed.
- `git diff --check`: passed.
- IdentifySeriesDialog.vue's entire script section is byte-identical to 0.13.10; task submission, polling, error handling and completion behavior were not changed.
- Packaged userscript identifies as 0.13.11 and no longer contains the removed caption.
- No NAS access or real-library changes. No new browser visual run for this text-only deletion.
