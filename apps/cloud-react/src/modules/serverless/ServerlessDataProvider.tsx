import { useMemo, type ReactNode } from "react"

import {
  ServerlessProvider,
  type CreateFromSourceInput,
  type ServerlessTransport,
} from "@datadack/serverless"

import { useResourceGroup } from "@/modules/resource-groups/resource-group.context"
import { SERVERLESS_ORIGIN } from "@/services/api/serverless-origin"


import { createFaasTransport } from "./faas.client"

// Wires the shared @datadack/serverless components to their data source.
//
// EVERY call goes straight to the FaaS control plane. There is no second path
// any more: cloud-be-go used to proxy creation, layer publishing, artifact
// presigning and the activity feed, because the KYC, naming-policy and
// object-quota gates lived only there. Those gates moved to the control plane
// (KYC into the platform's auth callback; the naming convention and the object
// ceilings onto the per-account quota policy it already fetches), so the proxy
// had nothing left to add — while still needing a twin route, with a matching
// permission, for everything the console might call.
//
// The FaaS origin is this console's own and is resolvable without asking: see
// services/api/serverless-origin.ts for why the region -> origin map this
// provider used to fetch at sign-in is gone.
export function ServerlessDataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { activeRG } = useResourceGroup()

  const transport = useMemo<ServerlessTransport>(() => {
    const faas = createFaasTransport({ getBaseUrl: () => SERVERLESS_ORIGIN })
    return {
      ...faas,
      // Stamp the console's active resource group onto the new function.
      // Nothing else ever sets it, so without this every function is created
      // ungrouped and the group filters have nothing to offer. An explicit id
      // on the input wins, and no active group sends no field rather than an
      // empty one.
      createFromSource: (input: CreateFromSourceInput) => {
        const resourceGroupId = input.resourceGroupId ?? activeRG?.id
        return faas.createFromSource({
          ...input,
          ...(resourceGroupId ? { resourceGroupId } : {}),
        })
      },
    }
  }, [activeRG?.id])

  return <ServerlessProvider transport={transport}>{children}</ServerlessProvider>
}
