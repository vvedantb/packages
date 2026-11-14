# Motion audit plans

Audit of `@vvedantb/ui` and `@vvedantb/native-ui` against the
`improve-animations` skill (`.claude/skills/improve-animations`). Baseline:
commit `76eb8a0` on `main`, 14 November 2026.

Each plan is self-contained. An executor needs only the plan file.

## Plans

| # | Plan | Package | Severity | Scope |
| --- | --- | --- | --- | --- |
| 001 | [Scale menus, popovers and tooltips from their trigger](001-trigger-anchored-origin.md) | ui | MEDIUM | 2 files |
| 002 | [Command palette and slash menu open with no animation](002-instant-keyboard-surfaces.md) | ui | HIGH | 2 to 3 files |
| 003 | [Define the `--motion-*` tokens](003-define-motion-tokens.md) | ui | MEDIUM | 1 file |
| 004 | [Shimmer stops remounting on every render](004-shimmer-stable-component.md) | ui | HIGH | 1 file |
| 005 | [Native Reduce Motion keeps a fade](005-native-reduce-motion-keeps-fade.md) (rejected) | native-ui | MEDIUM | 4 files |
| 006 | [Native Switch haptic](006-native-switch-haptic.md) | native-ui | LOW | 1 file |

## Order

Ordered by leverage (effect per changed line), not by severity.

1. 001, 003 and 006 are small and independent. Do them first.
2. 004 and 002 next.
3. 005 is rejected. Dropping all animation under Reduce Motion is intended:
   each app has its own setting to turn animations on or off.

Status on 14 November 2026: 001, 002, 003, 004 and 006 are implemented.

## Dependencies

None. No two plans touch the same file. 001 to 004 each need their own
`@vvedantb/ui` changeset; 005 and 006 each need a `@vvedantb/native-ui`
changeset.

## Findings without a plan

Recorded for a later pass. Line numbers are at `76eb8a0`.

| Severity | Category | Location | Finding |
| --- | --- | --- | --- |
| MEDIUM | Accessibility | `ui/app/src/page-motion/PageMotionProvider.tsx:41` | `reducedMotion` is `"never"` when page motion is on, which overrides the OS setting |
| MEDIUM | Accessibility | `ui/src/ui/_menu-classes.ts:11`, `ui/src/ui/tooltip.tsx:47` | No `motion-reduce:` variant; `dialog.tsx:204` removes the fade as well as the slide |
| MEDIUM | Interruptibility | `ui/src/ui/accordion.tsx:121` | Keyframe open/close restarts when reversed part-way |
| MEDIUM | Performance | `ui/src/ai-elements/queue.tsx:8`, `suggestion.tsx:7`, `kibo/theme-switcher.tsx:3`, `ui/slide-over-panel.tsx:2` | Full `motion` import in a library that runs under `LazyMotion strict` |
| LOW | Purpose | `ui/src/ui/button.tsx:15` | Default button lifts on hover (`hover:-translate-y-0.5`) |
| LOW | Cohesion | `native-ui` press feedback | `active:opacity-70` (about 29 uses), `-80`, `-90`, `-60` and `usePressFeedback` scale all in use |
| LOW | Easing | `native-ui/src/primitives/pager-gesture.tsx:26` | `PAGER_SLIDE` has a duration and no easing |

Reported by sub-agents and not re-read line by line: press scales outside
0.95 to 0.98 on web (`active:scale-[0.99]`, `0.94`, `0.92`, `scale-90`), no
press feedback on web `switch`, `checkbox` and `select`, the tab pill
animating `width`, `top` and `height`, about 12 hand-typed copies of the
`0.22, 1, 0.36, 1` curve, and about 13 hand-typed spring configs in
native-ui. Verify before planning.

## Missed opportunities

1. Native `DropdownMenu` fades in place. It could scale from its trigger.
2. Native message action sheet fades; `Sheet` slides. Use the sheet motion.
3. Web tooltips have no `data-[state=instant-open]` handling, so moving
   between adjacent tooltips replays the animation.
4. Web jump-rail hover card (`ui/src/chat/jump-rail.tsx:278-288`) fades with
   no scale or origin.
