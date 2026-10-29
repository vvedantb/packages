// `@vvedantb/native-ui/page-title`: `PageTitle`, `PageHeader` and (from 0.5.0)
// `StackPageHeader`. Reaches no optional peer, not even a loader.
// `StackPageHeader` imports one Tabler icon (a required peer) for its back
// button; Metro does not tree-shake by default, so that bundles the Tabler
// package with this entry.
export { PageTitle, PageHeader } from "../PageTitle";
export type { PageTitleProps, PageHeaderProps } from "../PageTitle";
export { StackPageHeader } from "../StackPageHeader";
export type { StackPageHeaderProps } from "../StackPageHeader";
