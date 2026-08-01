import { useState } from "react"

import { Label } from "@DataDack/common-ui"
import { Globe, Network, SquareDashed } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { applyPreset, type PresetId } from "./presets"
import type { FormValues } from "./schema"
import { TypeCard } from "./TypeCard"

const ICONS: Record<PresetId, typeof Globe> = {
  web: Globe,
  tcp: Network,
  blank: SquareDashed,
}

/**
 * Seeds the whole form from a starting shape.
 *
 * Applying a preset resets rather than merges: a half-applied preset (an HTTP
 * listener left over on a network load balancer) is a configuration the backend
 * rejects, and quietly keeping it would be worse than clearing the name field.
 */
export function PresetChooser({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<PresetId>("web")

  const choose = (preset: PresetId) => {
    setSelected(preset)
    // Keep whatever the user has already typed — resetting the name because
    // they changed their mind about the shape would be hostile.
    const name = form.getValues("name")
    form.reset({ ...applyPreset(preset), name })
  }

  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {t("loadBalancers.wizard.startFrom")}
      </Label>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(ICONS) as PresetId[]).map((id) => (
          <TypeCard
            key={id}
            icon={ICONS[id]}
            selected={selected === id}
            title={t(`loadBalancers.wizard.presets.${id}.title`)}
            description={t(`loadBalancers.wizard.presets.${id}.description`)}
            onSelect={() => {
              choose(id)
            }}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{t("loadBalancers.wizard.presetsHint")}</p>
    </div>
  )
}
