# 003: Define the `--motion-*` tokens that the CSS already reads

- **Status:** Not started
- **Commit:** `76eb8a0` (audit baseline on `main`)
- **Severity:** MEDIUM
- **Category:** Cohesion and tokens
- **Estimated scope:** 1 file, about 6 added lines, plus one changeset

## Problem

Four motion tokens are documented as defaults but never defined.

`packages/ui/tokens/src/css/utilities.css:5-10`:

```css
 * The motion utilities read these variables. Set them on :root to change
 * (defaults shown):
 *   --motion-fast: 150ms (press feedback)
 *   --motion-base: 220ms (colour, shadow, opacity)
 *   --motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1)
 *   --motion-ease-emphasized: cubic-bezier(0.2, 0.8, 0.2, 1)
```

Most uses carry a fallback, for example
`var(--motion-base, 220ms)` in `utilities.css:54`. These do not:

- `packages/ui/tokens/src/css/marquee.css:34`
  `transition: transform var(--motion-base) var(--motion-ease-out);`
- `packages/ui/src/ai-elements/test-results.tsx:175,181`
  `duration-[var(--motion-base)]`
- `packages/ui/src/ai-elements/model-picker-content.tsx:316` (same pattern;
  read the line to confirm which token)

With the variable unset the declaration is invalid at computed-value time, so
the transition does not run. The marquee snaps back and the test-result bars
jump, unless the app happens to define the tokens.

`packages/ui/src/motion/presets.ts:57-58` also refers to `--motion-slow`
(320ms). It is not defined either.

## Target

Define the tokens once in `packages/ui/tokens/src/tokens.css`, in the
existing `@layer base { :root { … } }` block that holds the modal and tabs
timings (about lines 266 to 276):

```css
--motion-fast: 150ms;
--motion-base: 220ms;
--motion-slow: 320ms;
--motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--motion-ease-emphasized: cubic-bezier(0.2, 0.8, 0.2, 1);
```

Values come from the comment in `utilities.css` and the doc comment in
`presets.ts`. Do not pick new values.

## Repo conventions

- `:root` motion values live beside `--modal-open-dur` and `--tabs-dur` in
  `tokens.css`.
- `modal.css` notes that apps on `compat-shadcn-rgb.css` must set the modal
  variables themselves. Check whether that file needs the same five lines.
- `pnpm --filter @vvedantb/ui build` runs `check-exports.mjs` and
  `check-component-tokens.mjs`; run it if you touch token files.
- Changeset needed (`pnpm changeset`, patch for `@vvedantb/ui`).

## Steps

1. Add the five declarations to the `:root` block in `tokens.css`.
2. Open `compat-shadcn-rgb.css` (search `packages/ui/tokens/src`). If it
   defines `--modal-open-dur`, add the five lines there too.
3. Update the comment in `utilities.css:5-10` to say the defaults are set in
   `tokens.css`.
4. Leave the existing `var(--motion-base, 220ms)` fallbacks in place. They
   protect apps that do not import `tokens.css`.
5. Run `pnpm changeset`: "Define `--motion-fast`, `--motion-base`,
   `--motion-slow`, `--motion-ease-out` and `--motion-ease-emphasized` on
   `:root`."

## Boundaries

- Do not change any value an app can already see.
- Do not rewrite hand-typed `cubic-bezier(0.22, 1, 0.36, 1)` copies to use
  the token. That is a separate, larger clean-up.

## Verification

**Mechanical**

```bash
pnpm --filter @vvedantb/ui typecheck
pnpm --filter @vvedantb/ui test
pnpm --filter @vvedantb/ui build
```

**Feel check**

- In an app that does not set these tokens, hover a marquee row and leave.
  The text eases back over 220ms and does not snap.
- A test-results bar grows over 220ms.
- In devtools, `getComputedStyle(document.documentElement).getPropertyValue("--motion-base")`
  returns `220ms`.

**Done when**

- The five tokens resolve on `:root` with no app CSS.
- Typecheck, tests and build pass and a changeset file exists.
