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
// runtime. That is wrong here twice over: the console must work behind a strict
// CSP and in air-gapped installs, and a CDN version would drift from the API
// this app's editor code is written against. `loader.config({ monaco })` hands
// it the copy Vite bundled instead, so nothing is fetched cross-origin.
//
// Import paths go through monaco-editor's `exports` map (0.56 publishes
// "./*" → "./esm/vs/*"), which is why they read `monaco-editor/editor/...`
// rather than the older `monaco-editor/esm/vs/editor/...` — the latter would
// resolve to esm/vs/esm/vs/... and fail.
//
// This module is imported from the serverless route chunk, never from main.tsx,
// so Monaco stays out of the entry bundle.

// Vite compiles each `?worker` import to its own chunk and returns a Worker
// constructor. Monaco asks for one by language label; anything it does not
// recognise gets the plain editor worker, which is what Monaco itself defaults
// to for languages with no dedicated service.
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
