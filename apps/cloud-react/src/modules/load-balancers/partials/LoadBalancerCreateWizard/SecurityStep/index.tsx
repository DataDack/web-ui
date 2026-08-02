import { useEffect, useMemo } from "react"

import { Button, Checkbox, Label } from "@datadack/common-ui"
import { Loader2 } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"
import { useAllSecurityGroups, useCreateDefaultSecurityGroup } from "@/modules/vpc/vpc.hooks"

import type { FormValues } from "../schema"
import { EffectiveFirewall } from "./EffectiveFirewall"

/**
 * Who can reach the load balancer.
 *
 * Two mechanisms, deliberately shown together: security groups (reusable rule
 * sets, the same objects instances attach) and the per-listener source ranges
 * from the previous step. Neither is meaningful without seeing the result, which
 * is what EffectiveFirewall is for.
 */
export function SecurityStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const { setValue, watch } = form
  const selected = watch("security_group_ids")
  const listeners = watch("listeners")
  const vpcs = watch("vpcs")

  const { data: allGroups = [], isLoading } = useAllSecurityGroups()
  const { mutateAsync: createDefault, isPending: isCreatingDefault } =
    useCreateDefaultSecurityGroup()

  const reachableVpcIds = useMemo(() => new Set(vpcs.map((v) => v.vpc_id).filter(Boolean)), [vpcs])

  // Account-wide groups (no VPC) always apply; a VPC-scoped one only if the LB
  // has a NIC in that VPC.
  const eligible = useMemo(
    () => allGroups.filter((g) => !g.network_id || reachableVpcIds.has(g.network_id)),
    [allGroups, reachableVpcIds],
  )

  // Drop selections that fell out of scope, e.g. after going back and changing
  // the VPCs. Leaving them would send ids the backend rejects.
  useEffect(() => {
    const ids = new Set(eligible.map((g) => g.id))
    const pruned = selected.filter((id) => ids.has(id))
    if (pruned.length !== selected.length) {
      setValue("security_group_ids", pruned)
    }
  }, [eligible, selected, setValue])

  const toggle = (id: string, checked: boolean) => {
    setValue("security_group_ids", checked ? [...selected, id] : selected.filter((s) => s !== id))
  }

  const addDefaultGroup = () => {
    void (async () => {
      try {
        const group = await createDefault(undefined)
        setValue("security_group_ids", [...new Set([...selected, group.id])])
      } catch {
        // The mutation surfaces its own error toast.
      }
    })()
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          {t("loadBalancers.wizard.securityGroups")}
        </Label>

        {isLoading && (
          <p className="text-[11px] text-muted-foreground">
            {t("loadBalancers.wizard.securityGroupsLoading")}
          </p>
        )}

        {!isLoading && eligible.length === 0 && (
          <div className="glass-1 rounded-lg border border-dashed border-border/60 px-4 py-4 text-center">
            <p className="mb-3 text-[12px] text-muted-foreground">
              {t("loadBalancers.wizard.noSecurityGroups")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isCreatingDefault}
              onClick={addDefaultGroup}
              loading={isCreatingDefault}
            >
              {isCreatingDefault && <Loader2 className="size-3.5 animate-spin" />}
              {t("loadBalancers.wizard.createDefaultSg")}
            </Button>
          </div>
        )}

        {eligible.length > 0 && (
          <div className="space-y-1.5">
            {eligible.map((g) => (
              <label
                key={g.id}
                className="flex items-center gap-2.5 rounded-md border border-border/60 px-2.5 py-2 text-[13px] hover:border-border cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(g.id)}
                  aria-label={g.name}
                  onCheckedChange={(v) => {
                    toggle(g.id, v === true)
                  }}
                />
                <span className="font-mono">{g.name}</span>
                {g.description && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {g.description}
                  </span>
                )}
                <span className="flex-1" />
                {!g.network_id && (
                  <span className="rounded-full bg-status-neutral-bg px-1.5 py-0.5 font-mono text-[10px] text-status-neutral">
                    {t("vpc.sgList.accountWide")}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          {t("loadBalancers.wizard.securityGroupsHint")}
        </p>
      </div>

      <Section variant="panel" title={t("loadBalancers.wizard.effectiveFirewall")}>
        <EffectiveFirewall listeners={listeners} />
      </Section>
    </div>
  )
}
