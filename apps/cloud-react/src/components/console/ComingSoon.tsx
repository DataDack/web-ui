import type { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FadeIn } from "./motion/FadeIn"
import { PageHeader, type Breadcrumb } from "./PageHeader"

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
}

/**
 * The centered "coming soon" panel alone, for surfaces that already have their
 * own header — a tab inside a detail page rather than a whole route. The
 * optional description replaces the generic copy, so a tab can say what is
 * actually on the way instead of "this service isn't available yet".
 */
export function ComingSoonPanel({
  icon: Icon,
  description,
}: Readonly<{ icon: LucideIcon; description?: string }>) {
  const { t } = useTranslation()

  return (
    <FadeIn className="flex flex-col items-center justify-center rounded-xl glass-1 border border-dashed border-border/60 px-6 py-20 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl glass-2">
        <Icon className="size-6 text-brand-gold" />
      </div>
      <span className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-gold/90">
        {t("console.comingSoon.badge")}
      </span>
      <h2 className="text-lg font-semibold text-foreground">{t("console.comingSoon.title")}</h2>
      <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">
        {description ?? t("console.comingSoon.description")}
      </p>
    </FadeIn>
  )
}

/**
 * Placeholder page for networking sub-services that have a sidebar entry and a
 * route but no implementation yet. Renders the standard page header followed by
 * a centered "coming soon" panel.
 */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  breadcrumbs,
}: Readonly<ComingSoonProps>) {
  return (
    <div>
      <PageHeader icon={Icon} title={title} description={description} breadcrumbs={breadcrumbs} />
      <ComingSoonPanel icon={Icon} />
    </div>
  )
}
