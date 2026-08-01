import { GitBranch } from "lucide-react"

import { SmartSelect, type SmartSelectOption } from "@/components/console"

import { Badge } from "@datadack/common-ui"

import { useGitHubBranches } from "../managed-apps.hooks"
import type { GitHubBranch } from "../managed-apps.types"

interface BranchSelectProps {
  installationId: number | undefined
  owner: string | undefined
  repo: string | undefined
  value: string | undefined
  onChange: (branch: string) => void
  /** Marked "default" in the list — the repo's own default branch. */
  defaultBranch?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
}

/** First 7 characters of a commit sha. */
function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

/**
 * The branch to build and deploy from. Every push to it triggers a deploy.
 *
 * Each row carries its head commit — a field the API has always returned
 * (`GitHubBranch.commit_sha`) and no surface has ever rendered. When two
 * branches look alike, the sha is what tells them apart.
 *
 * `renderUnknownValue` covers the case the old wizard hacked around by
 * prepending a synthetic entry to the list: a branch chosen before the branch
 * list resolves still renders as itself instead of reverting to a placeholder.
 */
export function BranchSelect({
  installationId,
  owner,
  repo,
  value,
  onChange,
  defaultBranch,
  disabled,
  invalid,
  id,
}: Readonly<BranchSelectProps>) {
  const {
    data: branches = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGitHubBranches(installationId, owner, repo)

  const options: SmartSelectOption<GitHubBranch>[] = branches.map((branch) => ({
    value: branch.name,
    item: branch,
    searchText: branch.name,
  }))

  const noRepo = !owner || !repo

  return (
    <SmartSelect<GitHubBranch>
      id={id}
      ariaLabel="Branch"
      options={options}
      value={value}
      disabled={disabled ?? noRepo}
      invalid={invalid}
      loading={isLoading}
      fetching={isFetching}
      error={isError}
      onRefresh={() => void refetch()}
      placeholder={noRepo ? "Select a repository first" : "Select a branch"}
      searchPlaceholder="Search branches…"
      emptyText="This repository has no branches we can see."
      noMatchText={(q) => `No branch matches “${q}”.`}
      errorText="Could not load branches for this repository."
      onValueChange={(next) => {
        onChange(next)
      }}
      renderValue={(option) => <span className="font-mono">{option.item.name}</span>}
      renderUnknownValue={(raw) => <span className="font-mono">{raw}</span>}
      renderRow={(option) => ({
        leading: <GitBranch className="size-3.5 text-muted-foreground" />,
        primary: <span className="font-mono">{option.item.name}</span>,
        secondary: option.item.commit_sha ? (
          <span className="font-mono">{shortSha(option.item.commit_sha)}</span>
        ) : undefined,
        trailing:
          option.item.name === defaultBranch ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              default
            </Badge>
          ) : undefined,
      })}
    />
  )
}
