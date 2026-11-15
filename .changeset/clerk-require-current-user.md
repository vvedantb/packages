---
"@vvedantb/server": minor
---

Add `requireCurrentUser` to `createClerkUserAuth`. It resolves the caller's row from the Clerk identity and throws `new Error(message)` (default the config's `unauthenticatedMessage`) where `getCurrentUser` would return `null`, returning the row itself rather than its id. This is the row-returning counterpart to the existing `requireCurrentUserId`, for handlers that need the user document and otherwise hand-write the identity lookup and null check.
