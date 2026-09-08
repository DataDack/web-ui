import type { ReactNode } from "react"

import { useActiveScope } from "@/services/api/active-scope"

import { ApiGatewayProvider } from "@datadack/api-gateway"

import { apiGatewayTransport } from "./api-gateway.transport"
import { RegionGate } from "./RegionGate"

/**
 * Mounts the shared API Gateway console for this app.
 *
 * RegionGate stays outside the provider: a region with no serverless origin has
 * nothing to talk to, and rendering the console first would fire every list on
 * mount and fill the page with failures that all mean the same thing.
 *
 * The account id is passed as the query scope so switching tenants evicts the
 * cache. Without it the previous account's APIs stay on screen until the
 * refetch lands — stale data the operator was already shown, but an operator
 * who has just switched is exactly the one who cannot tell that from a leak.
 */
export function ApiGatewaySection({ children }: Readonly<{ children: ReactNode }>) {
  const accountId = useActiveScope().accountId

  return (
    <RegionGate>
      <ApiGatewayProvider transport={apiGatewayTransport} scope={accountId ?? "none"}>
        {children}
      </ApiGatewayProvider>
    </RegionGate>
  )
}
