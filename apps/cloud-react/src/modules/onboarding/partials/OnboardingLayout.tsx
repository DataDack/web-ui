import type { ReactNode } from "react"

import { MotionConfig } from "motion/react"
import { useTranslation } from "react-i18next"

import { WizardStepper } from "@/components/console"
import { FadeIn } from "@/components/console/motion/FadeIn"
import { FloatingPaths } from "@/components/console/motion/FloatingPaths"
import type { WizardStepMeta } from "@/components/console/wizard/WizardStepper"
import { Logo } from "@/components/Logo"

export function OnboardingLayout({
    steps,
    currentIndex,
    maxVisitedIndex,
    onStepClick,
    title,
    description,
    children,
}: Readonly<{
    steps: WizardStepMeta[]
    currentIndex: number
    maxVisitedIndex: number
    onStepClick: (i: number) => void
    title: string
    description?: string
    children: ReactNode
}>) {
    const { t } = useTranslation()
    return (
        <MotionConfig reducedMotion="user">
        <div className="bg-gradient-surface min-h-screen w-full lg:grid lg:h-screen lg:grid-cols-[2fr_3fr] lg:overflow-hidden">
            {/* Brand + stepper rail — dark editorial panel with golden ambience,
                cohesive with the auth shell and true to the gold brand. Fixed height
                (does not scroll); only the content panel scrolls. */}
            <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#2d2d37] via-[#1f1f27] to-[#141418] p-10 text-white lg:flex lg:h-screen lg:flex-col lg:justify-between xl:p-12 dark:from-[#0c0c11] dark:via-[#08080b] dark:to-[#050506]">
                {/* Ambient warm glow — gold leads; ena (blue) tint only on dark */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="bg-brand-gold absolute -left-[12%] top-[-12%] h-[42vw] w-[42vw] rounded-full opacity-[0.18] blur-[150px]" />
                    <div className="bg-ena-500 absolute right-[-12%] bottom-[-18%] h-[34vw] w-[34vw] rounded-full opacity-0 blur-[160px] dark:opacity-[0.08]" />
                </div>
                {/* Drifting gold paths — cohesive with the auth shell */}
                <div className="text-brand-gold pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_95%_95%_at_55%_45%,#000_45%,transparent_92%)]">
                    <FloatingPaths position={1} />
                    <FloatingPaths position={-1} />
                </div>
                {/* Faint line grid for texture/depth — tilted in 3D so it recedes
                    into depth (perspective floor). Oversized + faded so the
                    foreshortened far edge still covers the rail. */}
                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[320%] w-[320%] opacity-[0.07]"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)",
                        backgroundSize: "52px 52px",
                        transform:
                            "translate(-50%, -50%) perspective(900px) rotateX(58deg) rotateZ(8deg)",
                        transformOrigin: "center",
                        maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)",
                    }}
                />
                {/* Hairline gold edge where the rail meets the content */}
                <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-px bg-gradient-to-b from-transparent via-brand-gold/40 to-transparent" />

                <FadeIn>
                    <div className="relative flex items-center justify-between">
                        <Logo className="text-lg text-white" iconClassName="size-8" />
                        <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white/35">
                            {t("auth.editorial.vol")}
                        </span>
                    </div>
                </FadeIn>

                <div className="relative">
                    <FadeIn delay={0.05}>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-gold">
                            {t("onboarding.setup")}
                        </p>
                        <h2 className="mt-3 max-w-xs text-[1.75rem] font-bold leading-[1.1] tracking-tight">
                            {t("auth.brand.headline")}
                        </h2>
                    </FadeIn>
                    <FadeIn delay={0.1}>
                        <div className="mt-9">
                            <WizardStepper
                                steps={steps}
                                currentIndex={currentIndex}
                                maxVisitedIndex={maxVisitedIndex}
                                onStepClick={onStepClick}
                                variant="onBrand"
                            />
                        </div>
                    </FadeIn>
                </div>

                <FadeIn delay={0.15}>
                    <p className="relative text-xs text-white/35">{t("auth.brand.footer")}</p>
                </FadeIn>
            </aside>

            {/* Content — full-page panel (no floating card), the only scroll region */}
            <main className="bg-gradient-surface relative bg-background text-foreground lg:h-screen lg:overflow-y-auto">
                {/* Soft golden glow for cohesion on mobile / light theme */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
                    <div className="bg-brand-gold absolute left-1/2 top-[-8%] h-[50vw] w-[80vw] -translate-x-1/2 rounded-full opacity-[0.08] blur-[140px]" />
                </div>

                {/* Top-aligned so tall forms never clip the heading; generous top
                    spacing keeps the header off the viewport edge. */}
                <div className="flex min-h-full items-start justify-center px-6 py-12 sm:px-10 lg:px-16 lg:py-20 xl:px-24">
                    <div className="animate-content-enter relative w-full max-w-2xl">
                        {/* Logo: mobile only — the brand rail carries it on lg+ */}
                        <div className="mb-10 lg:hidden">
                            <Logo className="text-xl" />
                        </div>

                        <div className="mb-8">
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                            {description && (
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                        {children}
                    </div>
                </div>
            </main>
        </div>
        </MotionConfig>
    )
}
