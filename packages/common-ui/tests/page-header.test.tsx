import type { ReactNode } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "bun:test"
import { Boxes } from "lucide-react"

import { type Breadcrumb, PageHeader } from "../src/console/PageHeader"

// PageHeader absorbed the cloud console's fork: breadcrumbs, and an icon that
// can sit in the crumb row instead of the tile. These tests pin the two things
// that fork could rely on and this one cannot — that the router never enters
// through context, and that the tile stays the default so the consoles already
// rendering this component keep the header they have.

afterEach(cleanup)

const trail: Breadcrumb[] = [
  { label: "Compute", to: "/compute" },
  { label: "Instances", to: "/compute/instances" },
  { label: "web-01" },
]

describe("PageHeader breadcrumbs", () => {
  test("renders no nav when breadcrumbs are absent or empty", () => {
    render(<PageHeader title="Instances" />)
    expect(screen.queryByRole("navigation")).toBeNull()

    cleanup()
    render(<PageHeader title="Instances" breadcrumbs={[]} />)
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  test("links crumbs with a `to` and leaves the last one plain", () => {
    render(<PageHeader title="web-01" breadcrumbs={trail} />)

    expect(screen.getByRole("link", { name: "Compute" })).toHaveAttribute("href", "/compute")
    expect(screen.getByRole("link", { name: "Instances" })).toHaveAttribute(
      "href",
      "/compute/instances",
    )
    expect(screen.queryByRole("link", { name: "web-01" })).toBeNull()
    expect(screen.getByRole("navigation")).toHaveTextContent("web-01")
  })

  test("renderLink takes over every linked crumb, and only those", () => {
    const seen: string[] = []
    const renderLink = (crumb: Breadcrumb, children: ReactNode) => {
      seen.push(crumb.label)
      return <button data-to={crumb.to}>{children}</button>
    }

    render(<PageHeader title="web-01" breadcrumbs={trail} renderLink={renderLink} />)

    expect(seen).toEqual(["Compute", "Instances"])
    expect(screen.getByRole("button", { name: "Compute" })).toHaveAttribute("data-to", "/compute")
    expect(screen.queryByRole("link")).toBeNull()
  })
})

describe("PageHeader iconPlacement", () => {
  test("defaults to the tile, breadcrumbs or not", () => {
    const { container } = render(<PageHeader title="Instances" icon={Boxes} breadcrumbs={trail} />)

    // The tile is the icon's wrapper; in crumb placement the icon has none.
    const svg = container.querySelector<SVGElement>("svg.lucide-boxes")
    expect(svg?.parentElement?.tagName).toBe("DIV")
    expect(screen.getByRole("navigation")).not.toContainElement(svg)
  })

  test("crumb placement moves the icon into the nav", () => {
    const { container } = render(
      <PageHeader title="web-01" icon={Boxes} breadcrumbs={trail} iconPlacement="crumb" />,
    )

    const svg = container.querySelector<SVGElement>("svg.lucide-boxes")
    expect(screen.getByRole("navigation")).toContainElement(svg)
  })

  test("crumb placement draws no icon at all without breadcrumbs", () => {
    const { container } = render(
      <PageHeader title="Instances" icon={Boxes} iconPlacement="crumb" />,
    )

    expect(container.querySelector("svg.lucide-boxes")).toBeNull()
  })
})

describe("PageHeader body", () => {
  test("still renders title, description, meta, actions and className", () => {
    const { container } = render(
      <PageHeader
        title="Instances"
        description="Every VM in this project."
        meta={<span>3 running</span>}
        actions={<button>Refresh</button>}
        className="custom"
      />,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Instances" })).toBeInTheDocument()
    expect(screen.getByText("Every VM in this project.")).toBeInTheDocument()
    expect(screen.getByText("3 running")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("custom")
  })
})
