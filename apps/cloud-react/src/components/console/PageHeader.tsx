import type { ComponentProps, ReactNode } from "react"

import { Link } from "react-router-dom"

import { type Breadcrumb, PageHeader as KitPageHeader } from "@datadack/common-ui"

export type { Breadcrumb }

/** Turns a crumb into client-side navigation instead of a document load. */
const routerLink = (crumb: Breadcrumb, children: ReactNode) => (
  <Link to={crumb.to ?? ""}>{children}</Link>
)

/**
 * The console's PageHeader: the design system's, wired to this app's router.
 *
 * The kit cannot import react-router, and cannot take it through a context
 * either — @datadack/serverless bundles its own copy of the kit, so a provider
 * mounted through one instance is invisible to components resolved from the
 * other. It asks for a `renderLink` callback instead, and this is the one place
 * that answers it. Without this wrapper every one of the ~80 headers in this
 * console would have to pass the same callback itself.
 *
 * `iconPlacement` defaults to "crumb" rather than the kit's "tile": every header
 * here pairs an icon with a breadcrumb trail and expects the small leading
 * glyph, not the 36px tile the serverless console uses.
 */
export function PageHeader({
  renderLink = routerLink,
  iconPlacement = "crumb",
  ...props
}: Readonly<ComponentProps<typeof KitPageHeader>>) {
  return <KitPageHeader {...props} renderLink={renderLink} iconPlacement={iconPlacement} />
}
