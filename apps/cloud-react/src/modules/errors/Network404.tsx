import { motion, useReducedMotion } from "motion/react"

/**
 * The "404" rendered as a cloud-infrastructure graph: each digit is built from
 * glowing gold network lines that draw themselves in, then breathe (connect /
 * disconnect), with pulsing nodes at every junction and faint cross-digit links
 * suggesting a wider topology. All motion is transform/opacity-only and honors
 * prefers-reduced-motion (static, fully-drawn graph when reduced).
 */

type Pt = readonly [number, number]
interface Glyph {
    readonly nodes: readonly Pt[]
    readonly edges: readonly (readonly [number, number])[]
    readonly x: number
}

// Digit "4" — node graph: full-height right stem, short left vertical, and a
// crossbar running through the stem. Reads clearly as a "4" at any scale.
const FOUR_NODES: readonly Pt[] = [
    [75, 0], // 0 stem top
    [75, 160], // 1 stem foot
    [20, 0], // 2 left vertical top
    [20, 90], // 3 crossbar left / left vertical foot
    [95, 90], // 4 crossbar right
    [75, 90], // 5 stem ∩ crossbar junction
]
const FOUR_EDGES = [
    [0, 5],
    [5, 1],
    [2, 3],
    [3, 5],
    [5, 4],
] as const

// Digit "0" — octagon ring of nodes
const ZERO_NODES: readonly Pt[] = [
    [50, 2],
    [86, 26],
    [98, 80],
    [86, 134],
    [50, 158],
    [14, 134],
    [2, 80],
    [14, 26],
]
const ZERO_EDGES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 0],
] as const

const GLYPHS: readonly Glyph[] = [
    { nodes: FOUR_NODES, edges: FOUR_EDGES, x: 0 },
    { nodes: ZERO_NODES, edges: ZERO_EDGES, x: 160 },
    { nodes: FOUR_NODES, edges: FOUR_EDGES, x: 320 },
]

// Cross-digit infrastructure links: [glyphIndex, nodeIndex] → [glyphIndex, nodeIndex]
const LINKS = [
    [
        [0, 2],
        [1, 6],
    ],
    [
        [1, 2],
        [2, 1],
    ],
] as const

const abs = (g: number, n: number): Pt => {
    const glyph = GLYPHS[g]
    const [px, py] = glyph.nodes[n]
    return [px + glyph.x, py]
}

const GOLD = "#D4AF37"

export function Network404({ className }: Readonly<{ className?: string }>) {
    const reduce = useReducedMotion()

    // Flatten edges to a single list so draw-in stagger reads left-to-right.
    const edges = GLYPHS.flatMap((glyph, g) =>
        glyph.edges.map(([a, b], e) => ({
            key: `${String(g)}-${String(e)}`,
            from: abs(g, a),
            to: abs(g, b),
            delay: 0.2 + g * 0.22 + e * 0.1,
        }))
    )
    const nodes = GLYPHS.flatMap((glyph, g) =>
        glyph.nodes.map((_, n) => ({
            key: `${String(g)}-${String(n)}`,
            pt: abs(g, n),
            i: g * 3 + n,
        }))
    )

    const drawTransition = reduce
        ? { duration: 0 }
        : { pathLength: { duration: 1.1, ease: [0.16, 1, 0.3, 1] as const } }

    return (
        <svg
            className={className}
            viewBox="-44 -40 508 244"
            fill="none"
            role="img"
            aria-label="404"
        >
            <defs>
                {/* userSpaceOnUse so the gradient maps to canvas coords — a
                    bbox gradient renders nothing on axis-aligned (zero-area) lines */}
                <linearGradient
                    id="dd-404-gold"
                    gradientUnits="userSpaceOnUse"
                    x1="-44"
                    y1="0"
                    x2="464"
                    y2="200"
                >
                    <stop offset="0" stopColor="#FFD700" />
                    <stop offset="0.5" stopColor="#FFC53D" />
                    <stop offset="1" stopColor={GOLD} />
                </linearGradient>
            </defs>

            {/* Soft line glow — blurred duplicate of the graph, slowly pulsing */}
            <motion.g
                style={{ filter: "blur(6px)" }}
                animate={reduce ? undefined : { opacity: [0.35, 0.75, 0.35] }}
                transition={
                    reduce
                        ? undefined
                        : { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                }
            >
                {edges.map((edge) => (
                    <line
                        key={`glow-${edge.key}`}
                        x1={edge.from[0]}
                        y1={edge.from[1]}
                        x2={edge.to[0]}
                        y2={edge.to[1]}
                        stroke="url(#dd-404-gold)"
                        strokeWidth={9}
                        strokeLinecap="round"
                    />
                ))}
            </motion.g>

            {/* Cross-digit links — faint, fading in and out */}
            {LINKS.map(([a, b], i) => {
                const from = abs(a[0], a[1])
                const to = abs(b[0], b[1])
                return (
                    <motion.line
                        key={`link-${String(i)}`}
                        x1={from[0]}
                        y1={from[1]}
                        x2={to[0]}
                        y2={to[1]}
                        stroke="url(#dd-404-gold)"
                        strokeWidth={1}
                        strokeDasharray="3 6"
                        initial={{ opacity: 0 }}
                        animate={reduce ? { opacity: 0.3 } : { opacity: [0, 0.45, 0] }}
                        transition={
                            reduce
                                ? undefined
                                : {
                                      duration: 5,
                                      delay: 1.4 + i * 0.6,
                                      repeat: Number.POSITIVE_INFINITY,
                                      ease: "easeInOut",
                                  }
                        }
                    />
                )
            })}

            {/* Crisp graph — draws itself in, then breathes */}
            {edges.map((edge) => (
                <motion.line
                    key={edge.key}
                    x1={edge.from[0]}
                    y1={edge.from[1]}
                    x2={edge.to[0]}
                    y2={edge.to[1]}
                    stroke="url(#dd-404-gold)"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    initial={{ pathLength: reduce ? 1 : 0, strokeOpacity: 0.95 }}
                    animate={{
                        pathLength: 1,
                        strokeOpacity: reduce ? 0.95 : [0.95, 0.65, 0.95],
                    }}
                    transition={{
                        ...drawTransition,
                        ...(reduce
                            ? {}
                            : {
                                  strokeOpacity: {
                                      duration: 3.4,
                                      delay: edge.delay + 1,
                                      repeat: Number.POSITIVE_INFINITY,
                                      ease: "easeInOut",
                                  },
                              }),
                    }}
                />
            ))}

            {/* Nodes — pulsing infrastructure junctions */}
            {nodes.map((node) => (
                <motion.circle
                    key={node.key}
                    cx={node.pt[0]}
                    cy={node.pt[1]}
                    r={3.6}
                    fill="#FFD700"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
                    animate={{
                        scale: reduce ? 1 : [1, 1.35, 1],
                        opacity: reduce ? 1 : [0.55, 1, 0.55],
                    }}
                    transition={
                        reduce
                            ? { duration: 0 }
                            : {
                                  duration: 2.6,
                                  delay: 0.6 + node.i * 0.05,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "easeInOut",
                              }
                    }
                />
            ))}
        </svg>
    )
}
