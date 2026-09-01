import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { cn } from "@datadack/common-ui"
import { EyeOff, Globe, Loader2 } from "lucide-react"

/**
 * The viewport the site is rendered AT, before scaling. Fixed rather than
 * measured: a thumbnail that reflowed to its own container width would show a
 * different breakpoint per surface — the narrow card would render the mobile
 * layout and the wide hero the desktop one — and the two would stop looking
 * like the same site. Rendering desktop everywhere and scaling down keeps one
 * truth, which is the whole point of a preview.
 */
const FRAME_WIDTH = 1280
const FRAME_HEIGHT = 800

/**
 * How long to wait for the frame's load event before calling the preview
 * unavailable.
 *
 * A site that refuses framing does not report that to us — `X-Frame-Options`
 * and `frame-ancestors` are enforced by the browser, which blanks the frame and
 * fires nothing this document can observe (the error is same-origin-only and
 * reading it would be a cross-origin violation). So the timeout IS the
 * detection: no load inside this window means either a blocked frame or a site
 * too slow to be worth previewing, and both deserve the same fallback.
 */
const LOAD_TIMEOUT_MS = 8_000

type PreviewPhase = "loading" | "ready" | "unavailable"

interface SitePreviewProps {
  /** The deployed address. Nothing is framed when it is empty. */
  url: string
  /**
   * Whether something is actually serving that address. A reserved-but-dead
   * URL must not be framed: the frame would show the gateway's 404 and present
   * it as the customer's site.
   */
  reachable: boolean
  /**
   * Changed to force a fresh load — pass the current build id so a redeploy
   * re-renders the preview instead of leaving the previous release on screen.
   */
  reloadKey?: string
  className?: string
}

/**
 * A live thumbnail of the deployed site.
 *
 * This is a real iframe scaled down, not a screenshot: the platform stores no
 * capture, and a preview only as fresh as the last capture job is worse than no
 * preview at all when the question being asked is "is my deploy live".
 *
 * The frame is inert by construction — an overlay swallows every pointer event,
 * and the sandbox grants scripts while withholding `allow-top-navigation`,
 * `allow-forms` and `allow-popups`. A thumbnail that could be clicked into, or
 * that could navigate the console away from itself, has stopped being a
 * thumbnail. `allow-scripts` stays because most deployed apps are client
 * rendered and would otherwise preview as a blank shell; it is safe alongside
 * the withheld `allow-same-origin`, which is what keeps the framed document out
 * of this origin's cookies and storage.
 */
export function SitePreview({
  url,
  reachable,
  reloadKey = "",
  className,
}: Readonly<SitePreviewProps>) {
  const [phase, setPhase] = useState<PreviewPhase>("loading")
  const [scale, setScale] = useState(0)
  const shell = useRef<HTMLDivElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const framed = Boolean(url) && reachable

  // The scale is the container's width over the rendered viewport's, measured
  // rather than assumed: this component is used at several widths and inside a
  // grid that resizes with the window, so a hardcoded factor would be right on
  // exactly one surface. Layout effect, so the first paint is already scaled —
  // measuring in a passive effect shows one frame of a 1280px page overflowing
  // its card.
  useLayoutEffect(() => {
    const node = shell.current
    if (!node || !framed) return undefined
    const measure = () => {
      setScale(node.clientWidth / FRAME_WIDTH)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [framed])

  // Re-arm on every input that changes what is being shown, keyed by the same
  // values the frame itself is keyed by — so a timeout can never outlive the
  // load it was started for and mark a fresh frame unavailable.
  useEffect(() => {
    if (!framed) return undefined
    setPhase("loading")
    timer.current = setTimeout(() => {
      setPhase("unavailable")
    }, LOAD_TIMEOUT_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [framed, url, reloadKey])

  const settle = useCallback((next: PreviewPhase) => {
    if (timer.current) clearTimeout(timer.current)
    setPhase(next)
  }, [])

  if (!framed) {
    return <PreviewPlaceholder className={className} icon={Globe} label="Nothing deployed yet" />
  }

  if (phase === "unavailable") {
    return (
      <PreviewPlaceholder
        className={className}
        icon={EyeOff}
        label="Preview unavailable"
        detail="This site blocks embedding"
      />
    )
  }

  return (
    <div
      ref={shell}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/60 bg-background",
        className,
      )}
    >
      {/* The frame is laid out at its true size and shrunk from the top-left,
          so the shell's own box — not the frame — decides how much of the page
          is visible. Held at zero opacity until measured, because an unscaled
          1280px frame flashing inside a 320px card is worse than a blank one. */}
      <div
        className="absolute left-0 top-0 origin-top-left transition-opacity duration-200"
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          transform: `scale(${String(scale)})`,
          opacity: scale > 0 ? 1 : 0,
        }}
      >
        <iframe
          key={`${url}:${reloadKey}`}
          src={url}
          title="Deployment preview"
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts"
          onLoad={() => {
            settle("ready")
          }}
          onError={() => {
            settle("unavailable")
          }}
          className="size-full border-0 bg-white"
          tabIndex={-1}
        />
      </div>

      {/* Swallows every interaction with the framed document, including the
          wheel events that would otherwise scroll the customer's page instead
          of the console's. */}
      <div className="absolute inset-0" />

      {phase === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-muted/40 text-[11px] text-muted-foreground backdrop-blur-[1px]">
          <Loader2 className="size-3.5 animate-spin" />
          Loading preview…
        </div>
      )}
    </div>
  )
}

function PreviewPlaceholder({
  className,
  icon: Icon,
  label,
  detail,
}: Readonly<{
  className?: string
  icon: typeof Globe
  label: string
  detail?: string
}>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/20 text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-5 opacity-50" />
      <span className="text-[11px]">{label}</span>
      {detail && <span className="text-[10px] opacity-70">{detail}</span>}
    </div>
  )
}
