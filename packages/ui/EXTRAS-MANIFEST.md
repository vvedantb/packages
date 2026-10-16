# ui-extras manifest

Sources were collected from shallow clones of two consumer apps (app-b and app-c below) on 2026-10-03 (BST). Generic primitives and `cn` helpers were intentionally omitted because they are already in the baseline app (app-a). The app-b package has no `exports` field; the included metadata note records that fact.

## Files

| File | Bytes | Drift note |
|---|---:|---|
| `app-c/packages/ui/components/accordion.tsx` | 2158 | Substantially different: yes — different Radix API/imports, chevron implementation, and styling. |
| `app-c/packages/ui/components/clear-input.tsx` | 5174 | Substantially different: yes — app-c adds the dissolve animation and a distinct clearing/wrapper structure. |
| `app-c/packages/ui/components/clearInputDissolve.ts` | 6473 | No same-name counterpart in the other requested source set. |
| `app-c/packages/ui/components/input-group.tsx` | 4113 | Substantially different: yes — different props/data attributes plus materially different variants and layout classes. |
| `app-c/packages/ui/components/kbd.tsx` | 505 | No same-name counterpart in the other requested source set. |
| `app-c/packages/ui/components/scroll-area.tsx` | 1579 | Substantially different: yes — different Radix API/imports and viewport/scrollbar class structure. |
| `app-c/packages/ui/components/sheet.tsx` | 2584 | No same-name counterpart in the other requested source set. |
| `app-c/packages/ui/components/visually-hidden.tsx` | 89 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/package.json.exports.txt` | 128 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/artifact.tsx` | 2292 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/attachments.tsx` | 11354 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/chain-of-thought.tsx` | 5607 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/code-block.tsx` | 13343 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/conversation.tsx` | 4699 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/image.tsx` | 495 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/inline-citation.tsx` | 6886 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/message.tsx` | 7263 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/model-selector.tsx` | 4952 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/prompt-input.tsx` | 29700 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/queue.tsx` | 6582 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/reasoning.tsx` | 5580 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/shimmer.tsx` | 1486 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/sources.tsx` | 2084 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/speech-input.tsx` | 9659 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ai-elements/suggestion.tsx` | 5741 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/motion/presets.ts` | 2121 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ui/_menu-classes.ts` | 2810 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ui/accordion.tsx` | 2229 | Substantially different: yes — different Radix API/imports, chevron implementation, and styling. |
| `app-b/packages/ui/src/ui/button-group.tsx` | 2193 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ui/carousel.tsx` | 5465 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ui/clear-input.tsx` | 2740 | Substantially different: yes — app-c adds the dissolve animation and a distinct clearing/wrapper structure. |
| `app-b/packages/ui/src/ui/input-group.tsx` | 4877 | Substantially different: yes — different props/data attributes plus materially different variants and layout classes. |
| `app-b/packages/ui/src/ui/pagination.tsx` | 1124 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ui/radix-select.tsx` | 6182 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ui/scroll-area.tsx` | 1573 | Substantially different: yes — different Radix API/imports and viewport/scrollbar class structure. |
| `app-b/packages/ui/src/ui/search-input.tsx` | 778 | No same-name counterpart in the other requested source set. |
| `app-b/packages/ui/src/ui/surface-classes.ts` | 2558 | No same-name counterpart in the other requested source set. |
