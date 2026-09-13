import type { ReactNode } from "react"

import { useActiveScope } from "@/services/api/active-scope"

import { ApiGatewayProvider } from "@datadack/api-gateway"

import { apiGatewayTransport } from "./api-gateway.transport"

/**
 * Mounts the shared API Gateway console for this app.
 *
 * There used to be a RegionGate here, because the control plane lived on a
 * per-region serverless host and a region could legitimately have none — so the
 * console had to render an "unavailable here" screen instead of firing every
 * list on mount and filling the page with failures that all meant the same
 * thing. The domains are merged now (see services/api/serverless-origin.ts):
 * the control plane is on this origin, in every region, so there is nothing
 * left to gate on.
 *
 * The account id is passed as the query scope so switching tenants evicts the
 * cache. Without it the previous account's APIs stay on screen until the
 * refetch lands — stale data the operator was already shown, but an operator
 * who has just switched is exactly the one who cannot tell that from a leak.
 */
export function ApiGatewaySection({ children }: Readonly<{ children: ReactNode }>) {
  const accountId = useActiveScope().accountId

  return (
    <ApiGatewayProvider transport={apiGatewayTransport} scope={accountId ?? "none"}>
      {children}
    </ApiGatewayProvider>
  )
}
