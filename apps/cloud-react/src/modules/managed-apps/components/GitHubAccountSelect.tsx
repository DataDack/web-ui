import { ExternalLink } from "lucide-react"

import { SmartSelect, type SmartSelectOption } from "@/components/console"
import { Button } from "@/components/ui/button"

import { Badge } from "@datadack/serverless-ui"

import { GitHubAvatar } from "./GitHubAvatar"
import { GITHUB_INSTALLATIONS_URL } from "../managed-apps.constants"
import { useGitHubConnections } from "../managed-apps.hooks"
import type { GitHubConnection } from "../managed-apps.types"

/** Every GitHub account's avatar is served at a stable URL keyed on its login. */
function avatarUrl(login: string) {
  return `https://github.com/${login}.png?size=64`
}

interface GitHubAccountSelectProps {
  value: number | undefined
  onChange: (installationId: number, connection: GitHubConnection) => void
  /** Opens the GitHub App install flow. */
  onConnect?: () => void
  disabled?: boolean
  invalid?: boolean
  id?: string
}

/**
 * Which GitHub account or organisation owns the repository.
 *
 * Revoked connections are listed but disabled, rather than filtered out as the
 * old wizard did. A user whose installation was revoked went looking for an
 * account that had silently vanished; showing it with the reason is what turns
 * that into an obvious "reconnect this one".
 */
export function GitHubAccountSelect({
  value,
  onChange,
  onConnect,
  disabled,
  invalid,
  id,
}: Readonly<GitHubAccountSelectProps>) {
  const { data: connections = [], isLoading, isFetching, isError, refetch } = useGitHubConnections()

  const options: SmartSelectOption<GitHubConnection>[] = connections.map((connection) => ({
    value: String(connection.installation_id),
    item: connection,
    searchText: `${connection.github_login} ${connection.target_type}`,
    disabled: connection.revoked,
    disabledReason: connection.revoked ? "Access was revoked — reconnect it on GitHub" : undefined,
  }))

  return (
    <SmartSelect<GitHubConnection>
      id={id}
      ariaLabel="GitHub account"
      options={options}
      value={value != null ? String(value) : undefined}
      disabled={disabled}
      invalid={invalid}
      loading={isLoading}
      fetching={isFetching}
      error={isError}
      onRefresh={() => void refetch()}
      placeholder="Select a GitHub account"
      searchPlaceholder="Search accounts…"
      emptyText="No GitHub account is connected yet."
      noMatchText={(q) => `No connected account matches “${q}”.`}
      errorText="Could not load your GitHub connections."
      onValueChange={(next, connection) => {
        onChange(Number(next), connection)
      }}
      // The chosen account keeps its avatar. The trigger falls back to the
      // row's `primary` alone, so without this the picker identified
      // accounts by face while open and by bare text once closed.
      renderValue={(option) => (
        <span className="flex min-w-0 items-center gap-2">
          <GitHubAvatar src={avatarUrl(option.item.github_login)} />
          <span className="truncate">{option.item.github_login}</span>
        </span>
      )}
      renderRow={(option) => ({
        // GitHub serves every account's avatar at a stable public URL
        // keyed on the login, so showing a real face here needs no new
        // field on the connection DTO.
        leading: <GitHubAvatar src={avatarUrl(option.item.github_login)} />,
        primary: option.item.github_login,
        secondary: `${option.item.target_type || "Account"} · installation #${String(option.item.installation_id)}`,
        trailing: option.item.revoked ? (
          <Badge variant="outline" className="text-[10px] text-status-danger">
            Revoked
          </Badge>
        ) : undefined,
      })}
      footer={
        <>
          {onConnect && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[12px]"
              onClick={onConnect}
            >
              Connect another account
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
            className="h-7 gap-1 px-2 text-[12px]"
          >
            <a href={GITHUB_INSTALLATIONS_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3" />
              Manage on GitHub
            </a>
          </Button>
        </>
      }
    />
  )
}
