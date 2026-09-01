import { Package } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SourceOptionCard } from "./SourceOptionCard"
import { GitHubMark } from "../../../components/GitHubMark"

interface SourcePhaseProps {
  onPickGitHub: () => void
  onPickImages: () => void
}

/**
 * Source — the fork in front of everything else.
 *
 * The backend already distinguishes repo-backed projects (react, opennext)
 * from image-backed ones (n8n: no repository, no builds); this step is where
 * the UI finally asks which kind is being created. GitHub continues into the
 * unchanged Import → Configure flow; Public Images opens the catalog.
 */
export function SourcePhase({ onPickGitHub, onPickImages }: Readonly<SourcePhaseProps>) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-base font-semibold tracking-tight">
          {t("managedApps.sourcePhase.whereIsYourAppComingFrom")}
        </h2>
        <p className="text-[12px] text-muted-foreground">
          {t("managedApps.sourcePhase.deployYourOwnCodeFromARepositoryOrLaunchARea")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SourceOptionCard
          icon={<GitHubMark className="size-5" />}
          title={t("managedApps.sourcePhase.deployFromGithub")}
          subtitle={t("managedApps.sourcePhase.reactOpennextNextJs")}
          bullets={[
            "Push to deploy — every commit builds",
            "Builds run on your GitHub Actions",
            "A pull request sets up the workflow for you",
          ]}
          availability={{ label: "Available", tone: "available" }}
          cta="Continue with GitHub"
          onSelect={onPickGitHub}
        />
        <SourceOptionCard
          icon={<Package className="size-5" />}
          title={t("managedApps.sourcePhase.publicImages")}
          subtitle={t("managedApps.sourcePhase.n8nMoreServicesSoon")}
          bullets={[
            "One-click managed services",
            "No repository, no build pipeline",
            "We run and update the container",
          ]}
          availability={{ label: "New", tone: "new" }}
          cta="Browse catalog"
          onSelect={onPickImages}
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Your choice is saved with the rest of this draft — going back never loses a field.
      </p>
    </div>
  )
}
