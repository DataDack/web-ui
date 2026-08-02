import { useTranslation } from "react-i18next"
import { useState } from "react"

import { Button } from "@datadack/common-ui"
import { Bell, Check } from "lucide-react"

import type { CatalogImage } from "./images.catalog"

/** Interest is remembered per image, per browser. */
const notifyKey = (slug: string) => `dd.managedapps.image-notify.${slug}`

function readNotified(slug: string): boolean {
  try {
    return localStorage.getItem(notifyKey(slug)) === "1"
  } catch {
    return false
  }
}

interface ImageCardProps {
  image: CatalogImage
}

/**
 * A coming-soon service, rendered at full fidelity.
 *
 * Everything about the card is real — name, description, the specs it will
 * launch with — except the deploy button, which is honestly absent. "Notify me"
 * is the demand signal: it is remembered locally and the click is visible in
 * screen analytics, which is all the measurement launching needs. No email is
 * promised because none is sent.
 */
export function ImageCard({ image }: Readonly<ImageCardProps>) {
  const { t } = useTranslation()
  const [notified, setNotified] = useState(() => readNotified(image.slug))

  const notify = () => {
    try {
      localStorage.setItem(notifyKey(image.slug), "1")
    } catch {
      // Storage being unavailable only loses the memory of the click.
    }
    setNotified(true)
  }

  return (
    <div className="glass-1 flex flex-col gap-4 rounded-xl border border-border/60 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-status-warning/10 text-sm font-bold text-status-warning">
            {image.name.slice(0, 3)}
          </span>
          <div>
            <h3 className="text-sm font-semibold">{image.name}</h3>
            <p className="text-[12px] text-muted-foreground">{image.category}</p>
          </div>
        </div>
        <span className="rounded-full bg-status-warning/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-status-warning uppercase">
          {t("managedApps.imageCard.comingSoon")}
        </span>
      </div>

      <p className="text-[13px] text-muted-foreground">{image.description}</p>

      {image.specs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {image.specs.map((spec) => (
            <span
              key={spec}
              className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {spec}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={notified}
          onClick={notify}
        >
          {notified ? <Check className="size-3.5" /> : <Bell className="size-3.5" />}
          {notified ? "Noted" : "Notify me"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Deploy unlocks when {image.name} ships
        </span>
      </div>
    </div>
  )
}
