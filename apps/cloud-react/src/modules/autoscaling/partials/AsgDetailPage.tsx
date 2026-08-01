import { useState } from "react"

import { Label } from "@DataDack/common-ui"
import { Skeleton } from "@DataDack/common-ui"
import { Activity, Gauge, Info, Loader2, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { ConfirmDialog, DetailPage, KeyValueGrid, Section, TagList } from "@/components/console"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"
import { Input } from "@/components/ui/input"
import { parseTags } from "@/lib/tags"
import { useScreen } from "@/services/api/screen"

import { ASG_ROUTES } from "../autoscaling.constants"
import { useASG, useDeleteASG, useSetASGCapacity } from "../autoscaling.hooks"
import type { AutoScalingGroup } from "../autoscaling.types"

export function AsgDetailPage() {
  useScreen("autoscaling.asg-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const { data: asg, isLoading } = useASG(id)
  const { mutate: deleteASG, isPending: isDeleting } = useDeleteASG()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [capacityOpen, setCapacityOpen] = useState(false)

  if (isLoading || !asg) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <DetailPage
        backTo={ASG_ROUTES.ROOT}
        backLabel={t("autoscaling.title")}
        icon={Activity}
        title={asg.name}
        status={asg.status}
        id={`ASG-${asg.tenant_serial}`}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setCapacityOpen(true)
              }}
            >
              <Gauge className="size-3.5" />
              {t("autoscaling.actions.setCapacity")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="size-3.5" />
              {t("autoscaling.actions.delete")}
            </Button>
          </>
        }
        tabs={[
          {
            value: "overview",
            label: t("vms.tabs.overview"),
            icon: Info,
            content: <OverviewTab asg={asg} />,
          },
        ]}
      />

      <SetCapacityDialog asg={asg} open={capacityOpen} onOpenChange={setCapacityOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("autoscaling.deleteConfirm.title")}
        description={t("autoscaling.deleteConfirm.description", { name: asg.name })}
        confirmLabel={t("autoscaling.actions.delete")}
        confirmText={asg.name}
        loading={isDeleting}
        onConfirm={() => {
          deleteASG(asg.id, {
            onSuccess: () => void navigate(ASG_ROUTES.ROOT),
          })
        }}
      />
    </>
  )
}

function OverviewTab({ asg }: Readonly<{ asg: AutoScalingGroup }>) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <Section variant="panel" title={t("autoscaling.detail.capacity")}>
        <KeyValueGrid
          columns={3}
          items={[
            {
              label: t("autoscaling.form.min"),
              value: String(asg.min_size),
              mono: true,
            },
            {
              label: t("autoscaling.form.desired"),
              value: String(asg.desired_capacity),
              mono: true,
            },
            {
              label: t("autoscaling.form.max"),
              value: String(asg.max_size),
              mono: true,
            },
          ]}
        />
      </Section>

      <Section variant="panel" title={t("vms.detail.configuration")}>
        <KeyValueGrid
          columns={3}
          items={[
            // machine_type / scaling_policy are not exposed by the
            // backend ASG entity, so the backend launch template id is
            // shown instead of fabricating those values.
            {
              label: t("vms.detail.configuration"),
              value: asg.launch_template_id,
              mono: true,
            },
            { label: "Description", value: asg.description || "—" },
            {
              label: t("loadBalancers.columns.region"),
              value: asg.region,
              mono: true,
            },
            {
              label: "Health Check Grace",
              value: `${String(asg.health_check_grace_period)}s`,
              mono: true,
            },
            { label: "Termination Policy", value: asg.termination_policy, mono: true },
            {
              label: "Capacity Rebalance",
              value: asg.capacity_rebalance ? "Enabled" : "Disabled",
            },
            {
              label: t("common.created"),
              value: new Date(asg.created_at).toLocaleString(),
            },
            {
              label: t("common.updated"),
              value: new Date(asg.updated_at).toLocaleString(),
            },
          ]}
        />
      </Section>

      <Section variant="panel" title={t("console.tags.label")}>
        <TagList tags={parseTags(asg.tags)} />
      </Section>
    </div>
  )
}

function SetCapacityDialog({
  asg,
  open,
  onOpenChange,
}: Readonly<{ asg: AutoScalingGroup; open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: setCapacity, isPending } = useSetASGCapacity()
  const [desired, setDesired] = useState(String(asg.desired_capacity))

  const parsed = Number(desired)
  const valid = Number.isInteger(parsed) && parsed >= asg.min_size && parsed <= asg.max_size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm glass-3">
        <DialogHeader>
          <DialogTitle>{t("autoscaling.capacityForm.title")}</DialogTitle>
          <DialogDescription>
            {t("autoscaling.capacityForm.description", {
              min: asg.min_size,
              max: asg.max_size,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {t("autoscaling.form.desired")}
          </Label>
          <Input
            type="number"
            value={desired}
            onChange={(e) => {
              setDesired(e.target.value)
            }}
            className="font-mono"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
            disabled={isPending}
          >
            {t("console.confirm.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!valid || isPending}
            className="gap-2"
            onClick={() => {
              setCapacity(
                { id: asg.id, desiredSize: parsed },
                {
                  onSuccess: () => {
                    onOpenChange(false)
                  },
                },
              )
            }}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {t("autoscaling.actions.setCapacity")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
