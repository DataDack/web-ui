import { useState } from "react"

import {
  Binary,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileWarning,
  WrapText,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button, cn, formatBytes, Skeleton } from "@datadack/common-ui"

import { useProjectSourceFile } from "../../../managed-apps.hooks"

interface FileViewProps {
  projectId: string
  /** The commit being browsed — a build's sha, or the tracked branch. */
  gitRef: string
  path: string
  onClose?: () => void
}

/**
 * How many lines are painted before the view stops.
 *
 * Every line is a table row, so a 20,000-line lockfile is 20,000 DOM nodes that
 * lock the tab for a second. The cap is stated in the footer with a link to
 * GitHub, which is a better reader for a file that long anyway.
 */
const MAX_RENDERED_LINES = 5_000

/** A centred message for the states that are not a file to read. */
function Notice({
  icon: Icon,
  title,
  detail,
  action,
}: Readonly<{
  icon: typeof Binary
  title: string
  detail: string
  action?: React.ReactNode
}>) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <Icon className="size-6 text-muted-foreground/50" />
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-[12px] text-muted-foreground">{detail}</p>
      {action}
    </div>
  )
}

/**
 * One file of the commit.
 *
 * Deliberately not syntax-highlighted. Colouring arbitrary source needs a
 * grammar per language — tens of kilobytes of parser shipped to every console
 * user, for a panel most of them open once. Line numbers, monospace and a wrap
 * toggle are what make code readable; the rest is decoration, and GitHub is one
 * click away for anyone who wants it.
 */
export function FileView({ projectId, gitRef, path, onClose }: Readonly<FileViewProps>) {
  const [wrap, setWrap] = useState(false)
  const { data: file, isLoading, isError, error } = useProjectSourceFile(projectId, gitRef, path)

  if (path === "") {
    return (
      <div className="h-full min-h-0 min-w-0 flex-1">
        <Notice
          icon={FileWarning}
          title="No file selected"
          detail="Pick a file from the tree to read it at this commit."
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full min-h-0 min-w-0 flex-1 space-y-2 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !file) {
    return (
      <div className="h-full min-h-0 min-w-0 flex-1">
        <Notice
          icon={FileWarning}
          title="Could not read this file"
          // The server's reason verbatim — "no commit … in owner/repo" after a
          // force-push is the whole explanation, and a generic message hides it.
          detail={error instanceof Error ? error.message : "The file could not be loaded."}
        />
      </div>
    )
  }

  const openOnGitHub = (
    <Button asChild size="sm" variant="outline" className="mt-1 gap-1.5">
      <a href={file.html_url} target="_blank" rel="noreferrer">
        <ExternalLink className="size-3.5" />
        Open on GitHub
      </a>
    </Button>
  )

  const lines = file.content === "" ? [] : file.content.split("\n")
  const shown = lines.slice(0, MAX_RENDERED_LINES)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(file.content)
      toast.success("File copied")
    } catch {
      toast.error("Could not copy this file")
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([file.content], { type: "text/plain" }))
    const link = document.createElement("a")
    link.href = url
    link.download = path.slice(path.lastIndexOf("/") + 1)
    link.click()
    URL.revokeObjectURL(url)
  }

  // The three non-readable answers first — each states what the file IS, so
  // "nothing rendered" is never left to look like a failure.
  const body = () => {
    if (file.too_large) {
      return (
        <Notice
          icon={FileWarning}
          title="Too large to preview"
          detail={`This file is ${formatBytes(file.size)} — the viewer stops at ${formatBytes(file.max_bytes)}.`}
          action={openOnGitHub}
        />
      )
    }
    if (file.binary) {
      return (
        <Notice
          icon={Binary}
          title="Binary file"
          detail={`${formatBytes(file.size)} of data that is not text — there is nothing to show here.`}
          action={openOnGitHub}
        />
      )
    }
    if (lines.length === 0) {
      return <Notice icon={FileWarning} title="Empty file" detail="This file has no contents." />
    }
    return (
      <div className="min-h-0 flex-1 overflow-auto glass-1-bg">
        <table className="w-full border-collapse font-mono text-[12px] leading-relaxed">
          <tbody>
            {shown.map((line, index) => (
              // A line's identity IS its position in the file.
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index} className="align-baseline">
                <td className="w-12 shrink-0 border-r border-border/40 px-2 text-right text-muted-foreground/50 tabular-nums select-none">
                  {index + 1}
                </td>
                <td
                  className={cn(
                    "px-3 text-foreground/85",
                    wrap ? "break-words whitespace-pre-wrap" : "whitespace-pre",
                  )}
                >
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length > shown.length && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-4 py-3 text-[12px] text-muted-foreground">
            Showing the first {MAX_RENDERED_LINES.toLocaleString()} of{" "}
            {lines.length.toLocaleString()} lines.
            <a
              href={file.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-status-info hover:underline"
            >
              Read the whole file on GitHub
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-stretch border-b border-border/60 glass-1-bg">
        <div className="flex min-w-0 max-w-64 items-center gap-2 border-r border-border/60 border-t-2 border-t-primary glass-3-bg px-3">
          <FileCode2 className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">
            {path.slice(path.lastIndexOf("/") + 1)}
          </span>
          {onClose && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6 shrink-0"
              aria-label="Close file"
              title="Close file"
              onClick={onClose}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-9 items-center gap-2 border-b border-border/60 px-3">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px]" title={path}>
          <span className="text-muted-foreground/60">
            {path.slice(0, path.lastIndexOf("/") + 1)}
          </span>
          <span className="text-foreground">{path.slice(path.lastIndexOf("/") + 1)}</span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
          {formatBytes(file.size)}
          {lines.length > 0 && ` · ${String(lines.length)} lines`}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className={cn("size-7", wrap && "text-status-info")}
          aria-label="Toggle line wrapping"
          title="Toggle line wrapping"
          disabled={file.content === ""}
          onClick={() => {
            setWrap((current) => !current)
          }}
        >
          <WrapText className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Copy this file"
          title="Copy this file"
          disabled={file.content === ""}
          onClick={() => void copy()}
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Download this file"
          title="Download this file"
          disabled={file.content === ""}
          onClick={download}
        >
          <Download className="size-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" asChild>
          <a
            href={file.html_url}
            target="_blank"
            rel="noreferrer"
            title="Open on GitHub"
            aria-label="Open on GitHub"
          >
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>

      {body()}
    </div>
  )
}
