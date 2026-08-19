import { useEffect, useLayoutEffect, useRef } from "react"

import { cn } from "@datadack/common-ui"

import type { LifecycleEvent } from "./lifecycle"
import { LifecycleLines } from "./LifecycleLines"
import { lineTone, splitStamp, type LogTone } from "./log-tone"

/** How close to the bottom still counts as "at the bottom", in pixels. */
const BOTTOM_THRESHOLD = 32

const TONE_CLASS: Record<LogTone, string> = {
  normal: "text-muted-foreground",
  warning: "text-status-warning",
  danger: "text-status-danger",
}

interface LogBodyProps {
  text: string
  wrap: boolean
  following: boolean
  /** Raised when the user scrolls away from the tail, so Follow can switch off. */
  onLeaveTail: () => void
  placeholder: string
  /** What happened before the runner printed anything, and after it stopped. */
  leading?: LifecycleEvent[]
  trailing?: LifecycleEvent[]
  /** Time zero for the lifecycle lines' +offset column. */
  originIso?: string
}

/**
 * The log itself, with line numbers and a scroll guard.
 *
 * The guard is the point. The previous viewer forced `scrollTop = scrollHeight`
 * on every poll while a build was running, so scrolling up to read the error
 * that just flew past was impossible — three seconds later you were back at the
 * bottom. Here, scrolling away from the tail turns Follow off and the view
 * stays where you put it.
 */
export function LogBody({
  text,
  wrap,
  following,
  onLeaveTail,
  placeholder,
  leading = [],
  trailing = [],
  originIso = "",
}: Readonly<LogBodyProps>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Set while the component scrolls itself, so its own scroll event is not
  // mistaken for the user scrolling away.
  const selfScrolling = useRef(false)

  const lines = text === "" ? [] : text.split("\n")

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (!node || !following) return
    selfScrolling.current = true
    node.scrollTop = node.scrollHeight
  }, [text, following])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return

    const onScroll = () => {
      if (selfScrolling.current) {
        selfScrolling.current = false
        return
      }
      const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight <= BOTTOM_THRESHOLD
      if (!atBottom && following) onLeaveTail()
    }

    node.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      node.removeEventListener("scroll", onScroll)
    }
  }, [following, onLeaveTail])

  // One numbering across the whole view, lifecycle lines included. They are
  // numbered because they ARE lines of this log; the alternative is a gutter
  // that starts three rows down, which reads as two panes that happen to touch.
  // The runner's own text is unaffected — Copy and Download emit it verbatim,
  // so nothing that leaves here carries a number this viewer invented.
  const firstOutputNumber = leading.length + 1
  const trailingStart = firstOutputNumber + lines.length

  // The lifecycle lines are the log too, so an empty runner stream keeps them
  // and puts the placeholder between them — "queued, waiting for a worker"
  // with nothing under it is the honest picture of a build that has not
  // printed anything yet, and a bare placeholder threw all of it away.
  if (lines.length === 0) {
    return (
      <div ref={scrollRef} className="flex-1 overflow-auto glass-1-bg">
        <LifecycleLines events={leading} originIso={originIso} startNumber={1} edge="top" />
        <div className="px-4 py-6 pl-16 font-mono text-[12px] text-muted-foreground">
          {placeholder}
        </div>
        <LifecycleLines
          events={trailing}
          originIso={originIso}
          startNumber={firstOutputNumber}
          edge="bottom"
        />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto glass-1-bg">
      <LifecycleLines events={leading} originIso={originIso} startNumber={1} edge="top" />
      <table className="w-full border-collapse font-mono text-[12px] leading-relaxed">
        <tbody>
          {lines.map((line, index) => (
            // Log lines are not stable identities — the index IS the
            // identity here, and lines are only ever appended.
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index} className="align-baseline">
              <td className="w-12 shrink-0 select-none border-r border-border/40 px-2 text-right text-muted-foreground/50 tabular-nums">
                {index + firstOutputNumber}
              </td>
              {/* Always rendered, even for a line with no stamp: an empty
							    cell keeps the text column where the eye already is. */}
              <td className="w-20 shrink-0 select-none px-2 text-muted-foreground/60 tabular-nums">
                {splitStamp(line).time}
              </td>
              <td
                className={cn(
                  "px-1",
                  TONE_CLASS[lineTone(splitStamp(line).text)],
                  wrap ? "break-words whitespace-pre-wrap" : "whitespace-pre",
                )}
              >
                {splitStamp(line).text || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <LifecycleLines
        events={trailing}
        originIso={originIso}
        startNumber={trailingStart}
        edge="bottom"
      />
    </div>
  )
}
