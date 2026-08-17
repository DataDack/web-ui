import { Button, cn } from "@datadack/common-ui"
import { ArrowDownToLine, Copy, Download, WrapText } from "lucide-react"

interface LogToolbarProps {
  /** The build is still writing — Follow only exists while this is true. */
  active: boolean
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
 * bottom every three seconds makes that impossible. It disappears entirely
 * once the build settles — tailing a log nothing writes to does nothing, and
 * a control that does nothing teaches the reader not to trust the others.
 */
export function LogToolbar({
  active,
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

      {active && (
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
      )}

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
