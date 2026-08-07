import { useState } from "react"

import { EmptyState, Skeleton, timeAgo, Button } from "@datadack/common-ui"
import { KeyRound, RefreshCw, ShieldCheck, SlidersHorizontal, Timer } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { DisableGateDialog } from "./DisableGateDialog"
import { GateCard } from "./GateCard"
import { usePlatformSettings, useUpdatePlatformSettings } from "../../superadmin.hooks"
import type { UpdatePlatformSettings } from "../../superadmin.types"

/** The two switches this page owns, keyed by the field they patch. */
type Gate = "kyc_required" | "permissions_required"

// Platform policy — the two gates every tenant hits before a resource exists:
//
//   • KYC          the account owner must be verified
//   • Permissions  the caller must actually hold the IAM permission
//
// Both were previously decided at boot from the process environment and could
// only be changed by a redeploy. This page is the runtime control; the backend
// keeps the environment values as the fallback each switch inherits until an
// override is written, which is why every card shows what is enforced, where
// that value came from, and what it costs to turn off.
export function PlatformSettingsPage() {
  useScreen("superadmin.platformSettings")
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch, isFetching } = usePlatformSettings()
  const { mutate: save, isPending } = useUpdatePlatformSettings()

  const [confirming, setConfirming] = useState<Gate | null>(null)

  const apply = (payload: UpdatePlatformSettings) => {
    save(payload, {
      onSuccess: () => {
        setConfirming(null)
      },
    })
  }

  // Turning a gate ON tightens the platform and is trivially reversible, so it
  // applies straight away. Turning one OFF lets every tenant past a compliance
  // or authorization check, so it only opens the confirmation — the write
  // happens in confirmDisable, with the operator's reason attached.
  const enableGate = (gate: Gate) => {
    apply({ [gate]: true })
  }

  const confirmDisable = (reason: string) => {
    if (!confirming) return
    apply({ [confirming]: false, ...(reason !== "" && { reason }) })
  }

  // What an unset override resolves to, rendered as the gate's own vocabulary
  // ("On"/"Off") rather than a bare boolean.
  const on = t("superAdmin.platformSettings.state.on")
  const off = t("superAdmin.platformSettings.state.off")

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        icon={SlidersHorizontal}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.platformSettings.title") },
        ]}
        title={t("superAdmin.platformSettings.title")}
        description={t("superAdmin.platformSettings.subtitle")}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={t("common.refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
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
          icon={SlidersHorizontal}
          title={t("superAdmin.platformSettings.loadFailed")}
          description={t("superAdmin.platformSettings.loadFailedSubtitle")}
          action={{ label: t("common.refresh"), onClick: () => void refetch() }}
        />
      )}

      {!isLoading && !isError && data && (
        <>
          <div className="space-y-3">
            <GateCard
              icon={ShieldCheck}
              title={t("superAdmin.platformSettings.kyc.title")}
              description={t("superAdmin.platformSettings.kyc.description")}
              enforced={data.effective_kyc_required}
              overridden={data.kyc_required !== null}
              inheritedLabel={data.default_kyc_required ? on : off}
              offConsequence={t("superAdmin.platformSettings.kyc.offConsequence")}
              // Not a preference: with no KYC service wired up nobody could
              // complete verification, so requiring it would lock every tenant
              // out of resource creation permanently. The backend refuses the
              // write; the switch says so before the click.
              lockedReason={
                data.kyc_configured ? undefined : t("superAdmin.platformSettings.kyc.notConfigured")
              }
              pending={isPending}
              onEnable={() => {
                enableGate("kyc_required")
              }}
              onDisable={() => {
                setConfirming("kyc_required")
              }}
            />

            <GateCard
              icon={KeyRound}
              title={t("superAdmin.platformSettings.permissions.title")}
              description={t("superAdmin.platformSettings.permissions.description")}
              enforced={data.effective_permissions_required}
              overridden={data.permissions_required !== null}
              inheritedLabel={data.default_permissions_required ? on : off}
              offConsequence={t("superAdmin.platformSettings.permissions.offConsequence")}
              pending={isPending}
              onEnable={() => {
                enableGate("permissions_required")
              }}
              onDisable={() => {
                setConfirming("permissions_required")
              }}
            />
          </div>

          {/* The change is not instantaneous fleet-wide: every API replica
			        caches the row for a few seconds. Saying so here is what stops
			        an operator from reading a stale retry as a failed save. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Timer className="size-3.5" />
              {t("superAdmin.platformSettings.propagation", {
                count: data.propagation_seconds,
              })}
            </span>
            {(data.kyc_required !== null || data.permissions_required !== null) && (
              <span>
                {t("superAdmin.platformSettings.lastChanged", {
                  when: timeAgo(data.updated_at),
                })}
              </span>
            )}
          </div>
        </>
      )}

      <DisableGateDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
        title={
          confirming === "kyc_required"
            ? t("superAdmin.platformSettings.kyc.disableTitle")
            : t("superAdmin.platformSettings.permissions.disableTitle")
        }
        consequence={
          confirming === "kyc_required"
            ? t("superAdmin.platformSettings.kyc.disableBody")
            : t("superAdmin.platformSettings.permissions.disableBody")
        }
        pending={isPending}
        onConfirm={confirmDisable}
      />
    </div>
  )
}
