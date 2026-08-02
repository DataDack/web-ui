import { useState } from "react"

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { CheckCircle2, FlaskConical, Loader2, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader, Section } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { useIAMUsers, usePermissions, useSimulate } from "../iam.hooks"

export function PolicySimulatorPage() {
  useScreen("iam.policy-simulator")
  const { t } = useTranslation()
  const { data: users = [] } = useIAMUsers()
  const { data: permissions = [] } = usePermissions()
  const simulate = useSimulate()

  const [userId, setUserId] = useState("")
  const [action, setAction] = useState("")
  const [resource, setResource] = useState("")

  const result = simulate.data
  const run = () => {
    if (!userId || !action) return
    simulate.mutate({ user_id: userId, action, resource: resource || undefined })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FlaskConical}
        breadcrumbs={[{ label: t("console.nav.groups.iam") }, { label: t("iam.simulator.title") }]}
        title={t("iam.simulator.title")}
        description={t("iam.simulator.subtitle")}
      />

      <Section variant="panel" title={t("iam.simulator.request")}>
        <div className="max-w-xl space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("iam.simulator.user")}
            </Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="text-[13px]">
                <SelectValue placeholder={t("iam.detail.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-[13px]">
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("iam.simulator.action")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
              }}
              placeholder={t("iam.policySimulatorPage.vmInstancesCreate")}
              className="font-mono"
              list="authz-actions"
            />
            <datalist id="authz-actions">
              {permissions.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("iam.simulator.resource")}
            </Label>
            <Input
              value={resource}
              onChange={(e) => {
                setResource(e.target.value)
              }}
              placeholder={t("iam.policySimulatorPage.urnCloudVmInstances")}
              className="font-mono"
            />
          </div>

          <Button
            onClick={run}
            disabled={!userId || !action || simulate.isPending}
            loading={simulate.isPending}
          >
            {simulate.isPending && <Loader2 className="size-4 animate-spin mr-1.5" />}
            {t("iam.simulator.run")}
          </Button>
        </div>
      </Section>

      {result && (
        <Section variant="panel" title={t("iam.simulator.result")}>
          <div className="flex items-center gap-3">
            {result.allow ? (
              <CheckCircle2 className="size-7 text-emerald-500" />
            ) : (
              <XCircle className="size-7 text-destructive" />
            )}
            <div>
              <p className="text-base font-semibold">
                {result.allow ? t("iam.simulator.allow") : t("iam.simulator.deny")}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {result.deciding_sid
                  ? t("iam.simulator.decidedBy", { sid: result.deciding_sid })
                  : t("iam.simulator.defaultDeny")}
                {" · "}
                {t("iam.simulator.evaluated", { count: result.statement_count })}
              </p>
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}
