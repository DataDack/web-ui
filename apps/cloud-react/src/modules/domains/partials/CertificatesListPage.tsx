import { useMemo, useState } from "react"

import {
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { ChevronDown, FileKey2, Info, Plus, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PageHeader, StatGrid } from "@/components/console"
import { useDebounce } from "@/hooks/use-debounce"
import { useScreen } from "@/services/api/screen"

import {
  CERTIFICATES_PAGE_SIZE,
  useCertificateSummary,
  useCertificates,
  useRefreshCertificates,
} from "../certificates.hooks"
import type {
  Certificate,
  CertificateListParams,
  CertificateSource,
  CertificateStatusFilter,
} from "../certificates.types"
import { buildCertificateColumns } from "./certificate-columns"
import { ImportCertificateDialog } from "./ImportCertificateDialog"
import { RequestCertificateDialog } from "./RequestCertificateDialog"

type SourceFilter = CertificateSource | "all"
type StatusFilter = CertificateStatusFilter | "all"

const SOURCE_FILTERS: readonly SourceFilter[] = ["all", "managed", "imported"]
const STATUS_FILTERS: readonly StatusFilter[] = [
  "all",
  "issued",
  "expiring_soon",
  "pending_validation",
  "failed",
]

/**
 * Certs Manager: every TLS certificate that serves this account's domains.
 *
 * Most rows are certificates DataDack obtained and renews on its own; the rest
 * are ones the tenant imported, which nothing renews — that difference is the
 * one fact this page must never let a person miss, so it has its own column,
 * its own stat and its own badge colour.
 *
 * Hostnames under DataDack's own zones never appear here, and the banner says
 * why: they are served by the platform's wildcard, so there is nothing to manage.
 */
export function CertificatesListPage() {
  useScreen("domains.certificates")
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [source, setSource] = useState<SourceFilter>("all")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const q = useDebounce(search.trim(), 300)

  const params = useMemo<CertificateListParams>(
    () => ({
      page,
      limit: CERTIFICATES_PAGE_SIZE,
      source: source === "all" ? undefined : source,
      status: status === "all" ? undefined : status,
      q: q || undefined,
    }),
    [page, source, status, q],
  )

  const { data, isLoading, isError, refetch, isFetching } = useCertificates(params)
  const { data: summary, isLoading: summaryLoading } = useCertificateSummary()
  const refresh = useRefreshCertificates()
  const columns = useMemo(() => buildCertificateColumns(t), [t])
  const rows = data?.rows ?? []

  const attention = (summary?.expiring ?? 0) + (summary?.expired ?? 0)

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShieldCheck}
        breadcrumbs={[
          { label: t("console.nav.groups.domains") },
          { label: t("console.nav.items.certsManager") },
        ]}
        title={t("console.nav.items.certsManager")}
        description={t("domains.certificates.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                refresh.mutate()
              }}
              disabled={refresh.isPending || isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw
                className={`size-4 ${refresh.isPending || isFetching ? "animate-spin" : ""}`}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {t("domains.certificates.add")}
                  <ChevronDown className="size-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem
                  onSelect={() => {
                    setRequestOpen(true)
                  }}
                  className="items-start gap-3"
                >
                  <ShieldCheck className="mt-0.5 size-4" />
                  <div>
                    <div className="text-sm">{t("domains.certificates.request.menu")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("domains.certificates.request.menuHint")}
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setImportOpen(true)
                  }}
                  className="items-start gap-3"
                >
                  <FileKey2 className="mt-0.5 size-4" />
                  <div>
                    <div className="text-sm">{t("domains.certificates.import.menu")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("domains.certificates.import.menuHint")}
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <StatGrid
        stats={[
          {
            label: t("domains.certificates.stats.total"),
            value: summary?.total ?? 0,
            icon: ShieldCheck,
            loading: summaryLoading,
          },
          {
            label: t("domains.certificates.stats.issued"),
            value: summary?.issued ?? 0,
            color: "success",
            loading: summaryLoading,
          },
          {
            label: t("domains.certificates.stats.attention"),
            value: attention,
            color: attention > 0 ? "warning" : "default",
            loading: summaryLoading,
          },
          {
            label: t("domains.certificates.stats.imported"),
            value: summary?.imported ?? 0,
            icon: FileKey2,
            loading: summaryLoading,
          },
        ]}
      />

      {summary && !summary.issuer_enabled && (
        <p className="flex gap-2 rounded-lg border border-status-warning/40 bg-status-warning/5 px-3 py-2 text-xs text-status-warning">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {t("domains.certificates.issuerOff")}
        </p>
      )}
      {summary && summary.platform_zones.length > 0 && (
        <p className="flex gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {t("domains.certificates.platformCovered", {
            zones: summary.platform_zones.map((z) => `*.${z}`).join(", "),
          })}
        </p>
      )}

      <DataTable<Certificate>
        data={rows}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(cert) => cert.id}
        onRowClick={(cert) => {
          void navigate(`/domains/certificates/${cert.id}`)
        }}
        pagination={{
          page,
          pageSize: CERTIFICATES_PAGE_SIZE,
          total: data?.total ?? rows.length,
          onPageChange: setPage,
        }}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={source}
              onValueChange={(value) => {
                setSource(value as SourceFilter)
                setPage(1)
              }}
            >
              <SelectTrigger
                className="h-8 w-40 text-[13px]"
                aria-label={t("domains.certificates.columns.type")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_FILTERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "all"
                      ? t("domains.certificates.filters.allTypes")
                      : t(`domains.certificates.source.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as StatusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger
                className="h-8 w-44 text-[13px]"
                aria-label={t("domains.certificates.columns.status")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "all"
                      ? t("domains.filters.allStatuses")
                      : t(`domains.certificates.filters.status.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder={t("domains.certificates.searchPlaceholder")}
                className="h-8 pl-8 text-[13px]"
              />
            </div>
          </div>
        }
        empty={
          <EmptyState
            icon={ShieldCheck}
            title={t("domains.certificates.empty")}
            description={t("domains.certificates.emptySubtitle")}
          />
        }
      />

      <ImportCertificateDialog open={importOpen} onOpenChange={setImportOpen} />
      <RequestCertificateDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  )
}
