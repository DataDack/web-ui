import { describe, expect, test } from "bun:test"

import {
  allEnvTargets,
  newEnvRow,
  storedEnvRows,
  toEnvMap,
} from "@/modules/managed-apps/components/env/EnvVarEditor/env-types"

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
    // The API normalises this too; a console that disagreed would show a scope
    // the next save would then change.
    expect(storedEnvRows([{ key: "OLD", targets: [] }])[0].targets).toEqual(allEnvTargets())
  })

  test("the payload carries value and targets per variable", () => {
    const rows = [newEnvRow("A", "1", ["production"]), newEnvRow("B", "2")]
    expect(toEnvMap(rows)).toEqual({
      A: { value: "1", targets: ["production"] },
      B: { value: "2", targets: allEnvTargets() },
    })
  })

  test("blank keys are dropped and the last row wins a collision", () => {
    const rows = [newEnvRow("", "ignored"), newEnvRow("A", "first"), newEnvRow("A", "second")]
    expect(toEnvMap(rows)).toEqual({ A: { value: "second", targets: allEnvTargets() } })
  })

  test("an empty scope is sent as every deployment, never as nothing", () => {
    // The API reads an empty list as "everywhere", so sending one would mean
    // the opposite of the row the user is looking at.
    expect(toEnvMap([newEnvRow("A", "1", [])])).toEqual({
      A: { value: "1", targets: allEnvTargets() },
    })
  })
})
