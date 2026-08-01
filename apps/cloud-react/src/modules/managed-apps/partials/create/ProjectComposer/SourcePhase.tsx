import { Package } from "lucide-react"

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
	return (
		<div className="mx-auto w-full max-w-3xl space-y-6">
			<div className="space-y-1 text-center">
				<h2 className="text-lg font-semibold tracking-tight">
					Where is your app coming from?
				</h2>
				<p className="text-[13px] text-muted-foreground">
					Deploy your own code from a repository, or launch a ready-made service.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<SourceOptionCard
					icon={<GitHubMark className="size-5" />}
					title="Deploy from GitHub"
					subtitle="React · OpenNext (Next.js)"
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
					title="Public Images"
					subtitle="n8n · more services soon"
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
