import { Button, cn } from "@datadack/common-ui"
import { AlertCircle, GitPullRequest, Loader2, Rocket } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ComposerValues } from "./schema"
import { projectTypeLabel } from "../../../components"
import { useAccountPlan, useBuildDefaults } from "../../../managed-apps.hooks"

interface SummaryAsideProps {
  values: ComposerValues
  envCount: number
  issues: string[]
  submitting: boolean
  onDeploy: () => void
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-mono text-[11px] text-foreground">{value}</span>
    </div>
  )
}

/**
 * The sticky summary and the one Deploy button.
 *
 * Deploy is never `disabled` for invalidity. A dead button gives the user
 * nothing to act on — pressing it runs validation and jumps to the first
 * problem, which is the only way they find out what is wrong. It is only
 * disabled while the request is genuinely in flight.
 *
 * The panel states what happens next, because it is not what people expect:
 * creating the project opens a pull request on their repository, and nothing
 * builds until they merge it.
 */
export function SummaryAside({
  values,
  envCount,
  issues,
  submitting,
  onDeploy,
}: Readonly<SummaryAsideProps>) {
  const { t } = useTranslation()
  const { data: defaults } = useBuildDefaults(values.project_type, values.node_version)
  // The account's tier, not a choice made in this form — the project inherits
  // it. Its NAME rather than its code: "developer_pro" is a storage key, not a
  // thing to show someone about to create something under it.
  const { data: account } = useAccountPlan()
  const planName = account?.plan.name ?? ""

  const inherited = (value: string, fallback: string | undefined) =>
    value === "" ? (fallback ?? "default") : value

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <div className="glass-1 space-y-3 rounded-xl border border-border/60 p-4">
        <h3 className="text-[13px] font-semibold">Summary</h3>
        <div className="space-y-1.5">
          <Row label="Repository" value={values.repo || "—"} />
          <Row label="Branch" value={values.branch || "—"} />
          <Row label="Name" value={values.name || values.repo_name || "—"} />
          <Row label="Runtime" value={projectTypeLabel(values.project_type)} />
          <Row label="Plan" value={planName || "—"} />
          <Row label="Root" value={values.root_dir || "./"} />
          {/* Both halves of the environment: what builds it, and what serves
					    it. The image is the server's answer for this type and version —
					    it does not always follow the choice, and a static build served
					    by Caddy is exactly the case someone would otherwise misread. */}
          <Row
            label="Environment"
            value={
              defaults ? `Node ${inherited(values.node_version, defaults.node_version)}` : "default"
            }
          />
          <Row label="Runtime image" value={defaults?.runtime_image ?? "—"} />
          <Row
            label="Install"
            value={inherited(values.install_command, defaults?.install_command)}
          />
          <Row label="Build" value={inherited(values.build_command, defaults?.build_command)} />
          <Row label="Output" value={inherited(values.output_dir, defaults?.output_dir)} />
          <Row
            label={t("managedApps.summaryAside.envVars")}
            value={envCount === 1 ? "1 variable" : `${String(envCount)} variables`}
          />
          <Row label="Networking" value={values.vpc_id ? "VPC bound" : "Public only"} />
        </div>
      </div>

      {issues.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
            <AlertCircle className="size-3.5" />
            {issues.length === 1 ? "1 thing to fix" : `${String(issues.length)} things to fix`}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {issues.map((issue) => (
              <li key={issue} className="text-[11px] text-muted-foreground">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        type="button"
        className={cn("w-full gap-2", issues.length > 0 && "opacity-70")}
        disabled={submitting}
        aria-disabled={issues.length > 0}
        onClick={onDeploy}
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
        Create project
      </Button>

      <div className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2.5">
        <GitPullRequest className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          We open a pull request on your repository that adds the build workflow. Builds run on your
          own GitHub Actions runners, and nothing builds until you merge it.
        </p>
      </div>
    </aside>
  )
}
