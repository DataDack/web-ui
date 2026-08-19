import { useEffect, useMemo, useState } from "react"

import { AlertTriangle, ExternalLink, FileWarning } from "lucide-react"

import { EmptyState, Skeleton } from "@datadack/common-ui"

import { BuildLogPanel } from "./BuildLogPanel"
import { SourceDeploymentPanel } from "./SourceDeploymentPanel"
import { useProjectSourceTree } from "../../../managed-apps.hooks"
import type { Build, Project } from "../../../managed-apps.types"
import { FileTree } from "../SourceBrowser/FileTree"
import { FileView } from "../SourceBrowser/FileView"
import { ancestors, initialFile } from "../SourceBrowser/source-tree"

/**
 * The code a deployment was built from — the repository at that commit,
 * filling the page instead of the half-drawer it used to live in.
 *
 * Read live from GitHub through the project's installation rather than from
 * the artifact: the artifact is compiled output, and a "view code" that shows
 * a minified bundle answers a question nobody asked. Everything here is pinned
 * to one immutable commit, which is what lets the tree and every file be
 * cached for the life of the tab.
 */
export function BuildSourcePanel({
  projectId,
  gitRef,
  build,
  project,
}: Readonly<{
  projectId: string
  gitRef: string
  build: Build
  project?: Project
}>) {
  const { data: tree, isLoading, isError, error, refetch } = useProjectSourceTree(projectId, gitRef)
  const [selected, setSelected] = useState("")

  // Seeded per commit: opening another build's code has to land on that
  // commit's own opening file, not on whatever was being read before.
  useEffect(() => {
    if (tree) setSelected(initialFile(tree.entries, tree.root_dir))
  }, [tree])

  const expanded = useMemo(() => {
    if (!tree) return []
    const opening = initialFile(tree.entries, tree.root_dir)
    // The built subtree AND the path down to the opening file, so a monorepo
    // opens on the deployed app instead of on a collapsed root.
    return [
      ...(tree.root_dir === "" ? [] : [tree.root_dir, ...ancestors(tree.root_dir)]),
      ...ancestors(opening),
    ]
  }, [tree])

  if (isLoading) {
    return (
      <div className="flex h-full gap-4 p-4">
        <div className="w-64 shrink-0 space-y-2">
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <Skeleton key={key} className="h-5 w-full" />
          ))}
        </div>
        <Skeleton className="min-h-0 flex-1" />
      </div>
    )
  }

  if (isError || !tree) {
    // A transport-shaped message ("Request failed with status code 500") is
    // the HTTP client talking, not an explanation — swap it for one, and keep
    // the meaningful server messages ("no commit … in owner/repo" after a
    // force-push, the revoked-installation text) verbatim, because those ARE
    // the entire explanation.
    const raw = error instanceof Error ? error.message : ""
    const transportShaped = raw === "" || /status code|network error|timeout/i.test(raw)
    return (
      <EmptyState
        icon={FileWarning}
        title="Couldn't load the source for this build"
        description={
          transportShaped
            ? "The repository couldn't be read right now. This is usually temporary."
            : raw
        }
        action={{
          label: "Try again",
          onClick: () => void refetch(),
        }}
      />
    )
  }

  const repoURL = `https://github.com/${tree.repo_owner}/${tree.repo_name}`
  const repoName = `${tree.repo_owner}/${tree.repo_name}`

  return (
    <div className="flex h-full min-h-0 flex-col">
      {tree.truncated && (
        // GitHub caps very large tree listings. Saying so matters: a file
        // that exists but did not arrive would otherwise look deleted.
        <div className="flex items-start gap-2 border-b border-border/60 bg-status-warning/10 px-4 py-2 text-[12px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
          <span>
            This repository is too large for GitHub to list in full, so some files are missing from
            the tree below.
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <FileTree
          entries={tree.entries}
          selected={selected}
          onSelect={setSelected}
          initialExpanded={expanded}
          repoName={tree.repo_name}
        />
        <FileView
          projectId={projectId}
          gitRef={tree.ref}
          path={selected}
          onClose={() => {
            setSelected("")
          }}
        />
        <SourceDeploymentPanel build={build} project={project} />
      </div>

      <div className="shrink-0 border-t border-border/60 glass-1-bg">
        <div className="flex h-9 items-center border-b border-border/60 px-3">
          <span className="border-b-2 border-primary px-1 py-2 text-[11px] font-semibold text-foreground">
            Terminal
          </span>
          <a
            href={`${repoURL}/tree/${tree.ref}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex min-w-0 items-center gap-1.5 truncate font-mono text-[10px] text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{repoName}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
        <BuildLogPanel build={build} docked />
      </div>
    </div>
  )
}
