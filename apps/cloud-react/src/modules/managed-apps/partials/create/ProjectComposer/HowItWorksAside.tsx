import { cn } from "@datadack/common-ui"
import { Rocket, Settings2, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"

import { GitHubMark } from "../../../components/GitHubMark"
import { DeployPipelineArt } from "../../../components/illustrations/DeployPipelineArt"

const STEPS = [
  {
    key: "connect",
    title: "Connect",
    body: "Choose your GitHub account and repository.",
    icon: <GitHubMark className="size-4" />,
  },
  {
    key: "configure",
    title: "Configure",
    body: "We'll auto-detect your project and settings.",
    icon: <Settings2 className="size-4" />,
  },
  {
    key: "deploy",
    title: "Deploy",
    body: "Every push to the selected branch triggers a new build and deployment.",
    icon: <Rocket className="size-4" />,
  },
] as const

interface HowItWorksAsideProps {
  className?: string
}

/**
 * What happens after this form, on the same screen as the form.
 *
 * Import asks for two selects and a runtime and then — from the user's side —
 * something invisible happens to their repository. This panel is the answer to
 * "and then what?" placed where the question is actually asked, so nobody has
 * to commit a repository to find out what committing it does.
 *
 * It is decoration only: no state, no controls, nothing here changes what the
 * form submits. That is why it can be dropped from narrow layouts without the
 * flow losing anything.
 */
export function HowItWorksAside({ className }: Readonly<HowItWorksAsideProps>) {
  const { t } = useTranslation()
  return (
    <aside
      className={cn(
        "h-fit rounded-xl border border-border/60 glass-1-bg p-4 lg:sticky lg:top-4",
        className,
      )}
    >
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <Sparkles className="size-4 text-brand-gold" />
        {t("managedApps.howItWorksAside.howItWorks")}
      </h3>

      {/* Numbered, and joined by a rule, because these are three stages of one
			    pipeline rather than three unrelated tips. */}
      <ol className="mt-4">
        {STEPS.map((step, index) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/60 glass-1-bg-raised text-muted-foreground">
                {step.icon}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="my-1 w-px flex-1 border-l border-dashed border-border/60"
                />
              )}
            </div>

            <div className={cn("min-w-0", index < STEPS.length - 1 && "pb-5")}>
              <p className="text-[13px] font-medium">
                {index + 1}. {step.title}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <DeployPipelineArt className="mx-auto mt-5" />
    </aside>
  )
}
