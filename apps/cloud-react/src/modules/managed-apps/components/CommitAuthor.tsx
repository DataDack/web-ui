import { cn } from "@datadack/common-ui"

import { GitHubAvatar } from "./GitHubAvatar"
import { githubAvatarURL, githubProfileURL } from "../partials/project/build-format"

interface CommitAuthorProps {
  /** GitHub login. Empty when the commit's author email matched no account. */
  login: string
  /** What git recorded. Present whenever the commit is. */
  name: string
  /**
   * Whether the face links to the profile. Off inside a row that is itself a
   * link — a link inside a link is a click target the reader cannot predict.
   */
  linked?: boolean
  className?: string
}

/** Up to two initials from a git author name: "Ada Lovelace" → "AL". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ""
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

/**
 * Who wrote the commit, as a face.
 *
 * THREE CASES, and they are genuinely different rather than one case with holes
 * in it:
 *
 *   a login          the GitHub account's avatar — the only case with a real
 *                    face, and the only one worth linking anywhere
 *   a name only      a commit authored from an address GitHub cannot resolve.
 *                    Its initials, not the GitHub mark: the mark would claim an
 *                    account exists, and the initials are what the reader can
 *                    actually recognise a colleague by
 *   neither          a build that predates the field, or one adopted from a
 *                    workflow run that named no author. Falls through to
 *                    GitHubAvatar's own mark, which keeps the row's text aligned
 *                    with every other row rather than leaving a hole
 *
 * The name is always on the title, because an avatar is only recognisable to
 * someone who already knows the face.
 */
export function CommitAuthor({
  login,
  name,
  linked = false,
  className,
}: Readonly<CommitAuthorProps>) {
  const label = describeAuthor(login, name)

  if (login === "") {
    const monogram = initials(name)
    if (monogram === "") {
      return <GitHubAvatar className={cn("size-5", className)} />
    }
    return (
      <span
        role="img"
        title={label}
        aria-label={label}
        className={cn(
          "grid size-5 shrink-0 select-none place-items-center rounded-full glass-1-bg-raised text-[9px] font-semibold tracking-tight text-muted-foreground ring-1 ring-border/50",
          className,
        )}
      >
        {monogram}
      </span>
    )
  }

  const avatar = <GitHubAvatar src={githubAvatarURL(login)} className={cn("size-5", className)} />
  if (!linked) {
    // The wrapper carries the title, not the image: GitHubAvatar renders alt=""
    // by design (the name is text beside it wherever it is labelled), and a
    // `display: contents` wrapper would have no box for a tooltip to hang off.
    return (
      <span role="img" title={label} aria-label={label} className="inline-flex shrink-0">
        {avatar}
      </span>
    )
  }
  return (
    <a
      href={githubProfileURL(login)}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      // The row this sits in opens the build; without this, following the
      // profile link would open the build page behind the new tab.
      onClick={(event) => {
        event.stopPropagation()
      }}
      className="shrink-0"
    >
      {avatar}
    </a>
  )
}

/** "Ada Lovelace (@ada)", "@ada", "Ada Lovelace", or the honest unknown. */
function describeAuthor(login: string, name: string): string {
  if (login !== "" && name !== "" && name !== login) return `${name} (@${login})`
  if (login !== "") return `@${login}`
  if (name !== "") return name
  return "Author unknown"
}
