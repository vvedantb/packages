import { isIdentifier } from "../utils.mjs";

const strictMessage =
  "Do not assign a bare `JSON.parse(...)` result — it is `any` and flows " +
  "unchecked. Validate at the boundary: `schema.safeParse(JSON.parse(x))` or " +
  "`schema.parse(JSON.parse(x))`.";

const lenientMessage =
  strictMessage +
  " Or annotate the result `: unknown` (or `as unknown`) so downstream code " +
  "must narrow it.";

const isJsonParse = (node) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  isIdentifier(node.callee.object, "JSON") &&
  isIdentifier(node.callee.property, "parse");

const isUnknownKeyword = (node) => node?.type === "TSUnknownKeyword";

/**
 * Flags a bare `JSON.parse(...)` whose `any` result flows unchecked.
 *
 * Always allowed: wrapping in a schema parse (`schema.safeParse(JSON.parse(x))`
 * or `schema.parse(JSON.parse(x))`). With `allowUnknownEscapeHatch: true`, a
 * `: unknown` annotation or `as unknown` cast is also allowed (vmem's original
 * behaviour); the default is strict (eva's), where `unknown` is not an escape.
 */
export default {
  meta: {
    type: "problem",
    docs: { description: strictMessage },
    schema: [
      {
        type: "object",
        properties: { allowUnknownEscapeHatch: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const allowUnknown = context.options?.[0]?.allowUnknownEscapeHatch === true;
    const message = allowUnknown ? lenientMessage : strictMessage;
    // JSON.parse nodes that sit in a disciplined position. Enclosing nodes are
    // visited before the inner JSON.parse (top-down), so this is populated in
    // time for the check below.
    const allowed = new Set();
    const allow = (node) => {
      if (isJsonParse(node)) allowed.add(node);
    };

    const visitors = {
      CallExpression(node) {
        const callee = node.callee;
        // `schema.safeParse(JSON.parse(...))` / `schema.parse(JSON.parse(...))`
        if (
          callee?.type === "MemberExpression" &&
          !isIdentifier(callee.object, "JSON") &&
          (isIdentifier(callee.property, "safeParse") ||
            isIdentifier(callee.property, "parse"))
        ) {
          for (const arg of node.arguments ?? []) allow(arg);
        }

        if (isJsonParse(node) && !allowed.has(node)) {
          context.report({ node, message });
        }
      },
    };

    if (allowUnknown) {
      // `const x: unknown = JSON.parse(...)`
      visitors.VariableDeclarator = (node) => {
        if (isUnknownKeyword(node.id?.typeAnnotation?.typeAnnotation)) {
          allow(node.init);
        }
      };
      // `JSON.parse(...) as unknown`
      visitors.TSAsExpression = (node) => {
        if (isUnknownKeyword(node.typeAnnotation)) allow(node.expression);
      };
    }

    return visitors;
  },
};
