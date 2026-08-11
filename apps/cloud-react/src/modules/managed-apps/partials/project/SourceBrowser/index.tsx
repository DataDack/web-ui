import { useEffect, useMemo, useState } from "react"

import { AlertTriangle, ExternalLink, FileWarning } from "lucide-react"

import {
  Button,
  EmptyState,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@datadack/common-ui"

import { FileTree } from "./FileTree"
import { FileView } from "./FileView"
import { ancestors, initialFile } from "./source-tree"
import { useProjectSourceTree } from "../../../managed-apps.hooks"
import { shortSha } from "../build-format"

interface SourceBrowserProps {
  projectId: string
  /** The commit to browse — a build's sha. Empty reads the tracked branch. */
  gitRef: string
  /** Shown beside the sha, so the reader knows which deploy this is. */
  label?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The code a deployment was built from — the repository at that commit.
 *
 * Read live from GitHub through the project's installation rather than from the
 * artifact: the artifact is compiled output, and a "view code" that shows a
 * minified bundle answers a question nobody asked. Everything here is pinned to
 * one immutable commit, which is what lets the tree and every file be cached
 * for the life of the tab.
 */
export function SourceBrowser({
  projectId,
  gitRef,
  label,
  open,
  onOpenChange,
}: Readonly<SourceBrowserProps>) {
  // Only fetched once the sheet is opened — the tree is a GitHub API call
  // against the installation's rate limit, not something to spend on a panel
  // nobody looked at.
  const { data: tree, isLoading, isError, error } = useProjectSourceTree(projectId, gitRef, open)
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

  const repoURL = tree ? `https://github.com/${tree.repo_owner}/${tree.repo_name}` : ""

  const body = () => {
    if (isLoading) {
      return (
        <div className="flex min-h-0 flex-1 gap-4 p-4">
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
      return (
        <EmptyState
          icon={FileWarning}
          title="Could not load this commit"
          // Verbatim: "no commit … in owner/repo" after a force-push, or the
          // revoked-installation message, is the entire explanation.
          description={
            error instanceof Error
              ? error.message
              : "The repository could not be read for this build."
          }
        />
      )
    }
    return (
      <div className="flex min-h-0 flex-1">
        <FileTree
          entries={tree.entries}
          selected={selected}
          onSelect={setSelected}
          initialExpanded={expanded}
        />
        <FileView projectId={projectId} gitRef={tree.ref} path={selected} />
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-5xl">
        <SheetHeader className="gap-1.5 border-b px-5 py-4">
          <SheetTitle className="flex flex-wrap items-center gap-2.5 pr-8">
            Source
            {gitRef !== "" && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] font-normal text-muted-foreground">
                {shortSha(gitRef)}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="flex min-w-0 flex-wrap items-center gap-2 text-[12px]">
            <span className="min-w-0 truncate">
              {label ?? "The repository as it was at this commit."}
            </span>
            {tree && (
              <Button asChild size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px]">
                <a href={`${repoURL}/tree/${tree.ref}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3" />
                  {tree.repo_owner}/{tree.repo_name}
                </a>
              </Button>
            )}
          </SheetDescription>
        </SheetHeader>

        {tree?.truncated && (
          // GitHub caps very large tree listings. Saying so matters: a file
          // that exists but did not arrive would otherwise look deleted.
          <div className="flex items-start gap-2 border-b border-border/60 bg-status-warning/10 px-5 py-2 text-[12px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
            <span>
              This repository is too large for GitHub to list in full, so some files are missing
              from the tree below.
            </span>
          </div>
        )}

        {body()}
      </SheetContent>
    </Sheet>
  )
}
