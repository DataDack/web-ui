// Root entry so tools that run ESLint from the workspace root — lint-staged in
// the pre-commit hook above all — find a flat config. ESLint v9 resolves the
// config from the cwd, not from the linted file, so without this file any
// `eslint <path>` at the root fails before it looks at a single line.
//
// Workspaces still carry their own eslint.config.js for their `lint` target;
// this re-exports the same shared preset, so both entry points agree.
export { default } from "@serverless-ui/eslint-config/react"
