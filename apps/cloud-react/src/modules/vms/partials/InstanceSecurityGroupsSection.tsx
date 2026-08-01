import { useMemo, useState } from "react"

import { Link2, Loader2, ShieldCheck, Unlink } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Section, StatusBadge } from "@/components/console"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VPC_ROUTES } from "@/modules/vpc/vpc.constants"
import {
  useAllSecurityGroups,
  useAttachInstanceSG,
  useDetachInstanceSG,
  useInstanceSecurityGroups,
} from "@/modules/vpc/vpc.hooks"

import { Skeleton } from "@datadack/serverless-ui"

/** "Security groups" panel on the VM detail Networking tab: lists the groups
 *  attached to the instance and lets the user attach/detach. */
export function InstanceSecurityGroupsSection({ instanceId }: Readonly<{ instanceId: string }>) {
  const { t } = useTranslation()
  const { data: attached = [], isLoading } = useInstanceSecurityGroups(instanceId)
  const { data: allGroups = [] } = useAllSecurityGroups()
  const { mutate: attach, isPending: isAttaching } = useAttachInstanceSG()
  const { mutate: detach, isPending: isDetaching } = useDetachInstanceSG()
  const [toAttach, setToAttach] = useState("")

  const attachable = useMemo(() => {
    const attachedIds = new Set(attached.map((g) => g.id))
    return allGroups.filter((g) => !attachedIds.has(g.id))
  }, [allGroups, attached])

  return (
    <Section
      variant="panel"
      title={t("vms.detail.securityGroups")}
      actions={
        attachable.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={toAttach} onValueChange={setToAttach}>
              <SelectTrigger
                size="sm"
                className="w-56 font-mono text-[12px]"
                aria-label={t("vms.detail.attachSgPlaceholder")}
              >
                <SelectValue placeholder={t("vms.detail.attachSgPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {attachable.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="font-mono text-[12px]">
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!toAttach || isAttaching}
              onClick={() => {
                attach(
                  { instanceId, sgId: toAttach },
                  {
                    onSuccess: () => {
                      setToAttach("")
                    },
                  },
                )
              }}
            >
              {isAttaching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              {t("vms.detail.attachSg")}
            </Button>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {["a", "b"].map((k) => (
            <Skeleton key={k} className="h-10 rounded" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border-glass">
          {attached.length === 0 && (
            <p className="py-3 text-[13px] text-muted-foreground">
              {t("vms.detail.noSecurityGroups")}
            </p>
          )}
          {attached.map((group) => (
            <div
              key={group.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="size-3.5 text-muted-foreground shrink-0" />
                <Link
                  to={VPC_ROUTES.securityGroup(group.id)}
                  className="font-mono text-[13px] font-medium text-status-info hover:underline truncate"
                >
                  {group.name}
                </Link>
                <StatusBadge status={group.status} pulse={group.status === "available"} />
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
                disabled={isDetaching}
                onClick={() => {
                  detach({ instanceId, sgId: group.id })
                }}
              >
                <Unlink className="size-3.5" />
                {t("vms.detail.detachSg")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
