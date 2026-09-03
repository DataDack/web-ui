import { describe, expect, test } from "bun:test"

import {
  allEnvTargets,
  newEnvRow,
  storedEnvRows,
  toEnvValues,
} from "@/modules/managed-apps/components/env/EnvVarEditor/env-types"

// The per-row Production/Preview scope is gone from the WRITE path. It was
// never stored: the backend took a flat {name: value} map, so the scope a user
// picked was accepted by the form and discarded on save. The environment a
// variable belongs to is the scope now — a different set of variables, not a
// label on one — so the payload is flat and the row's `targets` survives only
// as display state on rows the server still describes that way.

describe("env row targets", () => {
  test("a new row applies to every deployment", () => {
    expect(newEnvRow("API_URL", "x").targets).toEqual(allEnvTargets())
  })

  test("a stored row keeps the scope the server reported", () => {
    const rows = storedEnvRows([
      { key: "TOKEN", targets: ["preview"] },
      { key: "API_URL", targets: ["production", "preview"] },
    ])
    expect(rows.map((row) => row.targets)).toEqual([["preview"], ["production", "preview"]])
    // Values are never known for a stored row — that is the whole point of the
    // state, and a row claiming to hold one would invite a save that blanks it.
    expect(rows.every((row) => row.value === "")).toBe(true)
  })

  test("a server row with no targets is read as every deployment", () => {
    expect(storedEnvRows([{ key: "OLD", targets: [] }])[0].targets).toEqual(allEnvTargets())
  })
})

describe("the payload sent to an environment", () => {
  // Flat, because that is what the backend has always accepted. The previous
  // {value, targets} shape was rejected by it — the write went through with the
  // scope thrown away, which is why this is the regression worth pinning.
  test("is a plain name-to-value map", () => {
    const rows = [newEnvRow("A", "1", ["production"]), newEnvRow("B", "2")]
    expect(toEnvValues(rows)).toEqual({ A: "1", B: "2" })
  })

  test("drops blank keys, and the last row wins a collision", () => {
    const rows = [newEnvRow("", "ignored"), newEnvRow("A", "first"), newEnvRow("A", "second")]
    expect(toEnvValues(rows)).toEqual({ A: "second" })
  })

  test("carries an empty value rather than omitting the key", () => {
    // An omitted key would read as "leave it alone", and the write replaces the
    // whole set — so a variable the user deliberately blanked has to be sent.
    expect(toEnvValues([newEnvRow("A", "")])).toEqual({ A: "" })
  })
})
