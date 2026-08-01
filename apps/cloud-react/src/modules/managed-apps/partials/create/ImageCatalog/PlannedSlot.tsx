import type { CatalogImage } from "./images.catalog"

interface PlannedSlotProps {
	image: CatalogImage
}

/**
 * A service that is on the roadmap but not specced.
 *
 * Dimmed and dash-bordered on purpose: the emptiness says "this shelf will
 * fill" without pretending any of it is closer than it is.
 */
export function PlannedSlot({ image }: Readonly<PlannedSlotProps>) {
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/60 p-5 opacity-60">
			<span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-[11px] font-bold text-muted-foreground">
				{image.name.slice(0, 2)}
			</span>
			<div>
				<h3 className="text-[13px] font-semibold">{image.name}</h3>
				<p className="text-[11px] text-muted-foreground">{image.category}</p>
			</div>
			<span className="w-fit rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
				Planned
			</span>
		</div>
	)
}
