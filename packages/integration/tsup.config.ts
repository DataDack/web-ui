import path from "node:path"

import { defineConfig, type Options } from "tsup"

const options: Options = {
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // The host already installs the package's dependencies. Leaving every
  // node_modules import external prevents CommonJS compatibility shims such as
  // use-sync-external-store from being embedded in the ESM output and trying
  // to execute a dynamic require("react") in the browser.
  skipNodeModulesBundle: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react-router-dom",
    "@tanstack/react-query",
    "lucide-react",
    "react-icons",
    "react-icons/si",
    "react-icons/fa",
    // Primitives, transport and control-plane clients are SHARED with the
    // workflow studio, not copied. Bundling them here would give this package a
    // second copy of the module-level transport and base path, and the two
    // would drift the moment a host configured one of them.
    "@datadack/workflows",
    "@datadack/workflows/internal",
  ],
  esbuildOptions(options) {
    options.alias = { ...(options.alias ?? {}), "@": path.resolve(import.meta.dirname, "src") }
  },
}
export default defineConfig(options)
