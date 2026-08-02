import serverlessUi from "@serverless-ui/eslint-config/react"
import { defineConfig, globalIgnores } from "eslint/config"

// The workspace's shared flat config, plus the relaxations a test suite needs.
// Without a config of its own the package fell through to the root one, which
// is written for production source and flags ordinary test idioms as errors.
export default defineConfig([
  globalIgnores(["dist", "node_modules", "coverage"]),

  ...serverlessUi,

  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      // `mock(() => {})` is the standard way to spell a spy with no behaviour.
      "@typescript-eslint/no-empty-function": "off",

      // Tests assert on values the types say cannot be null; a non-null
      // assertion documents that better than an `if` that can never run.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",

      // Matchers are passed as values (`expect(el.scrollIntoView)`), which the
      // unbound-method rule cannot distinguish from an accidental detach.
      "@typescript-eslint/unbound-method": "off",

      // Specimen tables and describe blocks nest helpers by design.
      "sonarjs/no-nested-functions": "off",
      "sonarjs/function-return-type": "off",
      "sonarjs/no-alphabetical-sort": "off",

      // A test file exports fixtures alongside its cases; there is no fast
      // refresh boundary to protect here.
      "react-refresh/only-export-components": "off",
    },
  },
])
