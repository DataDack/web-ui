// Package adminui embeds the built admin console so the control plane serves
// it without a separate deployment unit.
//
// The bundle is produced by the bun/Nx workspace rooted at serverless-ui/; see
// the Makefile's admin-ui-build target.
//
// dist/ is not committed - it is a build artifact, and committing a minified
// bundle made every UI change land as thousands of lines of unreviewable diff.
// Only the empty directory is tracked, because go:embed resolves at compile time
// and a missing directory is a build error. Build the bundle before building a
// release binary, or the binary serves a 404 at /admin.
package adminui

import "embed"

// Dist contains the built React admin dashboard served by the control plane.
//
// The all: prefix is what lets this compile before the bundle exists: without
// it, the patterns match nothing in an empty dist/ and the build fails with
// "no matching files found" rather than producing a binary whose console is
// simply not built yet.
//
//go:embed all:dist
var Dist embed.FS
