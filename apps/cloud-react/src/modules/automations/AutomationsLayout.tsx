import { Outlet } from "react-router-dom"

import { AutomationsDataProvider } from "./AutomationsDataProvider"

/**
 * The layout route every AI & Workflows page sits under.
 *
 * It exists so the section's transport provider is mounted by the ROUTER rather
 * than in main.tsx. That placement is the whole point: @datadack/ai-and-automations
 * carries a React Flow canvas, a drag-and-drop kit and a node registry — about a
 * megabyte of JavaScript — and a static import from main.tsx pulls all of it into
 * the console's entry chunk for every user, including the ones who never open
 * this section.
 *
 * Mounted here, the package is reached only through this route's lazy import, so
 * it lands in the section's own chunk and is fetched the first time someone
 * navigates to /automations.
 */
export function AutomationsLayout() {
  return (
    <AutomationsDataProvider>
      <Outlet />
    </AutomationsDataProvider>
  )
}
