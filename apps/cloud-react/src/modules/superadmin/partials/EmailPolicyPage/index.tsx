import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Skeleton,
  Switch,
  cn,
  timeAgo,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AtSign,
  FolderOpen,
  Lock,
  MailX,
  Plus,
  RefreshCw,
  ShieldBan,
  Timer,
  Trash2,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { AddDomainsDialog } from "./AddDomainsDialog"
import { CheckAddressCard } from "./CheckAddressCard"
import { PlusAliasCard } from "./PlusAliasCard"
import {
  useAddBlockedDomains,
  useCheckEmailPolicy,
  useEmailPolicy,
  useRefreshEmailPolicy,
  useRemoveBlockedDomain,
  useUpdateEmailPolicy,
} from "../../superadmin.hooks"
import type { BlockedDomain, PlusAliasMode } from "../../superadmin.types"

/** A domain flattened out of its list, so one table shows the whole blocklist. */
interface DomainRow extends BlockedDomain {
  list: string
}

/**
 * The signup email gate.
 *
 * Two questions, one page: which email domains may open an account, and what
 * signup does with a plus-addressed alias. Both used to have no answer — anyone
 * could sign up at example.com, and one person could collect a free-tier quota
 * per +tag they invented.
 *
 * Unlike the platform policy switches next door, none of this is in the
 * database: the policy and the lists are JSON files in the service S3 bucket,
 * which is why the page names the folder. An operator can upload a
 * 10,000-domain list there directly and hit refresh — the console is the
 * convenient way to edit the lists, not the only one.
 */
export function EmailPolicyPage() {
  useScreen("superadmin.emailPolicy")
  const { t } = useTranslation()

  const { data, isLoading, isError } = useEmailPolicy()
  const { mutate: refresh, isPending: refreshing } = useRefreshEmailPolicy()
  const { mutate: save, isPending: saving } = useUpdateEmailPolicy()
  const { mutate: addDomains, isPending: adding } = useAddBlockedDomains()
  const { mutate: removeDomain, isPending: removing } = useRemoveBlockedDomain()
  const { mutate: check, data: checkResult, isPending: checking } = useCheckEmailPolicy()

  const [addOpen, setAddOpen] = useState(false)

  const rows = useMemo<DomainRow[]>(
    () => data?.lists.flatMap((l) => l.domains.map((d) => ({ ...d, list: l.id }))) ?? [],
    [data],
  )

  // Feeds the add dialog's "this domain already has accounts" warning, so it
  // can warn about a domain that is not on any list yet.
  const usersByDomain = useMemo(
    () => new Map<string, number>(rows.map((r) => [r.domain, r.users] as const)),
    [rows],
  )

  const editable = data?.editable ?? false
  const busy = saving || adding || removing

  const columns = useMemo<ColumnDef<DomainRow>[]>(
    () => [
      {
        id: "domain",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.emailPolicy.table.domain")}
          </span>
        ),
        accessorFn: (d) => d.domain,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-foreground">{row.original.domain}</span>
            {row.original.builtin && (
              <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                <Lock className="size-3" />
                {t("superAdmin.emailPolicy.table.builtin")}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "list",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.emailPolicy.table.list")}
          </span>
        ),
        accessorFn: (d) => d.list,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            {row.original.list}
          </Badge>
        ),
        meta: { responsive: "md" },
      },
      {
        id: "users",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.emailPolicy.table.users")}
          </span>
        ),
        accessorFn: (d) => d.users,
        cell: ({ row }) =>
          row.original.users > 0 ? (
            // Worth seeing, not worth alarming about: those accounts keep
            // working, they just cannot be joined by new ones.
            <span className="font-mono text-[12px] text-status-warning">{row.original.users}</span>
          ) : (
            <span className="font-mono text-[12px] text-muted-foreground">0</span>
          ),
        meta: { responsive: "md" },
      },
      {
        id: "reason",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.emailPolicy.table.reason")}
          </span>
        ),
        accessorFn: (d) => d.reason ?? "",
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">{row.original.reason || "—"}</span>
        ),
        meta: { responsive: "lg" },
      },
      {
        id: "added",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.emailPolicy.table.added")}
          </span>
        ),
        accessorFn: (d) => d.added_at ?? "",
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {row.original.added_at ? timeAgo(row.original.added_at) : "—"}
          </span>
        ),
        meta: { responsive: "xl" },
      },
      {
        id: "remove",
        header: () => null,
        enableSorting: false,
        meta: { interactive: true },
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              // Built-ins are rendered disabled rather than hidden: an operator
              // looking for the button should find it and be told why it is not
              // available, instead of wondering where it went.
              disabled={row.original.builtin || !editable || busy}
              title={
                row.original.builtin
                  ? t("superAdmin.emailPolicy.table.builtinHint")
                  : t("superAdmin.emailPolicy.table.remove")
              }
              aria-label={t("superAdmin.emailPolicy.table.remove")}
              onClick={() => {
                removeDomain(row.original.domain)
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, editable, busy, removeDomain],
  )

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        icon={MailX}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.emailPolicy.title") },
        ]}
        title={t("superAdmin.emailPolicy.title")}
        description={t("superAdmin.emailPolicy.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              // Re-reads the S3 folder rather than the backend's cached
              // snapshot, so a bulk list uploaded to the bucket shows up here
              // without waiting out the cache.
              onClick={() => {
                refresh()
              }}
              disabled={refreshing}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              className="gap-2"
              disabled={!editable}
              onClick={() => {
                setAddOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              {t("superAdmin.emailPolicy.add.action")}
            </Button>
          </>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {isError && (
        <EmptyState
          icon={MailX}
          title={t("superAdmin.emailPolicy.loadFailed")}
          description={t("superAdmin.emailPolicy.loadFailedSubtitle")}
          action={{
            label: t("common.refresh"),
            onClick: () => {
              refresh()
            },
          }}
        />
      )}

      {!isLoading && !isError && data && (
        <>
          {!editable && (
            <div className="rounded-lg border border-status-warning/30 bg-status-warning/5 p-3 text-[13px] text-status-warning">
              {t("superAdmin.emailPolicy.readOnly")}
            </div>
          )}

          <PlusAliasCard
            value={data.plus_alias}
            modes={data.modes}
            disabled={!editable || busy}
            onChange={(mode: PlusAliasMode) => {
              save({ plus_alias: mode })
            }}
          />

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md border",
                    data.block_domains
                      ? "border-status-success/30 bg-status-success/10 text-status-success"
                      : "border-border/60 bg-muted/40 text-muted-foreground",
                  )}
                >
                  <ShieldBan className="size-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("superAdmin.emailPolicy.blocking.title")}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-wide",
                        data.block_domains
                          ? "border-status-success/30 text-status-success"
                          : "border-status-warning/30 text-status-warning",
                      )}
                    >
                      {t(
                        data.block_domains
                          ? "superAdmin.platformSettings.state.enforced"
                          : "superAdmin.platformSettings.state.notEnforced",
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {t("superAdmin.emailPolicy.blocking.count", { count: data.total_domains })}
                    </Badge>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {t("superAdmin.emailPolicy.blocking.description")}
                  </p>
                  {/* Only shown while off: this is the state tenants are
					          actually in, not a preview of what a click would do. */}
                  {!data.block_domains && (
                    <p className="text-[13px] text-status-warning">
                      {t("superAdmin.emailPolicy.blocking.offConsequence")}
                    </p>
                  )}
                </div>
              </div>

              <Switch
                checked={data.block_domains}
                disabled={!editable || busy}
                aria-label={t("superAdmin.emailPolicy.blocking.title")}
                onCheckedChange={(checked) => {
                  save({ block_domains: checked })
                }}
              />
            </div>
          </Card>

          <CheckAddressCard
            pending={checking}
            result={checkResult ?? null}
            onCheck={(email) => {
              check({ email })
            }}
          />

          <DataTable<DomainRow>
            data={rows}
            columns={columns}
            getRowId={(d) => `${d.list}:${d.domain}`}
            searchable
            searchPlaceholder={t("superAdmin.emailPolicy.table.search")}
            empty={
              <EmptyState
                icon={AtSign}
                title={t("superAdmin.emailPolicy.table.empty")}
                description={t("superAdmin.emailPolicy.table.emptySubtitle")}
                action={
                  editable
                    ? {
                        label: t("superAdmin.emailPolicy.add.action"),
                        onClick: () => {
                          setAddOpen(true)
                        },
                      }
                    : undefined
                }
              />
            }
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Timer className="size-3.5" />
              {t("superAdmin.emailPolicy.propagation", { count: data.propagation_seconds })}
            </span>
            {/* Named because the folder is the other way to edit this: any
			        *.json dropped in it is picked up as another list. */}
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen className="size-3.5" />
              <code className="font-mono text-[11px]">{data.location}</code>
            </span>
            {data.updated_at && (
              <span>
                {t("superAdmin.emailPolicy.lastChanged", { when: timeAgo(data.updated_at) })}
              </span>
            )}
          </div>
        </>
      )}

      <AddDomainsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        pending={adding}
        usersByDomain={usersByDomain}
        onSubmit={(domains, reason) => {
          addDomains(
            { domains, ...(reason !== "" && { reason }) },
            {
              onSuccess: () => {
                setAddOpen(false)
              },
            },
          )
        }}
      />
    </div>
  )
}
