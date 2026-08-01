import { describe, expect, test } from "bun:test"

import { parseDotEnv } from "@/modules/managed-apps/components/env/EnvVarEditor/env-parse"

describe("parseDotEnv", () => {
	test("reads plain pairs and ignores blanks and comments", () => {
		const out = parseDotEnv(
			["# a comment", "", "API_URL=https://example.com", "PORT=3000"].join("\n")
		)
		expect(out.entries).toEqual([
			{ key: "API_URL", value: "https://example.com" },
			{ key: "PORT", value: "3000" },
		])
		expect(out.skipped).toEqual([])
	})

	test("a blank line is not a skipped line", () => {
		// Reporting blanks as skips would tell the user 40 lines failed when
		// nothing did.
		expect(parseDotEnv("\n\n\nA=1\n\n").skipped).toEqual([])
	})

	test("keeps '=' inside values", () => {
		expect(parseDotEnv("TOKEN=abc=def==").entries[0]).toEqual({
			key: "TOKEN",
			value: "abc=def==",
		})
	})

	test("honours quotes and escapes inside double quotes only", () => {
		const out = parseDotEnv(['KEY="line\\nbreak"', "RAW='line\\nbreak'"].join("\n"))
		expect(out.entries[0]?.value).toBe("line\nbreak")
		expect(out.entries[1]?.value).toBe("line\\nbreak")
	})

	test("preserves spaces inside quoted values", () => {
		expect(parseDotEnv('GREETING="hello world"').entries[0]?.value).toBe("hello world")
	})

	test("strips a trailing comment but not a '#' inside a value", () => {
		const out = parseDotEnv(["A=value # trailing", "B=pass#word"].join("\n"))
		expect(out.entries[0]?.value).toBe("value")
		expect(out.entries[1]?.value).toBe("pass#word")
	})

	test("tolerates a leading export", () => {
		expect(parseDotEnv("export NODE_ENV=production").entries[0]).toEqual({
			key: "NODE_ENV",
			value: "production",
		})
	})

	test("reports unparseable lines by 1-based number instead of dropping them", () => {
		const out = parseDotEnv(["GOOD=1", "this is not an env line", "9BAD=x"].join("\n"))
		expect(out.entries).toEqual([{ key: "GOOD", value: "1" }])
		expect(out.skipped).toEqual([2, 3])
	})

	test("collapses duplicates to the last value and names them", () => {
		const out = parseDotEnv(["A=first", "B=keep", "A=second"].join("\n"))
		expect(out.entries).toEqual([
			{ key: "A", value: "second" },
			{ key: "B", value: "keep" },
		])
		expect(out.duplicates).toEqual(["A"])
	})

	test("an empty value is a value, not a skip", () => {
		const out = parseDotEnv("EMPTY=")
		expect(out.entries).toEqual([{ key: "EMPTY", value: "" }])
		expect(out.skipped).toEqual([])
	})

	test("handles CRLF line endings", () => {
		expect(parseDotEnv("A=1\r\nB=2").entries).toHaveLength(2)
	})
})
