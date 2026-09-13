// Where the serverless control plane lives, from the browser's point of view.
//
// It used to live on its own host (serverless.datadack.cloud), which is why
// there was a region -> origin map: the gateway published one at
// GET /serverless/functions/endpoints, ServerlessDataProvider resolved it once
// at sign-in, and every section that talks to the control plane read the answer
// out of a small store next to active-scope.ts.
//
// The domains are merged now. `/v1` (the native control API) and `/2015-03-31`
// (the Lambda-compatible invoke surface) are routed to the serverless service
// from THIS origin — by the reverse proxy in production, and by the dev proxy
// in vite.config.ts. So the answer is a constant, it is known before the first
// paint rather than one round trip after sign-in, and there is no region in
// which it is absent.
//
// That last part is why the endpoint map is gone rather than merely defaulted:
// its whole purpose was to express "this region has no serverless", and with a
// merged domain that state cannot occur. The store, the `null` case, and the
// gate that rendered an "unavailable in this region" screen went with it.
//
// Empty string, not window.location.origin: axios treats it as same-origin and
// leaves the request relative, which keeps it on whatever host the console was
// actually loaded from — including preview deployments.
export const SERVERLESS_ORIGIN = ""
