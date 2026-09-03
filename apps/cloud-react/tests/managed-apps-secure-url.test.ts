import { describe, expect, test } from "bun:test"

import {
  commitMessageExcerpt,
  secureURL,
} from "../src/modules/managed-apps/partials/project/build-format"

describe("commitMessageExcerpt", () => {
  test("shows no more than seven words and marks a shortened subject", () => {
    expect(
      commitMessageExcerpt("Merge pull request #1 from kepler-b/datadack setup branch now"),
    ).toBe("Merge pull request #1 from kepler-b/datadack setup…")
  })

  test("normalizes whitespace without adding an ellipsis to a short subject", () => {
    expect(commitMessageExcerpt("  Fix   deployment preview  ")).toBe("Fix deployment preview")
  })
})

// The bug this guards is silent by construction: a browser blocks an http://
// subresource on an https:// page without firing an error, so an http project
// URL made the deployment preview sit blank until it timed out and reported
// itself as "this site blocks embedding" — the wrong diagnosis entirely. The
// copy button failed more quietly still, handing out an address that 308s.
describe("secureURL", () => {
  const original = globalThis.window

  const withProtocol = (protocol: string, run: () => void) => {
    // @ts-expect-error — a stand-in for the two fields secureURL reads.
    globalThis.window = { location: { protocol } }
    try {
      run()
    } finally {
      globalThis.window = original
    }
  }

  test("upgrades http to https when the console is on https", () => {
    withProtocol("https:", () => {
      expect(secureURL("http://my-app.app.ap-south-3.datadack.cloud")).toBe(
        "https://my-app.app.ap-south-3.datadack.cloud",
      )
    })
  })

  test("leaves an https URL untouched", () => {
    withProtocol("https:", () => {
      expect(secureURL("https://my-app.datadack.cloud")).toBe("https://my-app.datadack.cloud")
    })
  })

  // A local console served over http has no mixed-content rule to satisfy, and
  // upgrading there would break a plain-HTTP dev deployment that genuinely has
  // no TLS.
  test("does not upgrade when the console itself is on http", () => {
    withProtocol("http:", () => {
      expect(secureURL("http://localhost:3000")).toBe("http://localhost:3000")
    })
  })

  test("passes through an empty URL and non-http schemes", () => {
    withProtocol("https:", () => {
      expect(secureURL("")).toBe("")
      // Only ever rewrites the scheme it knows how to upgrade.
      expect(secureURL("ftp://example.com")).toBe("ftp://example.com")
    })
  })

  // The substring replaced is anchored to the start, so an http:// appearing
  // later in the URL — a redirect target in a query string — is not touched.
  test("rewrites only the leading scheme", () => {
    withProtocol("https:", () => {
      expect(secureURL("http://app.test/?next=http://elsewhere.test")).toBe(
        "https://app.test/?next=http://elsewhere.test",
      )
    })
  })
})
