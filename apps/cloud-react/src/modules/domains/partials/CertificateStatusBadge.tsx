import { Badge, cn } from "@datadack/common-ui"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { TONE_CLASSES, type StatusTone } from "@/components/console/status-config"

import type { CertificateStatus } from "../certificates.types"

// Its own tone map rather than the shared one, because one word means something
// different here. Across the console "expired" is inert history — a closed
// invoice, a lapsed invite — and renders neutral grey. An expired certificate is
// a hostname every browser is refusing right now, and grey is the one colour it
// must not be.
const TONES: Record<CertificateStatus, StatusTone> = {
  issued: "success",
  pending_validation: "info",
  expiring: "warning",
  expired: "danger",
  failed: "danger",
}

export function CertificateStatusBadge({
  status,
  autoRenew,
}: Readonly<{ status: CertificateStatus; autoRenew?: boolean }>) {
  const { t } = useTranslation()
  // A managed certificate inside its renewal window is the platform working as
  // designed, and saying "expiring" in amber about it would train people to
  // ignore the badge that matters: the imported one nothing will renew.
  const shown = status === "expiring" && autoRenew ? "renewing" : status
  const tone = shown === "renewing" ? "info" : TONES[status]
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] gap-1.5", TONE_CLASSES[tone])}>
      {status === "pending_validation" && <Loader2 className="size-3 animate-spin" />}
      {t(`domains.certificates.status.${shown}`)}
    </Badge>
  )
}
