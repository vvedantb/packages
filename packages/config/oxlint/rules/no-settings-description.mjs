// Flags a `description` prop on the settings layout components. A section or
// row shows a title only; helper text under it is extra reading for the user.
// Options: `{ "components": ["ProfileCard"] }` adds component names to the
// built-in list.

const DEFAULT_COMPONENTS = ["SettingsSection", "SettingsToggleRow", "LabeledSwitchRow"];

function elementName(name) {
  if (!name) return null;
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") return name.property.name;
  return null;
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow the `description` prop on settings sections and rows; show a title only.",
    },
    schema: [
      {
        type: "object",
        properties: {
          components: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const extra = context.options[0]?.components ?? [];
    const components = new Set([...DEFAULT_COMPONENTS, ...extra]);
    return {
      JSXOpeningElement(node) {
        const name = elementName(node.name);
        if (!name || !components.has(name)) return;
        for (const attribute of node.attributes) {
          if (attribute.type !== "JSXAttribute") continue;
          if (attribute.name.type !== "JSXIdentifier") continue;
          if (attribute.name.name !== "description") continue;
          context.report({
            message: `Remove \`description\` from <${name}>. A section or row shows a title only; do not add helper text unless the user asks for it.`,
            node: attribute,
          });
        }
      },
    };
  },
};
