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
    "tailwind-merge",
  ],
}

export default defineConfig(options)
