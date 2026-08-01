import { useState } from "react"

import { Badge } from "@datadack/common-ui"
import { Archive, ExternalLink, GitFork, Lock } from "lucide-react"

import { SmartSelect, type SmartSelectOption } from "@/components/console"
import { Button } from "@datadack/common-ui"

import { GitHubAvatar } from "./GitHubAvatar"
import { LanguageDot } from "./LanguageDot"
import { GITHUB_INSTALLATIONS_URL } from "../managed-apps.constants"
import { useGitHubRepos } from "../managed-apps.hooks"
import type { GitHubRepo } from "../managed-apps.types"

interface RepoSelectProps {
  installationId: number | undefined
  value: string | undefined
  onChange: (fullName: string, repo: GitHubRepo) => void
  disabled?: boolean
  invalid?: boolean
  id?: string
}

/** "3d ago" for an RFC3339 stamp; "" when GitHub reported no push. */
function pushedLabel(iso: string): string {
  if (!iso) return ""
  const deltaMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(deltaMs)) return ""
  const days = Math.floor(deltaMs / 86_400_000)
  if (days < 1) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${String(days)}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${String(months)}mo ago`
  return `${String(Math.floor(months / 12))}y ago`
}

/**
 * The repository to deploy from, most recently pushed first.
 *
 * Search is server-side (`mode="server"`): GitHub's installation endpoint has
 * no query of its own, so the backend holds the full list and filters it. The
 * alternative — filtering the loaded page in the browser — gives a large
 * organisation a search box that cannot find most of its own repositories.
 *
 * The footer is permanent rather than an empty-state afterthought: a missing
 * repository is almost always an App-access problem, and that is fixed on
 * GitHub, not here.
 */
export function RepoSelect({
  installationId,
  value,
  onChange,
  disabled,
  invalid,
  id,
}: Readonly<RepoSelectProps>) {
  const [query, setQuery] = useState("")
  const {
    data: repos = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGitHubRepos(installationId, query)

  const options: SmartSelectOption<GitHubRepo>[] = repos.map((repo) => ({
    value: repo.full_name,
    item: repo,
    // Server-filtered, but kept accurate so the value still resolves.
    searchText: `${repo.full_name} ${repo.owner} ${repo.name}`,
    group: repo.owner,
  }))

  return (
    <SmartSelect<GitHubRepo>
      id={id}
      ariaLabel="Repository"
      options={options}
      value={value}
      mode="server"
      onSearchChange={setQuery}
      disabled={disabled ?? installationId == null}
      invalid={invalid}
      loading={isLoading}
      fetching={isFetching}
      error={isError}
      onRefresh={() => void refetch()}
      placeholder={installationId == null ? "Select a GitHub account first" : "Select a repository"}
      searchPlaceholder="Search repositories…"
      emptyText="No repositories are visible to this installation."
      noMatchText={(q) => `No repository matches “${q}”.`}
      errorText="Could not load repositories for this account."
      onValueChange={(next, repo) => {
        onChange(next, repo)
      }}
      // Owner avatar included: the list is grouped by owner and identifies
      // repositories by face, so a chosen value showing only text drops the
      // very thing that told you whose repository it is.
      renderValue={(option) => (
        <span className="flex min-w-0 items-center gap-2">
          <GitHubAvatar src={option.item.owner_avatar} />
          <span className="truncate font-mono">{option.item.full_name}</span>
        </span>
      )}
      renderUnknownValue={(raw) => <span className="font-mono">{raw}</span>}
      renderRow={(option) => {
        const repo = option.item
        const pushed = pushedLabel(repo.pushed_at)
        return {
          // The owner's avatar, which the API has always returned. In a
          // list grouped by owner it is the fastest way to see whose
          // repository this is.
          leading: <GitHubAvatar src={repo.owner_avatar} />,
          primary: <span className="font-mono">{repo.name}</span>,
          secondary: (
            <span className="flex items-center gap-1.5">
              {repo.language && <LanguageDot language={repo.language} />}
              {repo.language && pushed && <span aria-hidden>·</span>}
              {pushed && <span>pushed {pushed}</span>}
              {repo.description && (
                <>
                  {(repo.language || pushed) && <span aria-hidden>·</span>}
                  <span className="truncate">{repo.description}</span>
                </>
              )}
            </span>
          ),
          trailing: (
            <>
              {repo.fork && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <GitFork className="size-2.5" />
                  Fork
                </Badge>
              )}
              {repo.archived && (
                <Badge variant="outline" className="gap-1 text-[10px] text-status-warning">
                  <Archive className="size-2.5" />
                  Archived
                </Badge>
              )}
              {repo.private && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Lock className="size-2.5" />
                  Private
                </Badge>
              )}
            </>
          ),
        }
      }}
      footer={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          className="h-7 gap-1 px-2 text-[12px]"
        >
          <a href={GITHUB_INSTALLATIONS_URL} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3" />
            Adjust GitHub App access
          </a>
        </Button>
      }
    />
  )
}
