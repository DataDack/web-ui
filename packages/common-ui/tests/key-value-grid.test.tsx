import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "bun:test"

import { KeyValueGrid } from "../src/index"

// KeyValueGrid absorbed the console app's fork, which the apps are being pointed
// at. These tests pin the parts of that fork's behaviour a call site can see:
// the copy affordance, and the two-column default it rendered at.

afterEach(cleanup)

describe("KeyValueGrid", () => {
  test("renders a copy button for a copyable string value", () => {
    render(<KeyValueGrid items={[{ label: "User ID", value: "usr_123", copyable: true }]} />)

    expect(screen.getByRole("button", { name: /usr_123/ })).toBeInTheDocument()
  })

  test("ignores copyable when the value is not a string", () => {
    render(<KeyValueGrid items={[{ label: "Status", value: <em>active</em>, copyable: true }]} />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText("active")).toBeInTheDocument()
  })

  test("falls back to the em dash only when the value is nullish", () => {
    render(<KeyValueGrid items={[{ label: "Mobile", value: null }]} />)

    expect(screen.getByText("—")).toBeInTheDocument()
  })

  test("defaults to two columns", () => {
    const { container } = render(<KeyValueGrid items={[{ label: "A", value: "a" }]} />)
    const list = container.querySelector("dl")

    const explicit = render(
      <KeyValueGrid columns={2} items={[{ label: "A", value: "a" }]} />,
    ).container.querySelector("dl")

    expect(list?.className).toBe(explicit?.className ?? "")
  })

  test("forwards the caller's className", () => {
    const { container } = render(
      <KeyValueGrid className="caller-wins" items={[{ label: "A", value: "a" }]} />,
    )

    expect(container.querySelector("dl")?.className).toContain("caller-wins")
  })
})
