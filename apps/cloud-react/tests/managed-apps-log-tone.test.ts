import { describe, expect, test } from "bun:test"

import {
  lineTone,
  splitStamp,
  stripAnsi,
} from "../src/modules/managed-apps/partials/project/BuildLogConsole/log-tone"

// Real sequences captured from vite/bun/npm build output — the exact bytes
// that used to render as "[36mvite v8.2.1 [32mbuilding…" garbage.
describe("stripAnsi", () => {
  test("removes SGR colour sequences", () => {
    expect(stripAnsi("\x1b[36mvite v8.2.1\x1b[39m \x1b[32mbuilding for production...\x1b[39m")).toBe(
      "vite v8.2.1 building for production...",
    )
  })

  test("removes erase-line and cursor sequences", () => {
    expect(stripAnsi("\x1b[2Ktransforming...\x1b[1G")).toBe("transforming...")
  })

  test("removes OSC hyperlinks and titles", () => {
    expect(stripAnsi("\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\")).toBe("link")
    expect(stripAnsi("\x1b]0;npm run build\x07done")).toBe("done")
  })

  test("leaves plain text alone", () => {
    expect(stripAnsi("added 71 packages, and audited 72 packages in 2s")).toBe(
      "added 71 packages, and audited 72 packages in 2s",
    )
  })
})

describe("splitStamp", () => {
  test("keeps the stamp while stripping colour from the content", () => {
    const line = "13:56:02 \x1b[32m✓\x1b[39m Compiled successfully"
    expect(splitStamp(line)).toEqual({ time: "13:56:02", text: "✓ Compiled successfully" })
  })

  test("keeps only a progress bar's final frame, stamp intact", () => {
    const line = "13:56:02 progress 10%\rprogress 50%\rprogress 100%"
    expect(splitStamp(line)).toEqual({ time: "13:56:02", text: "progress 100%" })
  })

  test("unstamped lines survive whole", () => {
    expect(splitStamp("plain output")).toEqual({ time: "", text: "plain output" })
  })
})

describe("lineTone", () => {
  test("a stripped error line still tones as danger", () => {
    expect(lineTone(splitStamp("\x1b[31merror: build failed\x1b[39m").text)).toBe("danger")
  })
})
