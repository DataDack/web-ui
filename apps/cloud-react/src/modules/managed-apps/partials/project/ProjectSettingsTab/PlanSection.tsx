import { useTranslation } from "react-i18next"
import { Section } from "@/components/console"

import { PlanLimitsPanel } from "../../../components"

/**
 * The quotas this project runs under.
 *
 * There is nothing to change here, and that is the point: the tier belongs to
 * the ACCOUNT, so a per-project picker on this page was quietly moving every
 * other project in the account onto whatever was chosen. The limits are worth
 * stating on the project — they are what it lives within — and the one place
 * they can be changed is Managed Apps → Settings, which the panel links to.
 *
 * Nothing enforces most of these numbers yet — no build meters build minutes —
 * so only the project count carries a usage meter. A "0 of 100 build minutes
 * used" gauge would be inventing a measurement the platform does not take.
 */
export function PlanSection() {
  const { t } = useTranslation()
  return (
    <Section
      variant="panel"
      title="Plan"
      description={t("managedApps.planSection.theAccountPlanThisProjectRunsUnderAndTheQuot")}
    >
      <PlanLimitsPanel />
    </Section>
  )
}
