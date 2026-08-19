import { useState } from "react"

import { Skeleton } from "@datadack/common-ui"
import { AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ConfirmDialog, Section } from "@/components/console"
import { useConsoleBroadcast } from "@/services/broadcast"

import { CustomPlanCard } from "./CustomPlanCard"
import { CustomPlanDialog } from "./CustomPlanDialog"
import { PlanChangeCard, type PlanDirection } from "./PlanChangeCard"
import { PlanChangeSummary } from "./PlanChangeSummary"
import { isUnlimited, PlanLimitsPanel } from "../../../components"
import { useAccountPlan, useChangeAccountPlan, usePlanCatalog } from "../../../managed-apps.hooks"
import type { Plan } from "../../../managed-apps.types"

// Every tier on one line, Enterprise included — it is a way to buy Managed
// Apps like the others, and wrapping it onto a second row read as an
// afterthought. Five across only at xl; below that they wrap in pairs and
// threes rather than shrinking past legibility.
const gridClass = "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"

/**
 * The account's tier, and the only place it changes.
 *
 * There is exactly one setting here on purpose. The tier is account-scoped
 * (it sells "2 active projects", which caps nothing if each project carries its
 * own), so it cannot live in the create flow or on a project: both would be
 * offering a per-project choice the platform does not have. Everything project-
 * shaped — name, branch, build, env — stays on the project it belongs to.
 */
export function PlanSection() {
  const { t } = useTranslation()

  const { data: account, isLoading: accountLoading } = useAccountPlan()
  // Tiers and comparison rows in one read: two reads of a catalogue somebody
  // may be editing can disagree, and a table whose columns and rows came from
  // different snapshots is worse than one that is briefly stale.
  const { data: catalog, isLoading: plansLoading, isError } = usePlanCatalog()
  const plans = catalog?.plans
  const change = useChangeAccountPlan()

  const [pending, setPending] = useState<Plan | null>(null)
  const [contactOpen, setContactOpen] = useState(false)

  // The tier every account is on until it upgrades: the catalogue's first row,
  // which is ordered by sort_order and priced cheapest-first. Read from the
  // catalogue rather than named here, so renaming or repricing the free tier
  // in S3 does not need a frontend deploy to stay true.
  const defaultPlan = plans?.[0]
  // The account's tier — or, when it cannot be read, the free one it is on
  // until it upgrades. This fallback is the server's own (storedCode treats an
  // empty or retired tier as the cheapest one), and without it an unreadable
  // account plan left `current` undefined, which marked EVERY card as the
  // current plan and offered no upgrade at all.
  const current = account?.plan ?? defaultPlan
  const used = account?.projects_in_use ?? 0
  const downgrading = pending != null && current != null && pending.sort_order < current.sort_order

  /**
   * A refused upgrade leaves this dialog open and the billing page in a new
   * tab. When that tab reports the wallet funded, say so here — the retry is
   * one click away and the user should not have to guess that it will work now.
   */
  useConsoleBroadcast((event) => {
    if (event.type !== "billing:credited") return
    toast.success("Credits added", {
      description: pending
        ? `Your wallet is funded — you can move to ${pending.name} now.`
        : "Your wallet is funded.",
    })
  })

  /** Which way a tier is from the one in force. Ordered by the catalogue's own
   *  sort_order, so a tier added to S3 slots in without a code list here. */
  const directionOf = (plan: Plan): PlanDirection => {
    if (!current || plan.code === current.code) return "current"
    return plan.sort_order > current.sort_order ? "upgrade" : "downgrade"
  }

  /**
   * Why a tier cannot be moved to, in the user's terms.
   *
   * The server refuses a downgrade the account is already over with a 409 —
   * silently accepting it would leave the account permanently in breach of a
   * quota. Saying so on the card turns that into something actionable before
   * the click rather than an error after it.
   */
  const blockedReasonOf = (plan: Plan): string | undefined => {
    // A tier sold by conversation is never blocked by a quota — there is no
    // self-serve move to block.
    if (plan.is_custom_priced || !plan.is_purchasable) return undefined
    const limit = plan.limits.max_projects
    if (isUnlimited(limit) || used <= limit) return undefined
    const excess = used - limit
    return `Allows ${String(limit)} project${limit === 1 ? "" : "s"} — delete ${String(excess)} more first.`
  }

  const renderPlanGrid = () => {
    if (plansLoading || accountLoading) {
      return (
        <div className={gridClass}>
          {/* One per tier the catalogue sells: a skeleton that does not stand in
					    for the layout it replaces makes the page jump when it arrives. */}
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-[236px] rounded-xl" />
          ))}
        </div>
      )
    }

    if (isError || !plans || plans.length === 0) {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-lg border border-border/60 glass-1-bg px-3 py-2.5">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-[12px] text-muted-foreground">
              The plan catalogue could not be loaded, so there is nothing to choose between right
              now. Your account stays on the plan it is on.
            </p>
          </div>
          {/* Talking to us never depended on the catalogue loading. */}
          <div className={gridClass}>
            <CustomPlanCard
              onContact={() => {
                setContactOpen(true)
              }}
            />
          </div>
        </div>
      )
    }

    return (
      <div className={gridClass}>
        {plans.map((plan, index) => (
          <PlanChangeCard
            key={plan.code}
            plan={plan}
            direction={directionOf(plan)}
            isDefault={plan.code === defaultPlan?.code}
            // "Everything in X, plus…" — the one thing the comparison table
            // on the next section cannot say at a glance. Read off the
            // catalogue's own order rather than a code list, so a tier added
            // in S3 slots in.
            buildsOn={index > 0 ? plans[index - 1].name : undefined}
            blockedReason={blockedReasonOf(plan)}
            disabled={change.isPending}
            onChoose={setPending}
            onContact={() => {
              setContactOpen(true)
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Section
        title={t("managedApps.index.yourPlan")}
        description="Applies account-wide. Projects inherit these limits; they never carry a plan of their own."
      >
        <PlanLimitsPanel showChangeLink={false} />
      </Section>

      <Section
        title={t("managedApps.index.changePlan")}
        description={
          defaultPlan
            ? `Every account starts on ${defaultPlan.name} and is charged nothing until it upgrades. Upgrades are billed monthly from your wallet and take effect immediately.`
            : "Upgrades are billed monthly from your wallet and take effect immediately."
        }
      >
        {renderPlanGrid()}
      </Section>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={`${downgrading ? "Downgrade" : "Switch"} to ${pending?.name ?? "plan"}?`}
        // A downgrade takes capability away; an upgrade spends money but
        // gives more, so it gets the ordinary treatment.
        destructive={downgrading}
        description={
          pending && current ? (
            <PlanChangeSummary from={current} to={pending} projectsInUse={used} />
          ) : (
            ""
          )
        }
        confirmLabel={pending ? `Move to ${pending.name}` : undefined}
        loading={change.isPending}
        onConfirm={() => {
          if (!pending) return
          change.mutate(pending, {
            onSuccess: () => {
              setPending(null)
            },
          })
        }}
      />

      <CustomPlanDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        currentPlanName={current?.name ?? "no plan"}
        projectsInUse={used}
      />
    </div>
  )
}
