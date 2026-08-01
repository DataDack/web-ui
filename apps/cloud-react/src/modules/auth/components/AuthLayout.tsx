import type { ComponentType, ReactNode } from "react"

import { Network, Zap } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { FadeIn } from "@/components/console/motion/FadeIn"
import { FloatingPaths } from "@/components/console/motion/FloatingPaths"
import { Logo } from "@/components/Logo"

/**
 * Premium split-screen auth shell. A constant dark editorial brand panel (left,
 * lg+) sits beside the themed sign-in panel (right). The brand panel surfaces
 * the product promise + trust signals; the sign-in panel stays minimal and
 * theme-aware. Entrance respects prefers-reduced-motion via the motion config.
 */
export function AuthLayout({
  kicker,
  headline,
  subtitle,
  editorial,
  quote,
  quoteAttr,
  footerLeft,
  footerLinkTo,
  footerLinkText,
  children,
}: Readonly<{
  kicker?: string
  headline: string
  subtitle?: string
  editorial?: string
  quote?: string
  quoteAttr?: string
  footerLeft?: string
  footerLinkTo?: string
  footerLinkText?: string
  children: ReactNode
}>) {
  return (
    <div className="grid min-h-dvh w-full lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr]">
      <BrandPanel editorial={editorial} quote={quote} quoteAttr={quoteAttr} />
      <SignInPanel
        kicker={kicker}
        headline={headline}
        subtitle={subtitle}
        footerLeft={footerLeft}
        footerLinkTo={footerLinkTo}
        footerLinkText={footerLinkText}
      >
        {children}
      </SignInPanel>
    </div>
  )
}

/* ─── Left: editorial brand canvas (constant dark, hidden < lg) ─────────── */

function BrandPanel({
  editorial,
  quote,
  quoteAttr,
}: Readonly<{ editorial?: string; quote?: string; quoteAttr?: string }>) {
  const { t } = useTranslation()

  return (
    <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#2d2d37] via-[#1f1f27] to-[#141418] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16 dark:from-[#0c0c11] dark:via-[#08080b] dark:to-[#050506]">
      {/* Ambient warm glow — gold leads; the ena (blue) tint only joins on
                dark, where it reads as depth rather than a muddy cast. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-brand-gold absolute -left-[12%] top-[-18%] h-[42vw] w-[42vw] rounded-full opacity-[0.18] blur-[150px]" />
        <div className="bg-ena-500 absolute right-[-12%] bottom-[-22%] h-[34vw] w-[34vw] rounded-full opacity-0 blur-[160px] dark:opacity-[0.10]" />
      </div>
      {/* Drifting gold paths — the signature motion of the auth shell, kept
                as subtle texture so it never reads as clutter */}
      <div className="text-brand-gold pointer-events-none absolute inset-0 opacity-45 [mask-image:radial-gradient(ellipse_95%_95%_at_55%_45%,#000_45%,transparent_92%)]">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      {/* Hairline gold edge where the brand panel meets the sign-in panel */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-px bg-gradient-to-b from-transparent via-brand-gold/40 to-transparent" />
      {/* Faint dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative">
        <FadeIn>
          <div className="flex items-center justify-between">
            <Logo className="text-xl text-white" />
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white/40">
              {t("auth.editorial.vol")}
            </span>
          </div>
        </FadeIn>
      </div>

      <div className="relative max-w-lg">
        <FadeIn delay={0.05}>
          <h2 className="text-[2.75rem] font-bold leading-[1.05] tracking-tight xl:text-[3.25rem]">
            {t("auth.brand.headline")}
          </h2>
        </FadeIn>
        {editorial && (
          <FadeIn delay={0.1}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/55">{editorial}</p>
          </FadeIn>
        )}

        <FadeIn delay={0.15}>
          <ul className="mt-10 space-y-4">
            <Feature icon={Zap} label={t("auth.brand.region")} />
            <Feature icon={Network} label={t("auth.brand.network")} />
          </ul>
        </FadeIn>
      </div>

      <div className="relative">
        {quote && (
          <FadeIn delay={0.2}>
            <figure className="max-w-md border-l border-brand-gold/40 pl-5">
              <blockquote className="text-[0.95rem] leading-relaxed text-white/75">
                “{quote}”
              </blockquote>
              {quoteAttr && (
                <figcaption className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/40">
                  {quoteAttr}
                </figcaption>
              )}
            </figure>
          </FadeIn>
        )}
        <p className="mt-8 text-xs text-white/30">{t("auth.brand.footer")}</p>
      </div>
    </section>
  )
}

function Feature({
  icon: Icon,
  label,
}: Readonly<{ icon: ComponentType<{ className?: string }>; label: string }>) {
  return (
    <li className="flex items-center gap-3 text-sm text-white/80">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-brand-gold">
        <Icon className="size-4" />
      </span>
      {label}
    </li>
  )
}

/* ─── Right: sign-in panel (theme-aware) ───────────────────────────────── */

function SignInPanel({
  kicker,
  headline,
  subtitle,
  footerLeft,
  footerLinkTo,
  footerLinkText,
  children,
}: Readonly<{
  kicker?: string
  headline: string
  subtitle?: string
  footerLeft?: string
  footerLinkTo?: string
  footerLinkText?: string
  children: ReactNode
}>) {
  return (
    <section className="bg-gradient-surface relative flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-10 text-foreground sm:px-8 sm:py-12">
      {/* Soft golden glow behind the card (mobile + light cohesion) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
        <div className="bg-brand-gold absolute left-1/2 top-[-8%] h-[50vw] w-[80vw] -translate-x-1/2 rounded-full opacity-[0.08] blur-[140px]" />
      </div>

      <div className="animate-content-enter relative w-full max-w-sm">
        {/* Logo: mobile only — the brand panel carries it on lg+ */}
        <div className="mb-8 flex justify-center lg:hidden">
          <Logo className="text-2xl" />
        </div>

        <div className="mb-8">
          {kicker && (
            <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brand-gold">
              {kicker}
            </span>
          )}
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{headline}</h1>
          {subtitle && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {children}

        {(footerLeft ?? footerLinkText) && (
          <p className="mt-8 text-sm text-muted-foreground">
            {footerLeft && <span>{footerLeft} </span>}
            {footerLinkText && footerLinkTo && (
              <Link
                to={footerLinkTo}
                className="font-semibold text-brand-gold transition-colors hover:text-brand-gold-hover"
              >
                {footerLinkText}
              </Link>
            )}
          </p>
        )}
      </div>
    </section>
  )
}
