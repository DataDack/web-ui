// @datadack/serverless-ui — the serverless-FaaS layer of the DataDack UI.
//
// Only pieces that know about functions and runtimes belong here. Everything
// generic — primitives, list/detail building blocks, charts, theme, the
// status→tone language — lives in @datadack/common-ui, which this package builds
// on and re-exports below.
//
// Styling is @emotion/css at runtime, inherited from common-ui: importing either
// kit is the whole setup, with no Tailwind build and no `@source` scan.

// FaaS-specific
export {
  CodeEditorPlaceholder,
  type CodeEditorPlaceholderProps,
} from "./console/CodeEditorPlaceholder"
export {
  RuntimeCatalog,
  type RuntimeCatalogProps,
  type RuntimeInfo,
} from "./console/RuntimeCatalog"
export { familyLabel, RuntimeIcon } from "./console/RuntimeIcon"

// Re-exported so this package's published surface is unchanged for the repos
// that already install it. New code should import these from
// @datadack/common-ui directly; they are re-exported here for compatibility,
// not because they are FaaS-specific.
export * from "@datadack/common-ui"
