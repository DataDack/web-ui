import { useTranslation } from "react-i18next"
import { Button } from "@datadack/common-ui"
import { ArrowRight, Check, Loader2, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

import { GitHubMark } from "../../components/GitHubMark"
import { DeployPipelineArt } from "../../components/illustrations/DeployPipelineArt"

interface GetStartedHeroProps {
  /** Whether the account already has a usable GitHub installation. */
  connected: boolean
  connecting: boolean
  onConnect: () => void
  onCreate: () => void
}

interface Step {
  title: string
  body: string
  done: boolean
}

/**
 * The whole page, when the account has no projects.
 *
 * The previous empty state was a centred icon, one line and two buttons adrift
 * in a viewport-height of white — it filled none of the space and explained
 * none of the product. A first run is the one moment a user will read
 * something, so this uses it: three numbered steps that state what actually
 * happens, with the first one ticking itself off once GitHub is connected.
 *
 * The third step is the one nobody expects and everybody hits — builds run on
 * their own Actions runners, so a pull request has to be merged before anything
 * can build. Saying it here costs nothing and saves the confusion later.
 */
export function GetStartedHero({
  connected,
  connecting,
  onConnect,
  onCreate,
}: Readonly<GetStartedHeroProps>) {
  const { t } = useTranslation()
  const steps: Step[] = [
    {
      title: "Connect GitHub",
      body: "Install the DataDack app on the account that owns your repository. You choose which repositories it can see.",
      done: connected,
    },
    {
      title: "Pick a repository",
      body: "We read it to work out the framework, install command and output directory, and show you what we found.",
      done: false,
    },
    {
      title: "Merge the setup pull request",
      body: "It adds a build workflow to your repo. Builds then run on your own GitHub Actions runners on every push.",
      done: false,
    },
  ]

  return (
    <div className="glass-1 relative overflow-hidden rounded-2xl border border-border/60">
      {/* A single soft wash so the panel reads as a surface rather than a
			    large empty rectangle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "var(--status-info)" }}
      />

      <div className="relative grid gap-10 p-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-10">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {t("managedApps.getStartedHero.shipFromGithubInThreeSteps")}
          </h2>
          <p className="mt-1.5 max-w-lg text-[13px] text-muted-foreground">
            Connect a repository and every push to your chosen branch builds and deploys. OpenNext
            and React today; managed n8n agents are coming soon.
          </p>

          <ol className="mt-7 space-y-5">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1",
                    step.done
                      ? "bg-status-success text-white ring-status-success/30"
                      : "bg-muted text-muted-foreground ring-border",
                  )}
                >
                  {step.done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[13px] font-semibold",
                      step.done && "text-muted-foreground line-through",
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            {connected ? (
              <Button className="gap-2" onClick={onCreate}>
                <Plus className="size-4" />
                {t("managedApps.getStartedHero.createYourFirstProject")}
              </Button>
            ) : (
              <Button className="gap-2" disabled={connecting} onClick={onConnect}>
                {connecting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GitHubMark className="size-4" />
                )}
                Connect GitHub
              </Button>
            )}

            {connected && (
              <span className="flex items-center gap-1.5 text-[12px] text-status-success">
                <Check className="size-3.5" />
                {t("managedApps.getStartedHero.githubConnected")}
              </span>
            )}

            {!connected && (
              <Button variant="ghost" className="gap-1.5" onClick={onCreate}>
                {t("managedApps.getStartedHero.skipAndCreateAProject")}
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-end">
          <DeployPipelineArt />
        </div>
      </div>
    </div>
  )
}
