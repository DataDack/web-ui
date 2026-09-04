import { Badge, CopyButton, KeyValueGrid } from "@datadack/common-ui"
import { Boxes, Link2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Section } from "@/components/console"

import type { APIGateway } from "../apigw.types"

export function OverviewTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const facts = [
    ["id", api.id, true],
    ["protocol", api.protocol_type],
    ["region", api.region],
    ["endpointType", api.endpoint_type],
    ["ipAddressType", api.ip_address_type],
    ["tlsPolicy", api.security_policy],
    ["version", api.version || "—"],
    ["created", new Date(api.created_at).toLocaleString()],
    ["updated", new Date(api.updated_at).toLocaleString()],
  ].map(([key, value, copyable]) => ({
    label: t(`apiGateway.overview.${String(key)}`),
    value: String(value),
    mono: Boolean(copyable),
    copyable: Boolean(copyable),
  }))
  const counts = [
    ["routes", api.routes?.length ?? 0],
    ["integrations", api.integrations?.length ?? 0],
    ["authorizers", api.authorizers?.length ?? 0],
    ["stages", api.stages?.length ?? 0],
    ["deployments", 0],
  ]
  return (
    <div className="space-y-5">
      <Section variant="panel" title={t("apiGateway.overview.identity")} icon={Boxes}>
        <KeyValueGrid items={facts} columns={3} />
      </Section>
      <Section variant="panel" title={t("apiGateway.overview.resources")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {counts.map(([key, count]) => (
            <Link
              key={key}
              to={`?tab=${key}`}
              className="glass-1 p-4 transition-colors hover:bg-muted/40"
            >
              <div className="text-2xl font-semibold">{count}</div>
              <div className="text-xs text-muted-foreground">{t(`apiGateway.tabs.${key}`)}</div>
            </Link>
          ))}
        </div>
      </Section>
      <Section variant="panel" title={t("apiGateway.overview.invokeUrl")} icon={Link2}>
        <div className="flex flex-wrap items-center gap-2">
          <code className="break-all text-base">{api.api_endpoint}</code>
          <CopyButton value={api.api_endpoint} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("apiGateway.overview.routingInactive")}
        </p>
        <Badge variant="outline" className="mt-3">
          {t("apiGateway.overview.controlPlaneOnly")}
        </Badge>
      </Section>
    </div>
  )
}
