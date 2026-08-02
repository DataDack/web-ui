import type { ColumnDef } from "@tanstack/react-table"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, mock, test } from "bun:test"

import { DataTable } from "../src/console/DataTable"

// DataTable is the one table every list page is meant to route through, so its
// behaviour is worth pinning down properly rather than smoke-testing. Each block
// below covers one feature the pages used to hand-roll.

afterEach(cleanup)

interface Row {
  id: string
  name: string
  size: number
}

const rows: Row[] = [
  { id: "1", name: "charlie", size: 30 },
  { id: "2", name: "alpha", size: 10 },
  { id: "3", name: "bravo", size: 20 },
]

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "size", header: "Size" },
]

/** Body rows only — excludes the header row. */
function bodyRows() {
  const [, ...body] = screen.getAllByRole("row")
  return body
}

/** A single body row, failing loudly rather than yielding undefined. */
function bodyRow(index: number): HTMLElement {
  const row = bodyRows()[index]
  if (!row) throw new Error(`expected a row at index ${String(index)}`)
  return row
}

function cellText(rowIndex: number, colIndex: number) {
  const cells = within(bodyRow(rowIndex)).getAllByRole("cell")
  return cells[colIndex]?.textContent?.trim()
}

describe("rendering", () => {
  test("renders a header and one row per record", () => {
    render(<DataTable data={rows} columns={columns} />)

    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Size")).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(3)
  })

  test("forwards className onto the wrapper", () => {
    const { container } = render(
      <DataTable data={rows} columns={columns} className="probe-table" />,
    )
    expect(container.querySelector(".probe-table")).not.toBeNull()
  })

  test("renders custom cell content", () => {
    render(
      <DataTable
        data={rows}
        columns={[
          {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => <b>{row.original.name.toUpperCase()}</b>,
          },
        ]}
      />,
    )
    expect(screen.getByText("CHARLIE")).toBeInTheDocument()
  })
})

describe("loading, empty and no-results states", () => {
  test("loading keeps the header and swaps the body for skeleton rows", () => {
    render(<DataTable data={[]} columns={columns} loading skeletonRows={4} />)

    // The header stays put so the table does not jump when data lands.
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(4)
  })

  test("empty renders the empty state, not the no-results one", () => {
    render(<DataTable data={[]} columns={columns} empty="Nothing here yet" />)
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument()
  })

  test("a filter that excludes everything shows no-results instead of empty", async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        data={rows}
        columns={columns}
        searchable
        empty="Nothing here yet"
        noResults="No matches"
      />,
    )

    await user.type(screen.getByRole("searchbox"), "zzzz")

    expect(screen.getByText("No matches")).toBeInTheDocument()
    expect(screen.queryByText("Nothing here yet")).toBeNull()
  })

  test("without a noResults prop it uses the built-in one, not the empty state", async () => {
    const user = userEvent.setup()
    render(<DataTable data={rows} columns={columns} searchable empty="Nothing here yet" />)

    await user.type(screen.getByRole("searchbox"), "zzzz")

    // A filter that matches nothing is not the same situation as having no data,
    // so the caller's `empty` copy would be misleading here.
    expect(screen.getByText("No matching rows")).toBeInTheDocument()
    expect(screen.queryByText("Nothing here yet")).toBeNull()
  })
})

describe("sorting", () => {
  test("clicking a header sorts ascending, then descending", async () => {
    const user = userEvent.setup()
    render(<DataTable data={rows} columns={columns} />)

    expect(cellText(0, 0)).toBe("charlie")

    await user.click(screen.getByText("Name"))
    expect(cellText(0, 0)).toBe("alpha")

    await user.click(screen.getByText("Name"))
    expect(cellText(0, 0)).toBe("charlie")
  })

  test("defaultSorting applies on first render", () => {
    render(
      <DataTable data={rows} columns={columns} defaultSorting={[{ id: "name", desc: false }]} />,
    )
    expect(cellText(0, 0)).toBe("alpha")
  })

  test("reports sorting changes to the caller", async () => {
    const user = userEvent.setup()
    const onSortingChange = mock(() => {})
    render(<DataTable data={rows} columns={columns} onSortingChange={onSortingChange} />)

    await user.click(screen.getByText("Name"))
    expect(onSortingChange).toHaveBeenCalled()
  })

  test("sorted headers expose aria-sort for screen readers", async () => {
    const user = userEvent.setup()
    render(<DataTable data={rows} columns={columns} />)

    const header = screen.getByText("Name").closest("th")
    await user.click(screen.getByText("Name"))
    expect(header?.getAttribute("aria-sort")).toBe("ascending")
  })
})

describe("search", () => {
  test("filters across columns", async () => {
    const user = userEvent.setup()
    render(<DataTable data={rows} columns={columns} searchable />)

    await user.type(screen.getByRole("searchbox"), "alpha")
    expect(bodyRows()).toHaveLength(1)
    expect(cellText(0, 0)).toBe("alpha")
  })

  test("is absent unless asked for", () => {
    render(<DataTable data={rows} columns={columns} />)
    expect(screen.queryByRole("searchbox")).toBeNull()
  })

  test("a controlled globalFilter drives the rows and reports edits", async () => {
    const user = userEvent.setup()
    const onGlobalFilterChange = mock(() => {})
    render(
      <DataTable
        data={rows}
        columns={columns}
        searchable
        globalFilter="bravo"
        onGlobalFilterChange={onGlobalFilterChange}
      />,
    )

    expect(bodyRows()).toHaveLength(1)
    expect(cellText(0, 0)).toBe("bravo")

    await user.type(screen.getByRole("searchbox"), "x")
    expect(onGlobalFilterChange).toHaveBeenCalled()
  })
})

describe("selection", () => {
  test("adds a checkbox column and reports the selected rows", async () => {
    const user = userEvent.setup()
    const onSelectionChange = mock((_: Row[]) => {})
    render(
      <DataTable
        data={rows}
        columns={columns}
        selectable
        getRowId={(row) => row.id}
        onSelectionChange={onSelectionChange}
      />,
    )

    const boxes = screen.getAllByRole("checkbox")
    // One per row plus the header's select-all.
    expect(boxes).toHaveLength(4)

    await user.click(boxes[1]!)

    const last = onSelectionChange.mock.calls.at(-1)?.[0]
    expect(last).toHaveLength(1)
    expect(last?.[0]?.name).toBe("charlie")
  })

  test("the header checkbox selects and clears every row", async () => {
    const user = userEvent.setup()
    const onSelectionChange = mock((_: Row[]) => {})
    render(
      <DataTable
        data={rows}
        columns={columns}
        selectable
        getRowId={(row) => row.id}
        onSelectionChange={onSelectionChange}
      />,
    )

    const selectAll = screen.getAllByRole("checkbox")[0]!

    await user.click(selectAll)
    expect(onSelectionChange.mock.calls.at(-1)?.[0]).toHaveLength(3)

    await user.click(selectAll)
    expect(onSelectionChange.mock.calls.at(-1)?.[0]).toHaveLength(0)
  })

  test("no checkbox column unless asked for", () => {
    render(<DataTable data={rows} columns={columns} />)
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0)
  })
})

describe("pagination", () => {
  const many: Row[] = Array.from({ length: 25 }, (_, i) => ({
    id: String(i),
    name: `row-${i}`,
    size: i,
  }))

  test("splits rows into pages and advances", async () => {
    const user = userEvent.setup()
    render(<DataTable data={many} columns={columns} pagination={{ pageSize: 10 }} />)

    expect(bodyRows()).toHaveLength(10)
    expect(cellText(0, 0)).toBe("row-0")

    await user.click(screen.getByRole("button", { name: /next/i }))
    expect(cellText(0, 0)).toBe("row-10")
  })

  test("renders every row when pagination is explicitly off", () => {
    render(<DataTable data={many} columns={columns} pagination={false} />)
    expect(bodyRows()).toHaveLength(25)
  })

  test("pages by default, because that is right for nearly every list", () => {
    render(<DataTable data={many} columns={columns} />)
    // 25 rows at the default page size of 25 still fits one page…
    expect(bodyRows()).toHaveLength(25)
    expect(screen.queryByRole("button", { name: /next page/i })).toBeNull()
  })

  test("the default page size is 25", () => {
    const fifty: Row[] = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      name: `row-${i}`,
      size: i,
    }))
    render(<DataTable data={fifty} columns={columns} />)
    expect(bodyRows()).toHaveLength(25)
    expect(screen.getByRole("button", { name: /next page/i })).toBeEnabled()
  })

  test("the footer hides when everything fits on one page", () => {
    // A three-row table showing pager controls is noise.
    render(<DataTable data={rows} columns={columns} />)
    expect(screen.queryByRole("button", { name: /next page/i })).toBeNull()
  })
})

describe("expandable rows", () => {
  test("a chevron reveals the sub-row panel", async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        data={rows}
        columns={columns}
        renderSubRow={(row) => <div>detail for {row.name}</div>}
      />,
    )

    expect(screen.queryByText(/detail for charlie/)).toBeNull()

    await user.click(within(bodyRow(0)).getAllByRole("button")[0]!)

    expect(screen.getByText(/detail for charlie/)).toBeInTheDocument()
  })

  test("rowCanExpand gates which rows get a chevron", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        renderSubRow={(row) => <div>detail for {row.name}</div>}
        rowCanExpand={(row) => row.name === "charlie"}
      />,
    )

    expect(within(bodyRow(0)).queryAllByRole("button")).toHaveLength(1)
    expect(within(bodyRow(1)).queryAllByRole("button")).toHaveLength(0)
  })
})

describe("row interaction", () => {
  test("onRowClick receives the original record", async () => {
    const user = userEvent.setup()
    const onRowClick = mock((_: Row) => {})
    render(<DataTable data={rows} columns={columns} onRowClick={onRowClick} />)

    await user.click(bodyRow(1))
    expect(onRowClick).toHaveBeenCalledTimes(1)
    expect(onRowClick.mock.calls[0]?.[0].name).toBe("alpha")
  })
})

describe("toolbar", () => {
  test("renders caller-supplied actions", () => {
    render(<DataTable data={rows} columns={columns} actions={<button>Bulk delete</button>} />)
    expect(screen.getByRole("button", { name: "Bulk delete" })).toBeInTheDocument()
  })

  test("the column toolbar can hide a column", async () => {
    const user = userEvent.setup()
    render(<DataTable data={rows} columns={columns} columnToolbar />)

    await user.click(screen.getByRole("button", { name: /column/i }))
    await user.click(await screen.findByRole("menuitemcheckbox", { name: /size/i }))

    expect(screen.queryByText("Size")).toBeNull()
    expect(screen.getByText("Name")).toBeInTheDocument()
  })
})

describe("error state", () => {
  test("replaces the body with the failure message", () => {
    render(<DataTable data={rows} columns={columns} error="Could not load images" />)

    expect(screen.getByText("Could not load images")).toBeInTheDocument()
    // The rows must go — showing stale data under an error message implies the
    // data is current.
    expect(screen.queryByText("charlie")).toBeNull()
  })

  test("takes precedence over the empty state", () => {
    // Reporting "nothing here yet" for a failed fetch tells the user their
    // account is empty when nothing at all is known about it.
    render(<DataTable data={[]} columns={columns} error="Request failed" empty="No images yet" />)

    expect(screen.getByText("Request failed")).toBeInTheDocument()
    expect(screen.queryByText("No images yet")).toBeNull()
  })

  test("loading wins over error, so a retry does not flash the old failure", () => {
    render(<DataTable data={[]} columns={columns} error="Request failed" loading />)
    expect(screen.queryByText("Request failed")).toBeNull()
  })

  test("offers a retry button only when a handler is given", async () => {
    const user = userEvent.setup()
    const onRetry = mock(() => {})
    const { rerender } = render(<DataTable data={[]} columns={columns} error="Failed" />)
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull()

    rerender(<DataTable data={[]} columns={columns} error="Failed" onRetry={onRetry} />)
    await user.click(screen.getByRole("button", { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test("hides the pager while erroring", () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        error="Failed"
        pagination={{ page: 1, pageSize: 10, total: 100, onPageChange: () => undefined }}
      />,
    )
    expect(screen.queryByRole("button", { name: /next page/i })).toBeNull()
  })
})

describe("toolbar slots", () => {
  test("renders a left-hand toolbar alongside the search box", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        searchable
        toolbar={<button>Filter</button>}
        actions={<button>Create</button>}
      />,
    )

    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox")).toBeInTheDocument()
  })

  test("a toolbar alone is enough to render the bar", () => {
    render(<DataTable data={rows} columns={columns} toolbar={<button>Filter</button>} />)
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument()
  })
})

describe("bulk actions", () => {
  function setup(onAction = mock(() => {})) {
    const user = userEvent.setup()
    render(
      <DataTable
        data={rows}
        columns={columns}
        selectable
        getRowId={(row) => row.id}
        bulkActions={(selected) => [
          { label: `Delete ${String(selected.length)}`, destructive: true, onAction },
        ]}
      />,
    )
    return { user, onAction }
  }

  test("the bar is hidden until something is selected", () => {
    setup()
    expect(screen.queryByText(/selected/i)).toBeNull()
  })

  test("selecting a row reveals the bar with a live count", async () => {
    const { user } = setup()
    await user.click(screen.getAllByRole("checkbox")[1]!)

    expect(screen.getByText("1 selected")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete 1" })).toBeInTheDocument()
  })

  test("the action receives the current selection", async () => {
    const { user, onAction } = setup()
    await user.click(screen.getAllByRole("checkbox")[0]!)

    expect(screen.getByRole("button", { name: "Delete 3" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Delete 3" }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  test("clearing the selection dismisses the bar", async () => {
    const { user } = setup()
    await user.click(screen.getAllByRole("checkbox")[1]!)
    await user.click(screen.getByRole("button", { name: /clear selection/i }))

    expect(screen.queryByText(/selected/i)).toBeNull()
  })
})

describe("server-side pagination", () => {
  const serverRows = rows
  const paged = (over: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) => ({
    data: serverRows,
    columns,
    ...over,
  })

  test("renders the given rows without slicing them again", () => {
    render(
      <DataTable
        {...paged()}
        pagination={{ page: 2, pageSize: 3, total: 30, onPageChange: () => undefined }}
      />,
    )
    // All three supplied rows show: the server already did the paging.
    expect(bodyRows()).toHaveLength(3)
  })

  test("reports the requested page rather than paging locally", async () => {
    const user = userEvent.setup()
    const onPageChange = mock((_: number) => {})
    render(
      <DataTable
        {...paged()}
        pagination={{ page: 2, pageSize: 3, total: 30, onPageChange }}
      />,
    )

    await user.click(screen.getByRole("button", { name: /next page/i }))
    expect(onPageChange).toHaveBeenLastCalledWith(3)

    await user.click(screen.getByRole("button", { name: /previous page/i }))
    expect(onPageChange).toHaveBeenLastCalledWith(1)

    await user.click(screen.getByRole("button", { name: /last page/i }))
    expect(onPageChange).toHaveBeenLastCalledWith(10)
  })

  test("shows the range across all pages, not just the loaded rows", () => {
    render(
      <DataTable
        {...paged()}
        pagination={{ page: 2, pageSize: 3, total: 30, onPageChange: () => undefined }}
      />,
    )
    expect(screen.getByText(/4–6 of 30/)).toBeInTheDocument()
  })

  test("clamps the range on a short final page", () => {
    render(
      <DataTable
        {...paged()}
        pagination={{ page: 4, pageSize: 3, total: 11, onPageChange: () => undefined }}
      />,
    )
    expect(screen.getByText(/10–11 of 11/)).toBeInTheDocument()
  })

  test("disables the edges at the first and last page", () => {
    const { unmount } = render(
      <DataTable
        {...paged()}
        pagination={{ page: 1, pageSize: 3, total: 30, onPageChange: () => undefined }}
      />,
    )
    expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /next page/i })).toBeEnabled()
    unmount()

    render(
      <DataTable
        {...paged()}
        pagination={{ page: 10, pageSize: 3, total: 30, onPageChange: () => undefined }}
      />,
    )
    expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled()
  })

  test("hides the pager when everything fits on one page", () => {
    render(
      <DataTable
        {...paged()}
        pagination={{ page: 1, pageSize: 25, total: 3, onPageChange: () => undefined }}
      />,
    )
    expect(screen.queryByRole("button", { name: /next page/i })).toBeNull()
  })

  test("offers no page-size selector — the server owns the page size", () => {
    render(
      <DataTable
        {...paged()}
        pagination={{ page: 1, pageSize: 3, total: 30, onPageChange: () => undefined }}
      />,
    )
    expect(screen.queryByRole("combobox")).toBeNull()
  })
})

describe("column meta", () => {
  /** Every emitted rule for every generated class on an element, concatenated. */
  function rulesFor(el: Element | null | undefined) {
    const classes = (el?.getAttribute("class") ?? "").split(" ").filter((c) => c.startsWith("ddui-"))
    const all = Array.from(document.head.querySelectorAll("style[data-emotion]")).map(
      (t) => t.textContent ?? "",
    )
    return all.filter((text) => classes.some((c) => text.includes(`.${c}{`))).join("")
  }

  test("a responsive column is hidden by default and shown at its breakpoint", () => {
    render(
      <DataTable
        data={rows}
        columns={[
          { accessorKey: "name", header: "Name" },
          { accessorKey: "size", header: "Size", meta: { responsive: "md" } },
        ]}
      />,
    )

    const rule = rulesFor(screen.getByText("Size").closest("th"))

    // Hidden below the breakpoint, restored at it — so a narrow screen drops the
    // column instead of squeezing every other one.
    expect(rule).toContain("display:none")
    expect(rule).toContain("@media (min-width: 768px)")
    expect(rule).toContain("display:table-cell")
  })

  test("each breakpoint maps to its own min-width", () => {
    const widths = { md: "768px", lg: "1024px", xl: "1280px" } as const

    for (const [bp, width] of Object.entries(widths)) {
      const { unmount } = render(
        <DataTable
          data={rows}
          columns={[
            { accessorKey: "name", header: "Name" },
            {
              accessorKey: "size",
              header: `Size-${bp}`,
              meta: { responsive: bp as "md" | "lg" | "xl" },
            },
          ]}
        />,
      )
      const rule = rulesFor(screen.getByText(`Size-${bp}`).closest("th"))
      expect(rule).toContain(`@media (min-width: ${width})`)
      unmount()
    }
  })

  test("a plain column carries no responsive rule", () => {
    render(<DataTable data={rows} columns={columns} />)
    // Nothing hides it, so no display:none rule reaches the header cell.
    expect(rulesFor(screen.getByText("Size").closest("th"))).not.toContain("display:none")
  })

  test("clicks inside an interactive cell do not trigger onRowClick", async () => {
    const user = userEvent.setup()
    const onRowClick = mock((_: Row) => {})
    const onButton = mock(() => {})

    render(
      <DataTable
        data={rows}
        columns={[
          { accessorKey: "name", header: "Name" },
          {
            id: "actions",
            header: "",
            meta: { interactive: true },
            cell: () => <button onClick={onButton}>Menu</button>,
          },
        ]}
        onRowClick={onRowClick}
      />,
    )

    // The control still works…
    await user.click(screen.getAllByRole("button", { name: "Menu" })[0]!)
    expect(onButton).toHaveBeenCalledTimes(1)
    // …but the row must not also navigate.
    expect(onRowClick).not.toHaveBeenCalled()
  })

  test("clicks outside an interactive cell still trigger onRowClick", async () => {
    const user = userEvent.setup()
    const onRowClick = mock((_: Row) => {})

    render(
      <DataTable
        data={rows}
        columns={[
          { accessorKey: "name", header: "Name" },
          { id: "actions", header: "", meta: { interactive: true }, cell: () => <button>M</button> },
        ]}
        onRowClick={onRowClick}
      />,
    )

    await user.click(screen.getByText("charlie"))
    expect(onRowClick).toHaveBeenCalledTimes(1)
  })
})

describe("row entrance", () => {
  function rowStyles() {
    return bodyRows().map((row) => row.getAttribute("style") ?? "")
  }

  test("rows fade in with a staggered delay by default", () => {
    render(<DataTable data={rows} columns={columns} />)

    // This is how every console list has always appeared; the table it replaced
    // staggered rows the same way, so losing it is a visible regression.
    const styles = rowStyles()
    expect(styles[0]).toContain("animation-delay: 0ms")
    expect(styles[1]).toContain("animation-delay: 30ms")
    expect(styles[2]).toContain("animation-delay: 60ms")
  })

  test("the stagger is capped so long pages do not animate for seconds", () => {
    const many: Row[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `row-${i}`,
      size: i,
    }))
    render(<DataTable data={many} columns={columns} />)

    const styles = rowStyles()
    // Capped at 8 × 30ms; every later row shares that delay.
    expect(styles[8]).toContain("animation-delay: 240ms")
    expect(styles[19]).toContain("animation-delay: 240ms")
  })

  test("rows carry the entrance animation class", () => {
    render(<DataTable data={rows} columns={columns} />)
    const cls = bodyRows()[0]?.getAttribute("class") ?? ""
    const rule = Array.from(document.head.querySelectorAll("style[data-emotion]"))
      .map((t) => t.textContent ?? "")
      .filter((text) => cls.split(" ").some((c) => c.startsWith("ddui-") && text.includes(`.${c}{`)))
      .join("")
    expect(rule).toContain("animation")
  })

  test("animateRows={false} drops both the class and the delay", () => {
    render(<DataTable data={rows} columns={columns} animateRows={false} />)
    for (const style of rowStyles()) expect(style).not.toContain("animation-delay")
  })
})

describe("rowClassName", () => {
  test("a string is applied to every body row", () => {
    render(<DataTable data={rows} columns={columns} rowClassName="group/row" />)
    for (const row of bodyRows()) expect(row.className).toContain("group/row")
  })

  test("a function is called per row and may return nothing", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        rowClassName={(row) => (row.name === "alpha" ? "is-alpha" : undefined)}
      />,
    )
    const marked = bodyRows().filter((row) => row.className.includes("is-alpha"))
    expect(marked).toHaveLength(1)
  })

  test("it does not displace the row's own generated classes", () => {
    render(<DataTable data={rows} columns={columns} onRowClick={() => undefined} rowClassName="x" />)
    const cls = bodyRows()[0]?.className ?? ""
    // The entrance animation and the pointer cursor must survive the merge.
    expect(cls).toContain("x")
    expect(cls).toMatch(/ddui-\w+/)
  })
})

describe("footerRow", () => {
  test("renders inside the table body after the data rows", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        footerRow={
          <tr data-testid="add-row">
            <td>add</td>
          </tr>
        }
      />,
    )

    const all = screen.getAllByRole("row")
    // Header + 3 data rows + the footer row, in that order.
    expect(all).toHaveLength(5)
    expect(all.at(-1)).toHaveAttribute("data-testid", "add-row")
  })

  test("stays visible when there are no rows at all", () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        empty="Nothing yet"
        footerRow={
          <tr data-testid="add-row">
            <td>add</td>
          </tr>
        }
      />,
    )
    // Otherwise the only way to add the first entry vanishes exactly when it is
    // needed most.
    expect(screen.getByTestId("add-row")).toBeInTheDocument()
    expect(screen.getByText("Nothing yet")).toBeInTheDocument()
  })

  test("stays visible while loading", () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        loading
        footerRow={
          <tr data-testid="add-row">
            <td>add</td>
          </tr>
        }
      />,
    )
    expect(screen.getByTestId("add-row")).toBeInTheDocument()
  })
})

describe("frame", () => {
  function containerOf() {
    return document.querySelector('[data-slot="table-container"]')
  }

  test("the table draws its own border by default", () => {
    render(<DataTable data={rows} columns={columns} />)
    const cls = containerOf()?.getAttribute("class") ?? ""
    const rule = Array.from(document.head.querySelectorAll("style[data-emotion]"))
      .map((t) => t.textContent ?? "")
      .filter((text) => cls.split(" ").some((c) => c.startsWith("ddui-") && text.includes(`.${c}{`)))
      .join("")

    // Pages used to hand-wrap every table in `glass-1 overflow-hidden`; the
    // frame belongs to the component so the two consoles cannot drift.
    expect(rule).toContain("border")
    expect(rule).toContain("border-radius")
  })

  test("bordered={false} leaves the frame off", () => {
    render(<DataTable data={rows} columns={columns} bordered={false} />)
    const cls = containerOf()?.getAttribute("class") ?? ""
    const rule = Array.from(document.head.querySelectorAll("style[data-emotion]"))
      .map((t) => t.textContent ?? "")
      .filter((text) => cls.split(" ").some((c) => c.startsWith("ddui-") && text.includes(`.${c}{`)))
      .join("")
    expect(rule).not.toContain("border-radius")
  })

  test("the frame sits on the scroll container, not the table element", () => {
    // A border on <table> would be clipped by the container's own overflow.
    render(<DataTable data={rows} columns={columns} />)
    const table = document.querySelector('[data-slot="table"]')
    expect(containerOf()).not.toBeNull()
    expect(containerOf()).not.toBe(table)
  })
})

describe("refresh", () => {
  test("no refresh button unless a handler is given", () => {
    render(<DataTable data={rows} columns={columns} />)
    expect(screen.queryByRole("button", { name: /refresh/i })).toBeNull()
  })

  test("a handler adds the button and invokes it", async () => {
    const user = userEvent.setup()
    const onRefresh = mock(() => {})
    render(<DataTable data={rows} columns={columns} onRefresh={onRefresh} />)

    await user.click(screen.getByRole("button", { name: /refresh/i }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  test("refreshing disables the button so a refetch cannot be double-fired", async () => {
    const user = userEvent.setup()
    const onRefresh = mock(() => {})
    render(<DataTable data={rows} columns={columns} onRefresh={onRefresh} refreshing />)

    const button = screen.getByRole("button", { name: /refresh/i })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  test("the label is a prop so a translated app can pass its own", () => {
    render(
      <DataTable data={rows} columns={columns} onRefresh={() => undefined} refreshLabel="Actualiser" />,
    )
    expect(screen.getByRole("button", { name: "Actualiser" })).toBeInTheDocument()
  })

  test("the button appears even with nothing else in the toolbar", () => {
    render(<DataTable data={rows} columns={columns} onRefresh={() => undefined} />)
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument()
  })
})

describe("renderRow", () => {
  test("replaces a row when it returns a node", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        renderRow={(row) =>
          row.name === "alpha" ? (
            <tr data-testid="editing">
              <td>editing alpha</td>
            </tr>
          ) : null
        }
      />,
    )

    // The replaced row is gone and the editor stands in its place.
    expect(screen.getByTestId("editing")).toBeInTheDocument()
    expect(screen.queryByText("alpha")).toBeNull()
    // The other rows are untouched.
    expect(screen.getByText("charlie")).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(3)
  })

  test("returning null everywhere leaves the table alone", () => {
    render(<DataTable data={rows} columns={columns} renderRow={() => null} />)
    expect(bodyRows()).toHaveLength(3)
    expect(screen.getByText("alpha")).toBeInTheDocument()
  })

  test("a replaced row does not fire onRowClick", async () => {
    const user = userEvent.setup()
    const onRowClick = mock((_: Row) => {})
    render(
      <DataTable
        data={rows}
        columns={columns}
        onRowClick={onRowClick}
        renderRow={(row) =>
          row.name === "alpha" ? (
            <tr>
              <td>editing</td>
            </tr>
          ) : null
        }
      />,
    )

    // Clicking inside an inline editor must not navigate away from it.
    await user.click(screen.getByText("editing"))
    expect(onRowClick).not.toHaveBeenCalled()
  })
})
