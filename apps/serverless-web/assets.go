package adminui

import "embed"

// Dist contains the built React admin dashboard served by the control plane.
//
// The all: prefix is what lets this compile before the bundle exists: without
// it, the patterns match nothing in an empty dist/ and the build fails with
// "no matching files found" rather than producing a binary whose console is
// simply not built yet.
//
//go:embed dist
var Dist embed.FS
