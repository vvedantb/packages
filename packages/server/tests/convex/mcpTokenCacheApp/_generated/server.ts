import {
  type DataModelFromSchemaDefinition,
  type GenericActionCtx,
  type MutationBuilder,
  type QueryBuilder,
} from "convex/server";
import type schema from "../schema.js";

// What `convex codegen` declares in _generated/server.d.ts.
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
export type ActionCtx = GenericActionCtx<DataModel>;
export declare const internalQuery: QueryBuilder<DataModel, "internal">;
export declare const internalMutation: MutationBuilder<DataModel, "internal">;
