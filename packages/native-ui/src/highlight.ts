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
  return GITHUB_CODE_COLORS[scheme][prismRole(types)];
}

function prismRole(types: readonly string[]): CodeColorRole {
  let role: CodeColorRole = "plain";
  for (const type of types) role = PRISM_ROLE[type] ?? role;
  return role;
}

/** One coloured run of code. */
export type CodeToken = { content: string; role: CodeColorRole };

/** A Prism token as `prism-react-renderer` hands it over: its types, outermost first. */
export type PrismToken = { types: readonly string[]; content: string; empty?: boolean };

/** Languages `scriptTokens` refines: the JavaScript family, as Shiki's grammars. */
export const SCRIPT_LANGUAGES = new Set(["js", "jsx", "javascript", "mjs", "cjs", "ts", "tsx", "typescript", "mts", "cts"]);

/** Languages `shellTokens` colours. `prism-react-renderer` bundles no shell grammar. */
export const SHELL_LANGUAGES = new Set(["bash", "sh", "shell", "zsh", "shellscript", "console"]);

/** Keywords Shiki colours as constants (`constant.language`, `variable.language`, a `void` type). */
const SCRIPT_CONSTANT_KEYWORDS = new Set(["null", "undefined", "this", "super", "void"]);

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A token's role before context: what Prism's types say, with the Shiki differences that need no context. */
function scriptBaseRole({ types, content }: PrismToken): CodeColorRole {
  // Inside `${…}` Shiki keeps the punctuation in the string colour and the code in its own.
  const interpolation = types.lastIndexOf("interpolation");
  if (interpolation >= 0) {
    const inner = types.slice(interpolation + 1);
    return inner.includes("punctuation") || inner.includes("interpolation-punctuation") ? "string" : prismRole(inner);
  }
  // A regex character class, brackets and escapes too.
  if (types.includes("char-class")) return "constant";
  const role = prismRole(types);
  if (role === "keyword" && SCRIPT_CONSTANT_KEYWORDS.has(content)) return "constant";
  if (types.includes("builtin") && content === "console") return "plain";
  if (types.includes("function") && content === "constructor") return "keyword";
  return role;
}

type Piece = CodeToken & { line: number; types: readonly string[] };

/** Splits a token so escapes in strings and each word of plain text get a role of their own. */
function splitPiece(piece: Piece): Piece[] {
  const parts =
    piece.role === "string" && !piece.types.includes("regex")
      ? piece.content.split(/(\\.)/)
      : piece.role === "plain"
        ? piece.content.split(/([A-Za-z_$][\w$]*)/)
        : [piece.content];
  return parts
    .filter((part) => part !== "")
    .map((part) => ({ ...piece, content: part, role: piece.role === "string" && /^\\./.test(part) ? "constant" : piece.role }));
}

const isWord = (piece: Piece | undefined, word: string) => piece?.content === word;

/**
 * Prism tokens for the JavaScript family, recoloured where Prism and the
 * web's Shiki grammars disagree, so the phone draws the web colours:
 * `null`, `undefined` and `this` as constants; escapes in strings; a regex
 * character class; `${…}` punctuation in the string colour; a `const` name
 * as a constant; parameters in the variable colour; type and class names
 * (a capitalised word not followed by `.`) as functions; ALL_CAPS words as
 * constants. Returns lines of runs, adjacent runs of one role merged.
 */
export function scriptTokens(lines: readonly (readonly PrismToken[])[]): CodeToken[][] {
  const pieces = lines.flatMap((tokens, line) =>
    tokens.filter((token) => !token.empty && token.content !== "").flatMap((token) =>
      splitPiece({ content: token.content, types: token.types, role: scriptBaseRole(token), line }),
    ),
  );
  // Indices of the pieces that are not whitespace.
  const sig = pieces.flatMap((piece, index) => (piece.content.trim() === "" ? [] : [index]));
  const at = (position: number) => {
    const index = sig[position];
    return index === undefined ? undefined : pieces[index];
  };
  const isIdentifier = (piece: Piece | undefined): piece is Piece =>
    piece !== undefined && piece.role === "plain" && IDENTIFIER.test(piece.content);
  const closing = (open: number) => {
    let depth = 0;
    for (let position = open; position < sig.length; position += 1) {
      const content = at(position)?.content;
      if (content === "(") depth += 1;
      else if (content === ")") {
        depth -= 1;
        if (depth === 0) return position;
      }
    }
    return undefined;
  };
  // An arrow function's parameters, or a declared function's or method's.
  const isParameterList = (open: number, close: number) => {
    const before = at(open - 1);
    if (isWord(before, "function") || isWord(before, "constructor")) return true;
    if (before?.role === "function" && isWord(at(open - 2), "function")) return true;
    let depth = 0;
    for (let position = close + 1; position < Math.min(sig.length, close + 40); position += 1) {
      const content = at(position)?.content;
      if (position === close + 1 && content !== ":") return content === "=>" || (content === "{" && before?.role === "function");
      if (content === "(" || content === "<" || content === "[") depth += 1;
      else if (content === ")" || content === ">" || content === "]") depth -= 1;
      else if (depth === 0 && content === "=>") return true;
      else if (depth === 0 && content === "{") return before?.role === "function";
      else if (depth === 0 && (content === ";" || content === "=")) return false;
    }
    return false;
  };
  for (let position = 0; position < sig.length; position += 1) {
    if (!isWord(at(position), "(")) continue;
    const close = closing(position);
    if (close === undefined || !isParameterList(position, close)) continue;
    let depth = 0;
    let expectName = true;
    for (let inner = position + 1; inner < close; inner += 1) {
      const piece = at(inner);
      const content = piece?.content;
      if (content === "(" || content === "[" || content === "{" || content === "<") depth += 1;
      else if (content === ")" || content === "]" || content === "}" || content === ">") depth -= 1;
      else if (depth === 0 && content === ",") expectName = true;
      else if (depth === 0 && (content === ":" || content === "=" || content === "?")) expectName = false;
      else if (depth === 0 && expectName && isIdentifier(piece)) {
        piece.role = "variable";
        expectName = false;
      }
    }
  }
  let inImport = false;
  let constPattern = 0;
  // `Map<string, number>`: Shiki draws type-argument brackets plain, Prism as operators.
  let generic = 0;
  for (let position = 0; position < sig.length; position += 1) {
    const piece = at(position);
    if (!piece) continue;
    const previous = at(position - 1);
    if (piece.role === "keyword" && piece.content === "import") inImport = true;
    if (piece.role === "keyword" && piece.content === "from") inImport = false;
    // `const { a, b } = …`: every name in the pattern.
    if (isWord(previous, "const") && (piece.content === "{" || piece.content === "[")) constPattern = 1;
    else if (constPattern > 0 && (piece.content === "{" || piece.content === "[")) constPattern += 1;
    else if (constPattern > 0 && (piece.content === "}" || piece.content === "]")) constPattern -= 1;
    if (piece.role === "keyword" && piece.content === "<" && pieces[(sig[position] ?? 0) - 1]?.role === "function") {
      piece.role = "plain";
      generic += 1;
    } else if (generic > 0 && piece.role === "keyword" && piece.content === ">") {
      piece.role = "plain";
      generic -= 1;
    }
    if (!isIdentifier(piece) || inImport) continue;
    const next = at(position + 1);
    if ((previous?.role === "keyword" && previous.content === "const") || constPattern > 0) piece.role = "constant";
    else if (isWord(next, "=>")) piece.role = "variable";
    else if (/^[A-Z][A-Z0-9_]+$/.test(piece.content)) piece.role = "constant";
    else if (/^[A-Z]/.test(piece.content) && /[a-z]/.test(piece.content) && !isWord(next, ".")) piece.role = "function";
  }
  return mergeLines(pieces, lines.length);
}

function mergeLines(pieces: ReadonlyArray<CodeToken & { line: number }>, count: number): CodeToken[][] {
  const out: CodeToken[][] = Array.from({ length: count }, () => []);
  for (const { content, role, line } of pieces) {
    const runs = out[line];
    if (!runs) continue;
    const last = runs.at(-1);
    if (last && last.role === role) last.content += content;
    else runs.push({ content, role });
  }
  return out;
}

/** Shell words Shiki colours as keywords. */
const SHELL_KEYWORDS = new Set([
  "if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done", "case", "esac", "in",
  "function", "select", "break", "continue", "return", "export", "local", "readonly", "declare",
]);

/** After these a new command starts. */
const SHELL_COMMAND_KEYWORDS = new Set(["then", "else", "do", "if", "while", "until", "elif"]);

/** Shell builtins Shiki colours as constants (`support.function.builtin`). */
const SHELL_BUILTINS = new Set([
  "echo", "cd", "printf", "source", "set", "unset", "exit", "pwd", "read", "eval", "exec", "shift",
  "trap", "wait", "type", "alias", "unalias", "true", "false", "test", "ulimit", "umask", "kill",
]);

/**
 * Shell code in the roles of the web's Shiki `bash` grammar, for `bash`, `sh`,
 * `shell` and `zsh` blocks: a command name as a function, its arguments as
 * strings, `-x` and `--flag` options and numbers as constants, builtins
 * (`echo`, `cd`) as constants, keywords, `|`, `||` and redirects as
 * keywords, `$VAR` plain (also inside a double-quoted string), comments.
 * `prism-react-renderer` bundles no shell grammar, so this needs no peer.
 */
export function shellTokens(code: string): CodeToken[][] {
  return code.split("\n").map((source) => {
    const runs: CodeToken[] = [];
    const push = (content: string, role: CodeColorRole) => {
      if (content === "") return;
      const last = runs.at(-1);
      if (last && last.role === role) last.content += content;
      else runs.push({ content, role });
    };
    let index = 0;
    let command = true;
    // `for NAME in`: the name is plain, then `in` is a keyword.
    let forState: "none" | "name" | "in" = "none";
    // Inside `[ … ]` Shiki draws test operators (`-f`) as keywords and words plain.
    let inTest = false;
    while (index < source.length) {
      const rest = source.slice(index);
      const space = /^\s+/.exec(rest);
      if (space) {
        push(space[0], "plain");
        index += space[0].length;
        continue;
      }
      if (rest.startsWith("#")) {
        push(rest, "comment");
        break;
      }
      if (rest.startsWith('"')) {
        // Double quotes: the string colour, with `$VAR` and `${VAR}` names plain.
        const end = rest.slice(1).search(/(?<!\\)"/);
        const text = end < 0 ? rest : rest.slice(0, end + 2);
        for (const part of text.split(/(\$\{[^}]*\}|\$[A-Za-z_]\w*)/)) {
          const braced = /^\$\{([^}]*)\}$/.exec(part);
          if (braced) {
            push("${", "string");
            push(braced[1] ?? "", "plain");
            push("}", "string");
          } else push(part, /^\$[A-Za-z_]/.test(part) ? "plain" : "string");
        }
        index += text.length;
        command = false;
        continue;
      }
      if (rest.startsWith("'")) {
        const end = rest.indexOf("'", 1);
        const text = end < 0 ? rest : rest.slice(0, end + 1);
        push(text, "string");
        index += text.length;
        command = false;
        continue;
      }
      const operator = /^(?:\d?>>?&?\d?|<|\|\||\||&&|;|&|\$\(|\(|\)|`)/.exec(rest);
      if (operator) {
        const text = operator[0];
        // Shiki: `|`, `||` and redirects in the keyword colour, `&&` and `;` plain.
        push(text, text === "&&" || text === ";" || text === "$(" || text === "(" || text === ")" || text === "`" ? "plain" : "keyword");
        index += text.length;
        command = text !== ")" && !/^\d?>/.test(text) && text !== "<";
        continue;
      }
      const variable = /^\$(?:\{[^}]*\}|[A-Za-z_]\w*|[0-9@#?$!*-])/.exec(rest);
      if (variable) {
        push(variable[0], "plain");
        index += variable[0].length;
        command = false;
        continue;
      }
      const word = /^[^\s|&;<>()$"'`]+/.exec(rest)?.[0] ?? rest.charAt(0);
      index += word.length;
      const assignment = /^([A-Za-z_]\w*)=(.*)$/.exec(word);
      if (SHELL_KEYWORDS.has(word) && (command || (word === "in" && forState === "in"))) {
        push(word, "keyword");
        command = SHELL_COMMAND_KEYWORDS.has(word);
        forState = word === "for" ? "name" : "none";
        continue;
      }
      // A test's brackets are plain, and what follows them is not a command.
      if (word === "[" || word === "[[" || word === "]" || word === "]]") {
        push(word, "plain");
        command = false;
        inTest = word.startsWith("[");
        continue;
      }
      if (inTest) {
        push(word, /^-[a-z]+$/.test(word) ? "keyword" : "plain");
        continue;
      }
      if (assignment && (command || runs.at(-2)?.content === "export")) {
        push(assignment[1] ?? "", "plain");
        push("=", "keyword");
        push(assignment[2] ?? "", "plain");
        continue;
      }
      if (forState === "name") {
        push(word, "plain");
        forState = "in";
        continue;
      }
      if (command) {
        push(word, SHELL_BUILTINS.has(word) ? "constant" : "function");
        command = false;
        continue;
      }
      push(word, /^-/.test(word) || /^\d+$/.test(word) ? "constant" : "string");
    }
    return runs;
  });
}
