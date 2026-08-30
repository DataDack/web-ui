import { defineConfig, type Options } from "tsup"

// The consumer supplies React and the icon/table libraries so there is
// exactly one copy of each in an app. @emotion/css / radix-ui / clsx /
// tailwind-merge are regular dependencies and stay external too — npm
// resolves them. Keeping @emotion/css external matters doubly: bundling it
// would give this package a private style cache, and styles injected there
// could not be composed (cx-merged) with the consumer's own emotion styles.
//
// The explicit Options annotation keeps the default export's declared type
// nameable from this file's own imports — without it, tsserver sessions that
// open this file through a consumer's node_modules symlink try to reference
// tsup's nested install path and report TS2883 ("likely not portable").
const options: Options = {
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Every node_modules import stays external, the same way @datadack/workflows
  // and @datadack/integration do it. The list below still records WHY specific
  // packages must not be bundled, but it must not be the only thing standing
  // between a new dependency and a broken app: a CommonJS dependency that nobody
  // remembers to add lands in the ESM output with esbuild's `__require` shim and
  // takes the app down on load, with nothing failing at build time.
  skipNodeModulesBundle: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "lucide-react",
    "react-icons",
    "react-icons/si",
    "@tanstack/react-table",
    "radix-ui",
    "@emotion/css",
    "clsx",
    "cmdk",
    "react-day-picker",
    "react-hook-form",
    // CJS-only, with no "module" or "exports" entry. Bundling it inlines its
    // `require("react")` into an ESM output, and because react is external here
    // esbuild cannot resolve that statically — it emits a dynamic-require shim
    // that throws "Dynamic require of \"react\" is not supported" the moment the
    // chunk is evaluated in the browser.
    //
    // External instead, so the consuming app's bundler resolves it. Vite handles
    // the CJS→ESM interop properly; tsup, inlining into ESM, cannot.
    "react-simple-code-editor",
    "tailwind-merge",
  ],
}

export default defineConfig(options)
