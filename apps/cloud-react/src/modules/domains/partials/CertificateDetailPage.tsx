import { useState } from "react"

import { Badge, Button, EmptyState, KeyValueGrid } from "@datadack/common-ui"
import { Download, Globe, Info, Loader2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import { ConfirmDialog, DetailPage, StatusBadge } from "@/components/console"
import { LB_ROUTES } from "@/modules/load-balancers/load-balancers.constants"
import { MANAGED_APPS_ROUTES } from "@/modules/managed-apps/managed-apps.constants"
import { VMS_ROUTES } from "@/modules/vms/vms.constants"
import { useScreen } from "@/services/api/screen"

import {
  useCertificate,
  useDownloadChain,
  useRemoveCertificate,
  useRenewCertificate,
} from "../certificates.hooks"
import type { Certificate, CertificateHostname } from "../certificates.types"
import { ExpiryText, SourceBadge } from "./CertificateFacts"
import { CertificateStatusBadge } from "./CertificateStatusBadge"

const BACK = "/domains/certificates"

function formatDate(value?: string): string {
  if (!value) return "—"
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

/** Groups a SHA-256 hex digest into colon pairs — the form browsers show it in. */
function formatFingerprint(hex?: string): string {
  if (!hex) return "—"
  return (hex.toUpperCase().match(/.{2}/g) ?? []).join(":")
}

function resourceRoute(host: CertificateHostname): string | null {
  if (!host.resource_id) return null
  switch (host.resource_type) {
    case "app":
      return MANAGED_APPS_ROUTES.projectDomains(host.resource_id)
    case "vm":
      return VMS_ROUTES.detail(host.resource_id)
    case "lb":
      return LB_ROUTES.detail(host.resource_id)
    default:
      return null
  }
}

export function CertificateDetailPage() {
  useScreen("domains.certificate-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const { data: cert, isLoading, isError } = useCertificate(id)
  const renew = useRenewCertificate()
  const remove = useRemoveCertificate()
  const download = useDownloadChain()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("common.loading")}
      </div>
    )
  }
  if (isError || !cert) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("domains.certificates.notFound")}
        description={t("domains.certificates.notFoundSubtitle")}
        action={{ label: t("domains.certificates.back"), onClick: () => void navigate(BACK) }}
      />
    )
  }

  const hasCertificate = Boolean(cert.fingerprint_sha256)

  return (
    <>
      <DetailPage
        backTo={BACK}
        backLabel={t("console.nav.items.certsManager")}
        icon={ShieldCheck}
        title={cert.subject}
        statusNode={<CertificateStatusBadge status={cert.status} autoRenew={cert.auto_renew} />}
        id={cert.id}
        actions={
          <div className="flex items-center gap-2">
            {hasCertificate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  download.mutate(cert)
                }}
                disabled={download.isPending}
              >
                <Download className="size-4" />
                {t("domains.certificates.actions.download")}
              </Button>
            )}
            {cert.renewable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  renew.mutate(cert)
                }}
                disabled={renew.isPending}
              >
                <RefreshCw className={`size-4 ${renew.isPending ? "animate-spin" : ""}`} />
                {t("domains.certificates.actions.renew")}
              </Button>
            )}
            {cert.deletable && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setConfirmDelete(true)
                }}
              >
                <Trash2 className="size-4" />
                {t("domains.certificates.actions.remove")}
              </Button>
            )}
          </div>
        }
        tabs={[
          {
            value: "overview",
            label: t("domains.certificates.tabs.overview"),
            content: <Overview cert={cert} />,
          },
          {
            value: "domains",
            label: t("domains.certificates.tabs.inUse", { count: cert.in_use_by?.length ?? 0 }),
            icon: Globe,
            content: <InUse cert={cert} />,
          },
        ]}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("domains.certificates.actions.removeConfirmTitle", { subject: cert.subject })}
        description={t("domains.certificates.actions.removeConfirmBody")}
        confirmLabel={t("domains.certificates.actions.remove")}
        loading={remove.isPending}
        onConfirm={() => {
          remove.mutate(cert, {
            onSuccess: () => {
              setConfirmDelete(false)
              void navigate(BACK)
            },
          })
        }}
      />
    </>
  )
}

function Overview({ cert }: Readonly<{ cert: Certificate }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      {cert.last_error && (
        <p className="rounded-lg border border-status-danger/40 bg-status-danger/5 px-3 py-2 text-sm text-status-danger">
          {cert.last_error}
        </p>
      )}
      {cert.status === "pending_validation" && (
        <p className="flex gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
          {t("domains.certificates.pendingHelp")}
        </p>
      )}
      {!cert.auto_renew && cert.days_remaining <= 30 && cert.not_after && (
        <p className="flex gap-2 rounded-lg border border-status-warning/40 bg-status-warning/5 px-3 py-2 text-sm text-status-warning">
          <Info className="mt-0.5 size-4 shrink-0" />
          {t("domains.certificates.importExpiringHelp")}
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t("domains.certificates.sections.status")}</h3>
        <KeyValueGrid
          copiedLabel={t("console.copy.copied")}
          items={[
            {
              label: t("domains.certificates.fields.type"),
              value: <SourceBadge cert={cert} t={t} />,
            },
            {
              label: t("domains.certificates.fields.renewal"),
              value: cert.auto_renew
                ? t("domains.certificates.autoRenewLong")
                : t("domains.certificates.manualRenewLong"),
            },
            {
              label: t("domains.certificates.fields.expires"),
              value: <ExpiryText cert={cert} t={t} />,
            },
            { label: t("domains.certificates.fields.notAfter"), value: formatDate(cert.not_after) },
            {
              label: t("domains.certificates.fields.notBefore"),
              value: formatDate(cert.not_before),
            },
            {
              label: t("domains.certificates.fields.issuedAt"),
              value: formatDate(cert.issued_at ?? cert.requested_at),
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t("domains.certificates.sections.names")}</h3>
        <div className="flex flex-wrap gap-1.5">
          {cert.sans.map((name) => (
            <Badge key={name} variant="outline" className="font-mono text-[12px]">
              {name}
            </Badge>
          ))}
        </div>
      </section>

      {cert.fingerprint_sha256 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("domains.certificates.sections.details")}</h3>
          <KeyValueGrid
            copiedLabel={t("console.copy.copied")}
            items={[
              { label: t("domains.certificates.fields.issuer"), value: cert.issuer_cn ?? "—" },
              {
                label: t("domains.certificates.fields.keyAlgorithm"),
                value: cert.key_algorithm ?? "—",
              },
              {
                label: t("domains.certificates.fields.signatureAlgorithm"),
                value: cert.signature_algorithm ?? "—",
              },
              {
                label: t("domains.certificates.fields.chain"),
                value:
                  (cert.chain_length ?? 0) < 2 ? (
                    <span className="text-status-warning">
                      {t("domains.certificates.chainMissing")}
                    </span>
                  ) : (
                    t("domains.certificates.chainCount", { count: cert.chain_length })
                  ),
              },
              {
                label: t("domains.certificates.fields.serial"),
                value: cert.serial ?? "",
                mono: true,
                copyable: true,
              },
              {
                label: t("domains.certificates.fields.fingerprint"),
                value: formatFingerprint(cert.fingerprint_sha256),
                mono: true,
                copyable: true,
              },
            ]}
          />
        </section>
      )}
    </div>
  )
}

function InUse({ cert }: Readonly<{ cert: Certificate }>) {
  const { t } = useTranslation()
  const hosts = cert.in_use_by ?? []
  if (hosts.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title={t("domains.certificates.notInUse")}
        description={t("domains.certificates.notInUseSubtitle")}
      />
    )
  }
  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border/60">
      {hosts.map((host) => {
        const route = resourceRoute(host)
        return (
          <div key={host.hostname} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Globe className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-[13px]">{host.hostname}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge status={host.status} />
              {route && (
                <Link
                  to={route}
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  {t("domains.certificates.openResource")}
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
