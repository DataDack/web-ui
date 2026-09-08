import { defineConfig, type Options } from "tsup"

// The consumer supplies React, the router, the query client and the icon/table
// libraries so there is exactly one copy of each in an app. The reasoning is
// the same as @datadack/serverless's, and two of them are worth restating:
//
//   - @tanstack/react-query: the app owns the QueryClient. Bundling it here
//     would give this package its own, and these hooks would read a cache the
//     app never invalidates — so a mutation in the app would leave this
//     console's lists stale forever.
//   - react-router-dom: the pages render <Link> and read useParams. A second
//     copy sees no Router above it and throws at first render.
const options: Options = {
  entry: ["src/index.ts"],
  // @datadack/common-ui is private to this workspace, so a published dist that
  // merely referenced it would be uninstallable. It is a devDependency (tsup
  // externalises `dependencies`) and force-bundled here so the published
  // package stays self-contained.
  noExternal: [/^@datadack\/common-ui$/],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Required because of the noExternal above: without it, force-bundling
  // common-ui re-inlines common-ui's OWN CommonJS dependencies even though
  // common-ui correctly externalises them.
  skipNodeModulesBundle: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react-router-dom",
    "@tanstack/react-query",
    "@tanstack/react-table",
    "lucide-react",
    "zod",
  ],
}

export default defineConfig(options)
