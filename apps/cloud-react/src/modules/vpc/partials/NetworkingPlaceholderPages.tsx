import { ArrowRightLeft, Cable, Router, Waypoints } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ComingSoon } from "@/components/console"
import { useScreen } from "@/services/api/screen"

/**
 * Networking sub-services promoted out of the VPC detail tabs into their own
 * sidebar entries. Each renders a "coming soon" placeholder until the feature
 * is built out.
 */

const NETWORKING_GROUP_KEY = "console.nav.groups.networking"

export function RoutersPage() {
  useScreen("vpc.routers")
  const { t } = useTranslation()
  return (
    <ComingSoon
      icon={Router}
      title={t("console.nav.items.routers")}
      description={t("vpc.detail.routersDescription")}
      breadcrumbs={[{ label: t(NETWORKING_GROUP_KEY) }]}
    />
  )
}

export function InternetGatewaysPage() {
  useScreen("vpc.internet-gateways")
  const { t } = useTranslation()
  return (
    <ComingSoon
      icon={Waypoints}
      title={t("console.nav.items.internetGateways")}
      description={t("vpc.detail.internetGatewaysDescription")}
      breadcrumbs={[{ label: t(NETWORKING_GROUP_KEY) }]}
    />
  )
}

export function NatGatewaysPage() {
  useScreen("vpc.nat-gateways")
  const { t } = useTranslation()
  return (
    <ComingSoon
      icon={ArrowRightLeft}
      title={t("console.nav.items.natGateways")}
      description={t("vpc.detail.natGatewaysDescription")}
      breadcrumbs={[{ label: t(NETWORKING_GROUP_KEY) }]}
    />
  )
}

export function VpnPage() {
  useScreen("vpc.vpn")
  const { t } = useTranslation()
  return (
    <ComingSoon
      icon={Cable}
      title={t("console.nav.items.vpn")}
      description={t("vpc.detail.vpnDescription")}
      breadcrumbs={[{ label: t(NETWORKING_GROUP_KEY) }]}
    />
  )
}
