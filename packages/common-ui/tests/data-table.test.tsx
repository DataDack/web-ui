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

  test("renders every row when pagination is off", () => {
    render(<DataTable data={many} columns={columns} />)
    expect(bodyRows()).toHaveLength(25)
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
