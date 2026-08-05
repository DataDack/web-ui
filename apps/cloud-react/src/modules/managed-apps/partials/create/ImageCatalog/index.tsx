import { useTranslation } from "react-i18next"

import { ImageCard } from "./ImageCard"
import { IMAGE_CATALOG } from "./images.catalog"
import { PlannedSlot } from "./PlannedSlot"

/**
 * Public Images — the catalog behind the second source card.
 *
 * One real entry (n8n, coming soon) and a visible roadmap. Nothing here
 * deploys yet, and nothing pretends to: the catalog exists now so the source
 * step is honest about where the product is going, and so interest can be
 * measured before the provisioner is built.
 */
export function ImageCatalog() {
  const { t } = useTranslation()
  const featured = IMAGE_CATALOG.filter((image) => image.availability === "coming_soon")
  const planned = IMAGE_CATALOG.filter((image) => image.availability === "planned")

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {/* No back control here: the composer header's own Back already returns
          to the fork from this phase, and two arrows pointing the same way one
          line apart read as two different destinations. */}
      <div>
        <h2 className="text-sm font-semibold">{t("managedApps.index.publicImages")}</h2>
        <p className="text-[12px] text-muted-foreground">
          {t("managedApps.index.readyMadeServicesWeRunForYouNoRepositoryNoBu")}
        </p>
      </div>

      <div className="space-y-4">
        {featured.map((image) => (
          <ImageCard key={image.slug} image={image} />
        ))}

        <div className="grid gap-3 sm:grid-cols-3">
          {planned.map((image) => (
            <PlannedSlot key={image.slug} image={image} />
          ))}
        </div>
      </div>
    </div>
  )
}
