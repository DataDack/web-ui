import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  nameColumn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type RowAction,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Gauge, Pencil, Plus, Trash2 } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { ConfirmDialog, Section } from "@/components/console"

import { QUOTA_PERIOD_OPTIONS } from "../apigw.constants"
import {
  useCreateUsagePlan,
  useDeleteUsagePlan,
  useUpdateUsagePlan,
  useUsagePlans,
} from "../apigw.hooks"
import type { UsagePlan } from "../apigw.types"
const schema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string(),
  throttle_rate_limit: z.coerce.number().min(0),
  throttle_burst_limit: z.coerce.number().int().min(0),
  quota_limit: z.coerce.number().int().min(0),
  quota_period: z.enum(["DAY", "WEEK", "MONTH"]),
})
type Values = z.output<typeof schema>
type Input = z.input<typeof schema>
const LABEL = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"
export function UsagePlansPanel() {
  const { t } = useTranslation()
  const { data: plans = [], isLoading, isError, refetch } = useUsagePlans()
  const { mutate: remove, isPending } = useDeleteUsagePlan()
  const [toEdit, setToEdit] = useState<UsagePlan | null | undefined>()
  const [toDelete, setToDelete] = useState<UsagePlan | null>(null)
  const cols = useMemo<ColumnDef<UsagePlan>[]>(
    () => [
      nameColumn({
        header: t("apiGateway.usagePlans.columns.name"),
        accessor: (p: UsagePlan) => p.name,
      }),
      {
        id: "throttle",
        header: () => t("apiGateway.usagePlans.columns.throttle"),
        cell: ({ row }) =>
          `${row.original.throttle_rate_limit} / ${row.original.throttle_burst_limit}`,
      },
      {
        id: "quota",
        header: () => t("apiGateway.usagePlans.columns.quota"),
        cell: ({ row }) =>
          row.original.quota_limit === 0
            ? t("apiGateway.usagePlans.unlimited")
            : `${row.original.quota_limit} / ${row.original.quota_period.toLowerCase()}`,
      },
      { id: "keys", header: () => t("apiGateway.usagePlans.columns.keys"), cell: () => "—" },
      {
        id: "stages",
        header: () => t("apiGateway.usagePlans.columns.stages"),
        cell: ({ row }) => row.original.apis?.length ?? 0,
      },
      actionsColumn({
        ariaLabel: t("console.table.actions"),
        actions: (): RowAction<UsagePlan>[] => [
          { label: t("apiGateway.actions.edit"), icon: Pencil, onAction: setToEdit },
          {
            label: t("apiGateway.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: setToDelete,
          },
        ],
      }),
    ],
    [t],
  )
  return (
    <Section
      title={t("apiGateway.usagePlans.title")}
      description={t("apiGateway.usagePlans.description")}
      actions={
        <Button
          className="gap-2"
          onClick={() => {
            setToEdit(null)
          }}
        >
          <Plus className="size-4" />
          {t("apiGateway.usagePlans.create")}
        </Button>
      }
    >
      <DataTable
        data={plans}
        columns={cols}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(p) => p.id}
        empty={
          <EmptyState
            icon={Gauge}
            title={t("apiGateway.usagePlans.empty.title")}
            description={t("apiGateway.usagePlans.empty.description")}
            action={{
              label: t("apiGateway.usagePlans.create"),
              onClick: () => {
                setToEdit(null)
              },
            }}
          />
        }
      />
      <PlanDialog
        plan={toEdit}
        open={toEdit !== undefined}
        onClose={() => {
          setToEdit(undefined)
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => {
          if (!o) setToDelete(null)
        }}
        title={t("apiGateway.usagePlans.delete.title")}
        description={t("apiGateway.usagePlans.delete.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("apiGateway.actions.delete")}
        loading={isPending}
        onConfirm={() => {
          if (toDelete)
            remove(toDelete.id, {
              onSuccess: () => {
                setToDelete(null)
              },
            })
        }}
      />
    </Section>
  )
}
function PlanDialog({
  plan,
  open,
  onClose,
}: Readonly<{
  plan: UsagePlan | null | undefined
  open: boolean
  onClose: () => void
}>) {
  const { t } = useTranslation()
  const { mutate: create, isPending: creating } = useCreateUsagePlan()
  const { mutate: update, isPending: updating } = useUpdateUsagePlan()
  const f = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    values: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      throttle_rate_limit: plan?.throttle_rate_limit ?? 100,
      throttle_burst_limit: plan?.throttle_burst_limit ?? 200,
      quota_limit: plan?.quota_limit ?? 0,
      quota_period: plan?.quota_period ?? "MONTH",
    },
  })
  const save = (v: Values) => {
    if (plan) {
      update({ id: plan.id, payload: v }, { onSuccess: onClose })
      return
    }
    create(v, { onSuccess: onClose })
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="glass-3">
        <DialogHeader>
          <DialogTitle>
            {t(plan ? "apiGateway.usagePlans.editTitle" : "apiGateway.usagePlans.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("apiGateway.usagePlans.formDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={(e) => void f.handleSubmit(save)(e)}>
          <Field label={t("apiGateway.usagePlans.fields.name")}>
            <Input {...f.register("name")} />
          </Field>
          <fieldset className="space-y-3 rounded-md border p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("apiGateway.usagePlans.throttle.title")}
            </legend>
            <p className="text-xs text-muted-foreground">
              {t("apiGateway.usagePlans.throttle.description")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("apiGateway.usagePlans.fields.rate")}>
                <Input type="number" {...f.register("throttle_rate_limit")} />
              </Field>
              <Field label={t("apiGateway.usagePlans.fields.burst")}>
                <Input type="number" {...f.register("throttle_burst_limit")} />
              </Field>
            </div>
          </fieldset>
          <fieldset className="space-y-3 rounded-md border p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("apiGateway.usagePlans.quota.title")}
            </legend>
            <p className="text-xs text-muted-foreground">
              {t("apiGateway.usagePlans.quota.description")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("apiGateway.usagePlans.fields.limit")}>
                <Input type="number" {...f.register("quota_limit")} />
              </Field>
              <Field label={t("apiGateway.usagePlans.fields.period")}>
                <Controller
                  name="quota_period"
                  control={f.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUOTA_PERIOD_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("console.wizard.cancel")}
            </Button>
            <Button variant="gold" loading={creating || updating}>
              {t("apiGateway.usagePlans.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL}>{label}</Label>
      {children}
    </div>
  )
}
