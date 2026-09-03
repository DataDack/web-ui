import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"

import type { DomainStatus, DomainType } from "../domains.types"

export type DomainTypeFilter = DomainType | "all"
// "released" rows are history, not something a user filters for — the spec'd
// filter set is pending/active/suspended. Released rows still render fine when
// they appear in an unfiltered list.
export type DomainStatusFilter = Extract<DomainStatus, "pending" | "active" | "suspended"> | "all"

const TYPE_FILTERS: readonly DomainTypeFilter[] = ["all", "func", "vm", "lb", "app"]
const STATUS_FILTERS: readonly DomainStatusFilter[] = ["all", "pending", "active", "suspended"]

interface DomainsFiltersProps {
  type: DomainTypeFilter
  onTypeChange: (value: DomainTypeFilter) => void
  status: DomainStatusFilter
  onStatusChange: (value: DomainStatusFilter) => void
  search: string
  onSearchChange: (value: string) => void
  /** Superadmin only: exact account scope. Rendered when a handler is given. */
  accountId?: string
  onAccountIdChange?: (value: string) => void
}

/**
 * The filter row both domain registry tables share, rendered into DataTable's
 * toolbar slot. Every filter is server-side: each change re-keys the list
 * query rather than narrowing rows already on screen.
 */
export function DomainsFilters({
  type,
  onTypeChange,
  status,
  onStatusChange,
  search,
  onSearchChange,
  accountId,
  onAccountIdChange,
}: Readonly<DomainsFiltersProps>) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={type}
        onValueChange={(value) => {
          onTypeChange(value as DomainTypeFilter)
        }}
      >
        <SelectTrigger className="h-8 w-40 text-[13px]" aria-label={t("domains.filters.type")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_FILTERS.map((value) => (
            <SelectItem key={value} value={value}>
              {value === "all"
                ? t("domains.filters.allTypes")
                : t(`domains.filters.types.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status}
        onValueChange={(value) => {
          onStatusChange(value as DomainStatusFilter)
        }}
      >
        <SelectTrigger className="h-8 w-40 text-[13px]" aria-label={t("domains.filters.status")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTERS.map((value) => (
            <SelectItem key={value} value={value}>
              {value === "all"
                ? t("domains.filters.allStatuses")
                : t(`status.${value}`, { defaultValue: value })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value)
          }}
          placeholder={t("domains.searchPlaceholder")}
          className="h-8 pl-8 text-[13px]"
        />
      </div>

      {onAccountIdChange && (
        <Input
          value={accountId ?? ""}
          onChange={(e) => {
            onAccountIdChange(e.target.value)
          }}
          placeholder={t("domains.filters.accountPlaceholder")}
          aria-label={t("domains.filters.accountId")}
          className="h-8 w-72 font-mono text-[12px]"
        />
      )}
    </div>
  )
}
