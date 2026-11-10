---
"@vvedantb/native-ui": patch
---

Add optional `/ai` card props. `ToolApprovalCard` and `ToolDraftCard` take `server`, `routineMode`, `expiresLabel`, `target`, `meta` and `chrome`, and `onDecide` passes `edits`. `ToolDraftCard` takes `fields` for an inline editor, with `changedDraftEdits`, `DRAFT_ROLE_LABELS` and the `DraftField`, `DraftFieldRole` and `DraftEdit` types. `SubagentRunCard` adds `queued` and `timed_out` statuses, `statusLine`, `error` and `avatar`, and Cancel shows while queued. `SubagentResultCard` takes `approvalPending`, `approvalPendingIn`, `handoffs` and `avatar`, with the `SubagentHandoff` type.
