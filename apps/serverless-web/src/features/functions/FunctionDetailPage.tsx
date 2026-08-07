import { useNavigate, useParams, useSearchParams } from "react-router-dom"

import {
  FUNCTION_DETAIL_TABS,
  FunctionDetailPage as SharedFunctionDetailPage,
  registerMonacoSetup,
  type FunctionDetailTabValue,
} from "@datadack/serverless"

// Points the Code tab's editor at this app's bundled Monaco rather than the
// wrapper's CDN loader. A thunk, not a static import: this console has no
// route-level code splitting, so importing the setup module directly would put
// several megabytes of editor in the entry bundle for everyone. The package
// awaits this immediately before mounting the editor.
registerMonacoSetup(() => import("@/lib/monaco-setup"))

/**
 * A function's home, laid out like Lambda's — rendered by the shared
 * FunctionDetail suite, which fetches through the transport mounted in
 * main.tsx. This wrapper owns only what is app-specific: the route param, the
 * tab-in-URL convention, and where "back" and "deleted" navigate to. Labels
 * are the package's English defaults.
 */
export function FunctionDetailPage() {
  const { name = "" } = useParams()
  const navigate = useNavigate()

  // The active tab lives in the URL, so a specific tab is linkable and survives
  // a reload. "code" is the default and stays out of the query string.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get("tab") ?? "code"
  const activeTab: FunctionDetailTabValue = FUNCTION_DETAIL_TABS.some(
    (tab) => tab.value === requested,
  )
    ? (requested as FunctionDetailTabValue)
    : "code"

  return (
    <SharedFunctionDetailPage
      name={name}
      activeTab={activeTab}
      onTabChange={(next) => {
        setSearchParams(
          (prev) => {
            const params = new URLSearchParams(prev)
            if (next === "code") params.delete("tab")
            else params.set("tab", next)
            return params
          },
          { replace: true },
        )
      }}
      onBack={() => {
        void navigate("/functions")
      }}
      onDeleted={() => {
        void navigate("/functions")
      }}
    />
  )
}
