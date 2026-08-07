import { loader } from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import CssWorker from "monaco-editor/language/css/css.worker?worker"
import HtmlWorker from "monaco-editor/language/html/html.worker?worker"
import JsonWorker from "monaco-editor/language/json/json.worker?worker"
import TsWorker from "monaco-editor/language/typescript/ts.worker?worker"
import EditorWorker from "monaco-editor/editor/editor.worker?worker"

// Monaco, bundled by this app rather than fetched from a CDN.
//
// @monaco-editor/react's default loader pulls the whole editor off jsdelivr at
// runtime, which this console cannot rely on: its bundle is embedded in the
// control-plane binary and served from installs with no outbound internet at
// all. `loader.config({ monaco })` hands the wrapper the copy Vite bundled.
//
// Vite's `base: "/admin/"` (vite.config.ts) prefixes the emitted worker URLs
// too, so the workers load from /admin/assets/… exactly like every other chunk.
//
// Import paths go through monaco-editor's `exports` map (0.56 publishes
// "./*" → "./esm/vs/*"), which is why they read `monaco-editor/editor/...`
// rather than the older `monaco-editor/esm/vs/editor/...` — the latter would
// resolve to esm/vs/esm/vs/... and fail.
//
// Imported from the function detail route, never from main.tsx, so Monaco stays
// out of the entry bundle.

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case "json":
        return new JsonWorker()
      case "css":
      case "scss":
      case "less":
        return new CssWorker()
      case "html":
      case "handlebars":
      case "razor":
        return new HtmlWorker()
      case "typescript":
      case "javascript":
        return new TsWorker()
      default:
        return new EditorWorker()
    }
  },
}

loader.config({ monaco })
