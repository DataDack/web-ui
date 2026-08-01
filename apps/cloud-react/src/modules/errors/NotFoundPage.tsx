import { ArrowRight } from "lucide-react"
import { useScreen } from "@/services/api/screen"
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Logo } from "@/components/Logo"

import { Network404 } from "./Network404"
import { NetworkField } from "./NetworkField"

/**
 * Premium standalone 404. A deep-black canvas: a drifting cloud field and a
 * live data-flow network behind a glowing, self-assembling "404" graph. The
 * scene reacts to the cursor with layered parallax. Theme-independent (always
 * the luxury dark/gold treatment) and fully reduced-motion aware.
 */
export function NotFoundPage() {
    useScreen("errors.not-found")
    const { t } = useTranslation()
    const reduce = useReducedMotion()

    // Cursor-driven parallax. Layers translate by depth: foreground (404) moves
    // most, copy a touch, the cloud field counter-drifts behind.
    const mx = useMotionValue(0)
    const my = useMotionValue(0)
    const sx = useSpring(mx, { stiffness: 60, damping: 18 })
    const sy = useSpring(my, { stiffness: 60, damping: 18 })

    const range = (a: number) => (reduce ? [0, 0] : [-a, a])
    const heroX = useTransform(sx, [-0.5, 0.5], range(18))
    const heroY = useTransform(sy, [-0.5, 0.5], range(14))
    const textX = useTransform(sx, [-0.5, 0.5], range(7))
    const cloudX = useTransform(sx, [-0.5, 0.5], reduce ? [0, 0] : [24, -24])
    const cloudY = useTransform(sy, [-0.5, 0.5], reduce ? [0, 0] : [18, -18])

    const onMove = (e: React.MouseEvent) => {
        mx.set(e.clientX / window.innerWidth - 0.5)
        my.set(e.clientY / window.innerHeight - 0.5)
    }

    return (
        <main
            onMouseMove={reduce ? undefined : onMove}
            className="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#050505] px-6 text-white"
        >
            {/* Drifting cloud field */}
            <motion.div
                aria-hidden
                style={{ x: cloudX, y: cloudY }}
                className="pointer-events-none absolute inset-0 -z-20"
            >
                <motion.div
                    className="absolute left-[14%] top-[18%] h-[42vmax] w-[42vmax] rounded-full bg-[#D4AF37]/[0.07] blur-[120px]"
                    animate={reduce ? undefined : { x: [0, 42, 0], y: [0, -28, 0] }}
                    transition={
                        reduce
                            ? undefined
                            : { duration: 26, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                    }
                />
                <motion.div
                    className="absolute bottom-[12%] right-[10%] h-[38vmax] w-[38vmax] rounded-full bg-[#2387ad]/[0.10] blur-[130px]"
                    animate={reduce ? undefined : { x: [0, -36, 0], y: [0, 30, 0] }}
                    transition={
                        reduce
                            ? undefined
                            : { duration: 32, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                    }
                />
            </motion.div>

            {/* Live data-flow network */}
            <NetworkField className="pointer-events-none absolute inset-0 -z-10 opacity-70" />

            {/* Vignette to settle the edges into the black */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_62%_52%_at_50%_45%,transparent,rgba(5,5,5,0.9))]"
            />

            {/* Brand mark */}
            <div className="absolute left-6 top-6">
                <Logo wordmarkClassName="text-sm text-white/85" iconClassName="size-6" />
            </div>

            {/* Hero — the glowing 404 graph with a breathing glow halo */}
            <motion.div
                style={{ x: heroX, y: heroY }}
                className="relative flex items-center justify-center"
            >
                <motion.div
                    aria-hidden
                    className="absolute inset-0 -z-10 blur-3xl [background:radial-gradient(circle_at_center,rgba(212,175,55,0.22),transparent_62%)]"
                    animate={
                        reduce ? undefined : { opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.05, 0.95] }
                    }
                    transition={
                        reduce
                            ? undefined
                            : { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                    }
                />
                <Network404 className="w-[min(88vw,620px)]" />
            </motion.div>

            {/* Copy + CTA */}
            <motion.div
                style={{ x: textX }}
                className="relative mt-3 flex max-w-xl flex-col items-center text-center"
            >
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#E8C766] backdrop-blur-sm">
                    {t("notFound.kicker")}
                </span>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {t("notFound.title")}
                </h1>
                <p className="mt-3 text-base italic text-white/55 sm:text-lg">
                    {t("notFound.subtitle")}
                </p>

                <Link
                    to="/"
                    className="group mt-9 inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-[#1c1503] outline-none transition hover:brightness-[1.06] focus-visible:ring-2 focus-visible:ring-[#FFD700]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
                    style={{
                        backgroundImage: "linear-gradient(180deg,#FFD700,#D4AF37)",
                        boxShadow:
                            "0 0 30px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.5)",
                    }}
                >
                    {t("notFound.cta")}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </motion.div>

            {/* Reliability cue — even the error state stays composed */}
            <div className="absolute bottom-6 flex items-center gap-2 text-xs text-white/40">
                <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                {t("notFound.status")}
            </div>
        </main>
    )
}
