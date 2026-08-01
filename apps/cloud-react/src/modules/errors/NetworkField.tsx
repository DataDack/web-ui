import { useEffect, useRef } from "react"

import { useReducedMotion } from "motion/react"

// Deterministic seeded PRNG (mulberry32). Keeps the field stable across renders
// and avoids Math.random per the codebase convention (see FloatingPaths).
function makeRng(seed: number): () => number {
    let s = seed | 0
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * Ambient data-flow network rendered on a canvas: slowly drifting infrastructure
 * "nodes" linked by gold lines that connect and disconnect as they move, with a
 * few brighter "packets" flowing through the field. Tuned for 60fps — transform
 * math only, capped node count, single clear/draw per frame. Honors
 * prefers-reduced-motion by rendering one static frame and stopping the loop.
 */
export function NetworkField({ className }: Readonly<{ className?: string }>) {
    const ref = useRef<HTMLCanvasElement>(null)
    const reduce = useReducedMotion()

    useEffect(() => {
        const canvas = ref.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let w = 0
        let h = 0
        let raf = 0

        interface Node {
            x: number
            y: number
            vx: number
            vy: number
            packet: boolean
            r: number
        }
        let nodes: Node[] = []

        const seed = () => {
            // Density scales with area, clamped so large displays stay calm.
            const count = Math.round(Math.min(82, Math.max(26, (w * h) / 22000)))
            const rng = makeRng(0x9e3779b9)
            nodes = Array.from({ length: count }, (_, i) => {
                const packet = i % 9 === 0
                return {
                    x: rng() * w,
                    y: rng() * h,
                    vx: (rng() - 0.5) * 0.18,
                    vy: (rng() - 0.5) * 0.18,
                    packet,
                    r: packet ? 2.2 : 1.3,
                }
            })
        }

        const resize = () => {
            const rect = canvas.getBoundingClientRect()
            w = rect.width
            h = rect.height
            canvas.width = Math.floor(w * dpr)
            canvas.height = Math.floor(h * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            seed()
        }

        const MAXD = 132

        const update = () => {
            for (const n of nodes) {
                n.x += n.vx
                n.y += n.vy
                if (n.x < -20) n.x = w + 20
                if (n.x > w + 20) n.x = -20
                if (n.y < -20) n.y = h + 20
                if (n.y > h + 20) n.y = -20
            }
        }

        const render = () => {
            ctx.clearRect(0, 0, w, h)

            // Links — gold lines whose opacity falls off with distance.
            ctx.lineWidth = 0.6
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i]
                    const b = nodes[j]
                    const dx = a.x - b.x
                    const dy = a.y - b.y
                    const d2 = dx * dx + dy * dy
                    if (d2 < MAXD * MAXD) {
                        const o = (1 - Math.sqrt(d2) / MAXD) * 0.26
                        ctx.strokeStyle = `rgba(212,175,55,${String(o)})`
                        ctx.beginPath()
                        ctx.moveTo(a.x, a.y)
                        ctx.lineTo(b.x, b.y)
                        ctx.stroke()
                    }
                }
            }

            // Nodes — packets glow, ordinary nodes sit quietly in gold.
            for (const n of nodes) {
                ctx.beginPath()
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
                if (n.packet) {
                    ctx.fillStyle = "rgba(255,215,0,0.9)"
                    ctx.shadowColor = "rgba(255,215,0,0.85)"
                    ctx.shadowBlur = 8
                } else {
                    ctx.fillStyle = "rgba(212,175,55,0.55)"
                    ctx.shadowBlur = 0
                }
                ctx.fill()
            }
            ctx.shadowBlur = 0
        }

        const frame = () => {
            update()
            render()
            raf = requestAnimationFrame(frame)
        }

        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        if (reduce) {
            render() // single static frame, no loop
        } else {
            raf = requestAnimationFrame(frame)
        }

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
    }, [reduce])

    return <canvas ref={ref} className={className} aria-hidden />
}
