import {
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createOptionsHandler,
  createProtectedResourceMetadata,
} from "@vvedantb/server";

export const optionsHandler = httpAction(createOptionsHandler({ cors: corsHeaders }));
export const oauthMetadata = httpAction(
  createAuthorizationServerMetadataProxy({
    cors: corsHeaders,
    // Operator-configured Clerk issuer; the URL still has to satisfy the outbound policy.
    fetch: (url) => fetch(assertOutboundUrl(url).toString()),
  }),
);
export const protectedResourceMetadata = httpAction(
  createProtectedResourceMetadata({ cors: corsHeaders }),
);
export const health = httpAction(
  createHealthHandler({ body: { status: "ok", service: "app-e" }, cors: corsHeaders }),
);
