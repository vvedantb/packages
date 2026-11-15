// Shared oxlint JS plugin for the @vvedantb monorepos. Rule ids have no app
// prefix; configure them under the plugin name `vvedantb`, for example:
//
//   // .oxlintrc.json
//   {
//     "jsPlugins": [
//       { "name": "vvedantb", "specifier": "@vvedantb/config/oxlint/plugin.mjs" }
//     ],
//     "rules": {
//       "vvedantb/no-value-block-in-try": "error",
//       "vvedantb/no-source-text-in-tests": "error",
//       "vvedantb/no-double-cast": "error",
//       "vvedantb/no-json-parse": "error",
//       "vvedantb/no-is-record": "error"
//     }
//   }
//
// Eleven rules ship; see the package README for the full list.
// oxlint reports each as `vvedantb(<rule>)`.

import noDoubleCast from "./rules/no-double-cast.mjs";
import noJsonParse from "./rules/no-json-parse.mjs";
import noConditionalTests from "./rules/no-conditional-tests.mjs";
import noInlineObjectTypeAssertion from "./rules/no-inline-object-type-assertion.mjs";
import noInlineZodSchema from "./rules/no-inline-zod-schema.mjs";
import noIsRecord from "./rules/no-is-record.mjs";
import noTsNocheck from "./rules/no-ts-nocheck.mjs";
import noUnknownShapeProbing from "./rules/no-unknown-shape-probing.mjs";
import preferSchemaInferredTypes from "./rules/prefer-schema-inferred-types.mjs";
import noSourceTextInTests from "./rules/no-source-text-in-tests.mjs";
import noValueBlockInTry from "./rules/no-value-block-in-try.mjs";

export default {
  meta: { name: "vvedantb" },
  rules: {
    "no-conditional-tests": noConditionalTests,
    "no-double-cast": noDoubleCast,
    "no-inline-object-type-assertion": noInlineObjectTypeAssertion,
    "no-inline-zod-schema": noInlineZodSchema,
    "no-is-record": noIsRecord,
    "no-json-parse": noJsonParse,
    "no-source-text-in-tests": noSourceTextInTests,
    "no-ts-nocheck": noTsNocheck,
    "no-unknown-shape-probing": noUnknownShapeProbing,
    "no-value-block-in-try": noValueBlockInTry,
    "prefer-schema-inferred-types": preferSchemaInferredTypes,
  },
};
