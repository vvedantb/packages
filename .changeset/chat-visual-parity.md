---
"@vvedantb/native-ui": minor
"@vvedantb/ui": patch
---

native-ui `/ai`: the web activity timeline's pure logic, as byte-identical copies of the `@vvedantb/ui` files (`activity-step-label.ts`, `activity-tasks-utils.ts`, `activity-step-types.ts`): `deriveStepRowPresentation` (short verbs, file chips, "Checked git status", "Used Linear: List Issues"), `deriveActionGroupSummary` ("used Linear", "ran hooks"), `resolveCommandVisualKind`, `buildActivityRows` (subagent steps nest under their row) and `groupActivityRows`, `activityStepHasRichDetail`, and the step type as `ActivityTimelineStep`. New `foldedActivitySegments`, `activityChildRows`, `activityStepSeconds`, `ACTIVITY_MAX_VISIBLE_BLOCKS` and `ACTIVITY_MAX_VISIBLE_CHILDREN`: the folded `ActivityTasks` rules, for an app that draws the rows with the `AgentTrace` parts.

native-ui `CodeBlock`: colours match the web's Shiki `github-light` / `github-dark`. JavaScript and TypeScript recolour Prism's tokens where Shiki differs (`null`, `undefined` and `this` as constants, parameters, `const` names, type names, string escapes, regex classes, `${…}` punctuation, type-argument brackets; `scriptTokens`). `bash`, `sh`, `shell` and `zsh` are coloured by a small tokenizer in the Shiki roles (`shellTokens`); before, they were plain.

native-ui `Markdown`: tables have the web table actions a phone can use, above the table: Copy table (a sheet of Markdown, CSV and TSV, the web formats; new `onCopyTable` prop) and View fullscreen (the table at its own column widths, scrolling sideways). Download table is left out.

native-ui `PromptInput`: the `pill` composer's placeholder is the muted colour at 90%, as Eva's web composer.

ui: the activity step types move to `activity-step-types.ts` (still exported from the package root), so native-ui can copy the pure timeline files unchanged.
