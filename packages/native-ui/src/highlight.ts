import type * as PrismReactRenderer from "prism-react-renderer";

export type PrismReactRendererModule = typeof PrismReactRenderer;

let prismReactRenderer: PrismReactRendererModule | null | undefined;

/**
 * `prism-react-renderer`, or `null` when the optional peer is not installed.
 * `CodeBlock` highlights with it. Metro bundles a `require` placed directly in
 * a `try` block as an optional dependency, so a missing peer does not break
 * the bundle.
 */
export function loadPrismReactRenderer(): PrismReactRendererModule | null {
  if (prismReactRenderer === undefined) {
    try {
      prismReactRenderer = require("prism-react-renderer");
    } catch {
      prismReactRenderer = null;
    }
  }
  // `?? null`: with the real peer types installed, TypeScript keeps `undefined`
  // in the type after the `try` (the package typecheck only sees a stub).
  return prismReactRenderer ?? null;
}

export type CodeColorRole =
  | "plain"
  | "comment"
  | "keyword"
  | "string"
  | "constant"
  | "function"
  | "tag"
  | "variable"
  | "inserted"
  | "deleted";

/**
 * The shiki `github-light` and `github-dark` colours the web `CodeBlock`
 * uses, by role. Plain text is the theme foreground.
 */
export const GITHUB_CODE_COLORS: Record<"light" | "dark", Record<CodeColorRole, string>> = {
  light: {
    plain: "#24292e",
    comment: "#6a737d",
    keyword: "#d73a49",
    string: "#032f62",
    constant: "#005cc5",
    function: "#6f42c1",
    tag: "#22863a",
    variable: "#e36209",
    inserted: "#22863a",
    deleted: "#b31d28",
  },
  dark: {
    plain: "#e1e4e8",
    comment: "#6a737d",
    keyword: "#f97583",
    string: "#9ecbff",
    constant: "#79b8ff",
    function: "#b392f0",
    tag: "#85e89d",
    variable: "#ffab70",
    inserted: "#85e89d",
    deleted: "#fdaeb7",
  },
};

/** Prism token types to their GitHub role. Types not listed are plain. */
const PRISM_ROLE: Record<string, CodeColorRole> = {
  comment: "comment",
  prolog: "comment",
  doctype: "comment",
  cdata: "comment",
  keyword: "keyword",
  operator: "keyword",
  atrule: "keyword",
  important: "keyword",
  rule: "keyword",
  string: "string",
  char: "string",
  "attr-value": "string",
  regex: "string",
  url: "string",
  "template-string": "string",
  number: "constant",
  boolean: "constant",
  constant: "constant",
  property: "constant",
  "attr-name": "constant",
  symbol: "constant",
  builtin: "constant",
  entity: "constant",
  function: "function",
  "function-variable": "function",
  "class-name": "function",
  maybe_class_name: "function",
  tag: "tag",
  selector: "tag",
  variable: "variable",
  parameter: "variable",
  inserted: "inserted",
  deleted: "deleted",
  punctuation: "plain",
  plain: "plain",
};

/**
 * The colour of a Prism token from its types. Later types win, as in
 * `prism-react-renderer`'s theme lookup: the `<` of a tag (`["tag",
 * "punctuation"]`) is plain.
 */
export function codeTokenColor(types: readonly string[], scheme: "light" | "dark"): string {
  let role: CodeColorRole = "plain";
  for (const type of types) role = PRISM_ROLE[type] ?? role;
  return GITHUB_CODE_COLORS[scheme][role];
}
