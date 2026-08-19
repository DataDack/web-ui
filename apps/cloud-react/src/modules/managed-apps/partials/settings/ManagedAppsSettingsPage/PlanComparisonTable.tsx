import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  cn,
  Table,
} from "@datadack/common-ui"
import { Check, Minus } from "lucide-react"

import { formatPrice } from "../../../components"
import type { Plan, PlanFeature } from "../../../managed-apps.types"

interface PlanComparisonTableProps {
  plans: Plan[]
  /** The comparison rows, from the pricing sheet's feature dictionary in S3. */
  features: PlanFeature[]
  /** The tier in force, highlighted in its column. */
  currentCode?: string
}

/** What one tier answers for one row, after resolution. */
type Cell = { kind: "included" } | { kind: "absent" } | { kind: "text"; value: string }

interface Group {
  title: string
  rows: PlanFeature[]
}

/**
 * Every tier against every feature — built entirely from the catalogue.
 *
 * Both halves of this table are data now. The columns are the tiers in
 * system_data/managedapps/plans/, and the ROWS are the feature dictionary in
 * system_data/managedapps/plan_features/, which carries each row's label, its
 * grouping, and the phrase every tier answers it with. Nothing about what
 * Managed Apps sells is written down in this file.
 *
 * That is the point. The rows used to be a hand-maintained list here, which
 * meant two things: a pricing change needed a frontend deploy, and the pricing
 * sheet and this page could quietly disagree about what was being sold. Now the
 * sheet is the only author — regenerate the catalogue, upload it, and the table
 * changes.
 */
export function PlanComparisonTable({
  plans,
  features,
  currentCode,
}: Readonly<PlanComparisonTableProps>) {
  if (plans.length === 0 || features.length === 0) return null

  const columns = [...plans]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((plan) => ({
      key: plan.code,
      name: plan.name,
      price: priceLabel(plan),
      plan,
      current: plan.code === currentCode,
    }))

  // Grouped in the dictionary's own order (category_sort, then sort_order),
  // which the server has already applied — this only has to preserve it, so a
  // Map keyed by title keeps first-seen order rather than re-sorting.
  const groups: Group[] = []
  const byTitle = new Map<string, Group>()
  for (const feature of features) {
    let group = byTitle.get(feature.category)
    if (!group) {
      group = { title: feature.category, rows: [] }
      byTitle.set(feature.category, group)
      groups.push(group)
    }
    group.rows.push(feature)
  }

  return (
    <>
      {/* Wide enough for a matrix: labels down the side, tiers across.
			    The kit's Table is used for its frame and scroll container only —
			    TableHead and TableCell are shaped for a data grid (mono, uppercase,
			    nowrap) and would have to be overridden property by property here. */}
      <Table
        containerClassName="hidden rounded-xl border border-border/60 md:block"
        className="text-left"
      >
        <caption className="sr-only">
          Managed Apps features and quotas, compared across every plan
        </caption>
        <thead>
          <tr className="border-b border-border/60 glass-1-bg-raised">
            <th scope="col" className="w-[30%] px-4 py-3 text-[12px] font-medium">
              Feature
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-3 py-3 text-[12px] font-medium",
                  column.current && "bg-primary/[0.06] text-primary",
                )}
              >
                <span className="block truncate">{column.name}</span>
                <span
                  className={cn(
                    "block text-[11px] font-normal",
                    column.current ? "text-primary/80" : "text-muted-foreground",
                  )}
                >
                  {column.price}
                  {column.current && " · current"}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group.title}>
            <tr className="border-b border-border/50 glass-1-bg">
              <th
                scope="colgroup"
                colSpan={columns.length + 1}
                className="px-4 py-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
              >
                {group.title}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.slug} className="border-b border-border/40 last:border-b-0">
                <th scope="row" className="px-4 py-2.5 align-top font-normal">
                  <span className="block text-[13px] font-medium">{row.label}</span>
                  {row.description && (
                    <span className="block text-[11px] text-muted-foreground">
                      {row.description}
                    </span>
                  )}
                </th>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-3 py-2.5 align-top text-[13px]",
                      column.current && "bg-primary/[0.04]",
                    )}
                  >
                    <CellValue cell={cellFor(row, column.plan)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </Table>

      {/* Narrow: a five-column matrix does not survive a phone, and a
			    horizontally scrolling table hides four of its five columns. One
			    plan at a time, read top to bottom, says the same thing. */}
      <Accordion type="single" collapsible className="md:hidden">
        {columns.map((column) => (
          <AccordionItem key={column.key} value={column.key}>
            <AccordionTrigger>
              <span className="flex items-baseline gap-2">
                <span className={cn("text-[13px] font-medium", column.current && "text-primary")}>
                  {column.name}
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {column.price}
                  {column.current && " · current"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.title}>
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {group.title}
                    </p>
                    <dl className="mt-1.5 space-y-1.5">
                      {group.rows.map((row) => (
                        <div key={row.slug} className="flex items-baseline justify-between gap-3">
                          <dt className="min-w-0 text-[12px]">{row.label}</dt>
                          <dd className="shrink-0 text-[12px] font-medium">
                            <CellValue cell={cellFor(row, column.plan)} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  )
}

function priceLabel(plan: Plan): string {
  const price = formatPrice(plan)
  return plan.is_custom_priced || plan.price_inr_monthly === 0 ? price : `${price}/mo`
}

/**
 * What one tier answers for one row.
 *
 * The dictionary's own phrase wins whenever there is one, because most cells in
 * the pricing sheet are not numbers — "Mumbai + Pune (<25ms)" says what the row
 * promises and "mumbai_pune_dual" does not. The typed value is the fallback,
 * for a slug the sheet left blank.
 *
 * A boolean is the one case worth converting to an icon: a column of "Yes" and
 * "No" reads as noise next to a column of ticks. A quota of 0 is deliberately
 * NOT an absent cell — 0 and "not available" look alike in a table but are
 * different promises, and a bare dash would read as "this tier has no such
 * feature at all" rather than "this tier includes none of it".
 */
function cellFor(feature: PlanFeature, plan: Plan): Cell {
  const phrase = feature.display[plan.code]?.trim()
  const raw = plan.values[feature.slug]

  if (typeof raw === "boolean" && !phrase) {
    return raw ? { kind: "included" } : { kind: "absent" }
  }
  if (phrase) return { kind: "text", value: phrase }
  if (raw === null || raw === undefined) return { kind: "absent" }
  if (typeof raw === "boolean") return raw ? { kind: "included" } : { kind: "absent" }
  if (typeof raw === "number") return { kind: "text", value: formatValue(raw, feature.unit) }
  return { kind: "text", value: raw }
}

/**
 * A raw number as a human reads it. -1 is the catalogue's "no ceiling"
 * sentinel and must never reach the page as "-1".
 */
function formatValue(value: number, unit: string): string {
  if (value === -1) return "Unlimited"
  const suffix = unit && !unit.includes("enum") && !unit.includes("text") ? ` ${unit}` : ""
  return `${value.toLocaleString()}${suffix}`
}

/**
 * One cell.
 *
 * The icon carries a text label for screen readers: a bare check and a bare
 * dash are indistinguishable — and both are silent — without one, which would
 * make most of this table unreadable to anyone not looking at it.
 */
function CellValue({ cell }: Readonly<{ cell: Cell }>) {
  if (cell.kind === "included") {
    return (
      <>
        <Check className="size-4 text-status-success" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Included</span>
      </>
    )
  }
  if (cell.kind === "absent") {
    return (
      <>
        <Minus className="size-4 text-muted-foreground/50" aria-hidden />
        <span className="sr-only">Not available</span>
      </>
    )
  }
  return <span className="font-medium">{cell.value}</span>
}
