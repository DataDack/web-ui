import { Section } from "@/components/console"

import type { ObservabilitySection } from "./sections"

/**
 * A section whose meter has not landed.
 *
 * Says what the page will show and that the figure is still being worked out —
 * and nothing else. In particular it does NOT name the service, environment
 * variable or component that is missing: that is written down in the section
 * map's `origin` field, for us, and a customer reading this screen wants to
 * know what they can expect, not which of our parts is unwired.
 *
 * It also never renders a plausible-looking number in the meantime. A
 * fabricated figure on an observability page is worse than a blank one: it is
 * indistinguishable from a real measurement and it will be believed.
 */
export function PendingSection({ section }: Readonly<{ section: ObservabilitySection }>) {
  const Icon = section.icon
  return (
    <Section variant="panel" title={section.label} description={section.summary}>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 px-6 py-14 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl glass-1-bg-raised">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-[15px] font-semibold text-foreground">Calculating</h3>
        <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">
          {section.summary} These figures are being enabled for this region — nothing about how your
          app is served changes in the meantime.
        </p>
      </div>
    </Section>
  )
}
