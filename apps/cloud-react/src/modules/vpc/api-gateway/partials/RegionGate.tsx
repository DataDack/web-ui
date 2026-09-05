import type { ReactNode } from "react"

import { EmptyState } from "@datadack/common-ui"
import { Webhook } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useServerlessOrigin } from "@/services/api/serverless-origin"

/**
 * Renders its children only when the active region has a reachable API Gateway
 * control plane.
 *
 * The control plane moved to the serverless service on 2026-09-05, so this
 * section no longer talks to the platform gateway — it talks to a per-region
 * serverless origin, and a region can legitimately have none. Without this gate every
 * query below would throw NoServerlessOriginError on mount and the page would fill
 * with red toasts saying nothing useful.
 *
 * It wraps the three route components rather than each query, because those
 * three are the only entry points and every hook in this module sits under one
 * of them. Gating at the top means a new tab or panel is covered the day it is
 * added, instead of the day someone remembers to guard its query.
 *
 * `null` is the unavailable state; the origin is resolved once, app-wide, by
 * ServerlessDataProvider. `undefined` never occurs — the store's initial value
 * is null — so a region with no serverless service and a not-yet-resolved region are the same
 * render. That is deliberate: the endpoint map is fetched on sign-in and the
 * flash before it lands is one paint, not a spinner worth building.
 */
export function RegionGate({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const { t } = useTranslation()
  const origin = useServerlessOrigin()
  if (origin === null) {
    return (
      <EmptyState
        icon={Webhook}
        title={t("apiGateway.unavailable.title")}
        description={t("apiGateway.unavailable.description")}
      />
    )
  }
  return children
}
