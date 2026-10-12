import type { RpcResult } from "../../../src/index.js";

/**
 * Stand-ins for the apps' `ctx.runAction(internal.mcp.nodeActions.*)` calls.
 * Both the reference ports and the kit configs call these, so a test can
 * compare their HTTP output for the same verifier and RPC results.
 */
export type AppDeps<Credentials, RpcArgs> = {
  verifyAccessToken(args: { token: string }): Promise<Credentials | null>;
  handleMcpRequest(args: RpcArgs): Promise<RpcResult>;
};

export type AppCtx<Credentials, RpcArgs> = { deps: AppDeps<Credentials, RpcArgs> };

// Method syntax keeps the parameters bivariant, so one table can hold every app's handler.
export type Handler<Credentials, RpcArgs> = {
  handle(ctx: AppCtx<Credentials, RpcArgs>, request: Request): Promise<Response>;
}["handle"];
