import { useMemo, type ReactNode } from "react"

import { useActiveRegion } from "@/modules/region/region.context"
import { useResourceGroup } from "@/modules/resource-groups/resource-group.context"
import { SERVERLESS_ORIGIN } from "@/services/api/serverless-origin"

import {
  ServerlessProvider,
  type CreatedFunction,
  type CreateFromSourceInput,
  type ServerlessTransport,
} from "@datadack/serverless"

import { createFaasTransport } from "./faas.client"
import { serverlessApi } from "./serverless.api"

// Wires the shared @datadack/serverless components to their data source.
//
// Reads/aliases/invoke/config-edit go STRAIGHT to the FaaS control plane
// (faas.client.ts) — the gateway hop bought nothing for them. Creation stays on
// the gateway on purpose: the KYC, naming-policy and object-quota gates only
// exist there.
//
// The FaaS origin is this console's own, and always has been resolvable without
// asking: see services/api/serverless-origin.ts for why the region -> origin
// map this provider used to fetch at sign-in is gone.

export function ServerlessDataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { activeRegionCode } = useActiveRegion()
  const { activeRG } = useResourceGroup()

  // One transport per region, which the gateway-side create closes over. A
  // region switch swaps the closure, not the axios instance.
  const transport = useMemo<ServerlessTransport>(() => {
    // Stamp the console's active resource group onto the new function. Nothing
    // else ever sets it, so without this every function is created ungrouped and
    // the group filters have nothing to offer. An explicit id on the input wins,
    // and no active group sends no field rather than an empty one.
    const createFromSource = async (input: CreateFromSourceInput): Promise<CreatedFunction> => {
      const resourceGroupId = input.resourceGroupId ?? activeRG?.id
      await serverlessApi.createFunctionFromSource(activeRegionCode, {
        ...input,
        ...(resourceGroupId ? { resourceGroupId } : {}),
      })
      return { name: input.name }
    }
    return {
      ...createFaasTransport({ getBaseUrl: () => SERVERLESS_ORIGIN }),
      createFromSource,
      // Gateway-backed, like createFromSource: publishing a layer and the
      // activity feed both go through cloud-be-go, and uploads need its presign.
      // These sit here rather than in faas.client.ts because that file talks to
      // the regional control plane and these do not.
      publishLayer: async (input) => {
        await serverlessApi.publishLayer(activeRegionCode, input)
      },
      activity: () => serverlessApi.activity(),
      uploadArtifact: async (file, kind) => {
        const slot = await serverlessApi.presignUpload(activeRegionCode, {
          kind: kind ?? "functions",
          filename: file.name,
          contentType: file.type || "application/zip",
        })
        await serverlessApi.uploadArtifact(slot, file)
        return { bucket: slot.bucket, key: slot.key }
      },
    }
  }, [activeRegionCode, activeRG?.id])

  return <ServerlessProvider transport={transport}>{children}</ServerlessProvider>
}
