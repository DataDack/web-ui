import { ArrowDownToLine, Copy, Download, WrapText } from "lucide-react"

import { Button } from "@datadack/common-ui"
import { cn } from "@/lib/utils"

interface LogToolbarProps {
  following: boolean
  onToggleFollow: () => void
  wrap: boolean
  onToggleWrap: () => void
  onCopy: () => void
  onDownload: () => void
  lineCount: number
  disabled: boolean
}

/**
 * Controls over the log view.
 *
 * Follow is a toggle rather than something the component decides on its own:
 * reading a failure means scrolling back, and a view that yanks you to the
 * bottom every three seconds makes that impossible.
 */
export function LogToolbar({
  following,
  onToggleFollow,
  wrap,
  onToggleWrap,
  onCopy,
  onDownload,
  lineCount,
  disabled,
}: Readonly<LogToolbarProps>) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border/60 px-3 py-1.5">
      <span className="mr-auto font-mono text-[11px] text-muted-foreground">
        {lineCount === 1 ? "1 line" : `${String(lineCount)} lines`}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={following}
        className={cn("h-7 gap-1.5 px-2 text-[12px]", following && "text-status-info")}
        onClick={onToggleFollow}
      >
        <ArrowDownToLine className="size-3.5" />
        Follow
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={wrap}
        className={cn("h-7 gap-1.5 px-2 text-[12px]", wrap && "text-status-info")}
        onClick={onToggleWrap}
      >
        <WrapText className="size-3.5" />
        Wrap
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="h-7 gap-1.5 px-2 text-[12px]"
        onClick={onCopy}
      >
        <Copy className="size-3.5" />
        Copy
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="h-7 gap-1.5 px-2 text-[12px]"
        onClick={onDownload}
      >
        <Download className="size-3.5" />
        Download
      </Button>
    </div>
  )
}
