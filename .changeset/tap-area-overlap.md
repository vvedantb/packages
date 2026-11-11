---
"@vvedantb/native-ui": minor
---

Tap areas no longer overlap their neighbours. `Button` `small` slops 6 above and below only (was 8 on every side), so two small buttons 4 apart (Cancel and Delete) cannot steal each other's taps; the larger-text sizes (56 or more) take no slop. Agent trace lines are 28 high (`py-1`) with no gap in `AgentTrace` (the pitch stays 28), and a fold's trigger stretches to the line and takes no slop above or below; the chevron slops 4 back and 14 on, none vertically. `AgentTraceCollapsibleContent` is `mt-1 mb-2` and `AgentTraceFold` has 2 under its line, so the spacing around the text is unchanged. `ChatIconButton` `slop` also takes `{ left, right }` (vertical slop plus those sides), and `CodeBlockCopyButton` passes `slop` on: the code block's Wrap slops left 8 and Copy right 5, both vertical only. The `Attachment` remove cross slops 3 toward a pressable label and 8 to the chip's edge.
