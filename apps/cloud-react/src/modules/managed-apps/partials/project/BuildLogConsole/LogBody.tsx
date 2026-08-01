import { useEffect, useLayoutEffect, useRef } from "react"

import { cn } from "@/lib/utils"

/** How close to the bottom still counts as "at the bottom", in pixels. */
const BOTTOM_THRESHOLD = 32

interface LogBodyProps {
  text: string
  wrap: boolean
  following: boolean
  /** Raised when the user scrolls away from the tail, so Follow can switch off. */
  onLeaveTail: () => void
  placeholder: string
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

  if (lines.length === 0) {
    return (
      <div className="flex-1 px-4 py-6 font-mono text-[12px] text-muted-foreground">
        {placeholder}
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto bg-muted/20">
      <table className="w-full border-collapse font-mono text-[12px] leading-relaxed">
        <tbody>
          {lines.map((line, index) => (
            // Log lines are not stable identities — the index IS the
            // identity here, and lines are only ever appended.
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index} className="align-baseline">
              <td className="w-10 shrink-0 select-none border-r border-border/40 px-2 text-right text-muted-foreground/50 tabular-nums">
                {index + 1}
              </td>
              <td
                className={cn(
                  "px-3 text-muted-foreground",
                  wrap ? "break-words whitespace-pre-wrap" : "whitespace-pre",
                )}
              >
                {line || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
