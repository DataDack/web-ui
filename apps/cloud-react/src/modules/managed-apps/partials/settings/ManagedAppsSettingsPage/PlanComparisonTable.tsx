import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  cn,
  Table,
} from "@datadack/common-ui"
import { Check, Minus } from "lucide-react"

import {
  customFeatureCell,
  featureCell,
  FEATURE_GROUPS,
  formatPrice,
  type FeatureCell,
  type FeatureRow,
} from "../../../components"
import type { Plan } from "../../../managed-apps.types"

interface PlanComparisonTableProps {
  plans: Plan[]
  /** The tier in force, highlighted in its column. */
  currentCode?: string
}

/** A column is either a catalogue tier or the Custom conversation. */
interface Column {
  key: string
  name: string
  price: string
  cellFor: (row: FeatureRow) => FeatureCell
  current: boolean
}

/**
 * Every tier against every feature.
 *
 * The cards above answer "which one" in four numbers; this answers "what do I
 * actually get", which four numbers cannot. Most rows are identical across
 * tiers on purpose — the point of the majority of this table is that the free
 * tier gets auto-deploy, pull-request builds and streaming logs too, and a
 * table that only showed differences would say the opposite by omission.
 *
 * Columns are built from the catalogue rather than from a list of plan codes:
 * a tier added in S3 appears here without a frontend deploy, which is the same
 * reason PlanTierArt keys its glyph off a Map with a fallback.
 */
export function PlanComparisonTable({ plans, currentCode }: Readonly<PlanComparisonTableProps>) {
  if (plans.length === 0) return null

  const columns: Column[] = [
    ...[...plans]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((plan) => ({
        key: plan.code,
        name: plan.name,
        price: plan.price_minor === 0 ? formatPrice(plan) : `${formatPrice(plan)}/mo`,
        cellFor: (row: FeatureRow) => featureCell(row, plan),
        current: plan.code === currentCode,
      })),
    {
      key: "custom",
      name: "Custom",
      price: "Let's talk",
      cellFor: customFeatureCell,
      current: false,
    },
  ]

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
          <tr className="border-b border-border/60 bg-muted/30">
            <th scope="col" className="w-[34%] px-4 py-3 text-[12px] font-medium">
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

        {FEATURE_GROUPS.map((group) => (
          <tbody key={group.title}>
            <tr className="border-b border-border/50 bg-muted/20">
              <th
                scope="colgroup"
                colSpan={columns.length + 1}
                className="px-4 py-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
              >
                {group.title}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.label} className="border-b border-border/40 last:border-b-0">
                <th scope="row" className="px-4 py-2.5 align-top font-normal">
                  <span className="block text-[13px] font-medium">{row.label}</span>
                  {row.hint && (
                    <span className="block text-[11px] text-muted-foreground">{row.hint}</span>
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
                    <CellValue cell={column.cellFor(row)} />
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
                {FEATURE_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {group.title}
                    </p>
                    <dl className="mt-1.5 space-y-1.5">
                      {group.rows.map((row) => (
                        <div key={row.label} className="flex items-baseline justify-between gap-3">
                          <dt className="min-w-0 text-[12px]">{row.label}</dt>
                          <dd className="shrink-0 text-[12px] font-medium">
                            <CellValue cell={column.cellFor(row)} />
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

/**
 * One cell.
 *
 * The icon carries a text label for screen readers: a bare check and a bare
 * dash are indistinguishable — and both are silent — without one, which would
 * make most of this table unreadable to anyone not looking at it.
 */
function CellValue({ cell }: Readonly<{ cell: FeatureCell }>) {
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
