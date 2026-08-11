import { useState, type CSSProperties } from "react"

import { cn } from "@datadack/common-ui"

const COLORS = [
  "var(--freedom-saffron)",
  "var(--freedom-confetti-white)",
  "var(--freedom-green)",
  "var(--freedom-navy)",
]

const PIECES_PER_CORNER = 44

interface Piece {
  id: number
  style: CSSProperties
}

function rand(min: number, max: number): number {
  // eslint-disable-next-line sonarjs/pseudo-random -- decides where a scrap of paper lands; nothing here is a secret
  return min + Math.random() * (max - min)
}

/**
 * One corner's worth of paper.
 *
 * `direction` is +1 for the left corner (everything flies right) and -1 for the
 * right one. Each piece carries its own trajectory as CSS custom properties so
 * a single keyframe animates all 44 — cheaper than 44 keyframes, and it keeps
 * the motion on the compositor.
 */
function makePieces(direction: 1 | -1): Piece[] {
  return Array.from({ length: PIECES_PER_CORNER }, (_, id) => ({
    id,
    style: {
      // Spread inward across the viewport; the near-vertical pieces get the
      // longest fall so the burst doesn't resolve into a single arc.
      "--cx": `${String(Math.round(direction * rand(6, 96)))}vw`,
      "--cy": `${String(Math.round(rand(24, 96)))}vh`,
      "--cr": `${String(Math.round(rand(-900, 900)))}deg`,
      "--cw": `${String(Math.round(rand(5, 10)))}px`,
      "--ch": `${String(Math.round(rand(9, 18)))}px`,
      animationDelay: `${String(Math.round(rand(0, 420)))}ms`,
      animationDuration: `${String(Math.round(rand(1700, 3000)))}ms`,
      background: COLORS[id % COLORS.length],
    } as CSSProperties,
  }))
}

export function ConfettiBurst({ corner }: Readonly<{ corner: "left" | "right" }>) {
  // Generated once per mount: re-randomising on every render would restart the
  // animation mid-flight and turn the burst into a flicker.
  const [pieces] = useState(() => makePieces(corner === "left" ? 1 : -1))

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute top-0", corner === "left" ? "left-0" : "right-0")}
    >
      {pieces.map((piece) => (
        <span key={piece.id} className="freedom-confetti-piece" style={piece.style} />
      ))}
    </div>
  )
}
