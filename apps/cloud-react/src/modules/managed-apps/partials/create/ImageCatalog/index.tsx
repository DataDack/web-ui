import { Button } from "@datadack/common-ui"
import { ArrowLeft } from "lucide-react"

import { ImageCard } from "./ImageCard"
import { IMAGE_CATALOG } from "./images.catalog"
import { PlannedSlot } from "./PlannedSlot"

interface ImageCatalogProps {
  onBack: () => void
}

/**
 * Public Images — the catalog behind the second source card.
 *
 * One real entry (n8n, coming soon) and a visible roadmap. Nothing here
 * deploys yet, and nothing pretends to: the catalog exists now so the source
 * step is honest about where the product is going, and so interest can be
 * measured before the provisioner is built.
 */
export function ImageCatalog({ onBack }: Readonly<ImageCatalogProps>) {
  const featured = IMAGE_CATALOG.filter((image) => image.availability === "coming_soon")
  const planned = IMAGE_CATALOG.filter((image) => image.availability === "planned")

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="size-3.5" />
          Source
        </Button>
        <div>
          <h2 className="text-sm font-semibold">Public Images</h2>
          <p className="text-[12px] text-muted-foreground">
            Ready-made services we run for you — no repository, no build pipeline.
          </p>
        </div>
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
