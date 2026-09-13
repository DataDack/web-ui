import { SERVERLESS_ORIGIN } from "@/services/api/serverless-origin"

import { createFaasHttp, faasErrorMessage } from "./faas.client"
import type { CreateFunctionFromSourceRequest, CreateFunctionRequest } from "./serverless.types"

// The console's own create forms, posted straight to the control plane.
//
// They were the last calls on cloud-be-go's serverless gateway. It is gone, and
// with it the reason they were there: the KYC gate now runs in the platform's
// central auth callback (which the control plane consults for every console
// user), and the naming convention and object ceilings arrive on the per-account
// quota policy the control plane already fetches — so every gate the proxy
// applied is applied here, to traffic arriving by any route rather than only
// the one that went through the proxy.
//
// These do not use ServerlessTransport's create methods, and that is
// deliberate: the shared package's input types are the subset its own UI needs,
// while this console's form also sets labels, layers and a resource group.
// Routing it through the narrower type would silently drop all three. The
// bodies here are the control plane's native shapes, sent verbatim.
//
// No region parameter. The gateway took one to choose a regional endpoint;
// `/v1` is served from this console's own origin now, so the region is the
// origin. See services/api/serverless-origin.ts.

const faas = createFaasHttp({ getBaseUrl: () => SERVERLESS_ORIGIN })

/** Create from an uploaded archive or a container image. */
export async function createFunctionDirect(body: CreateFunctionRequest): Promise<void> {
  try {
    await faas.post("/v1/functions", body)
  } catch (e) {
    throw new Error(faasErrorMessage(e, "Could not deploy the function"))
  }
}

/** Blank-starter deploy: inline files the control plane zips server-side. */
export async function createFunctionFromSourceDirect(
  body: CreateFunctionFromSourceRequest,
): Promise<void> {
  try {
    await faas.post("/v1/functions/source", body)
  } catch (e) {
    throw new Error(faasErrorMessage(e, "Could not deploy the function"))
  }
}
