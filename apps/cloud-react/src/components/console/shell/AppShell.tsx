import { Suspense, useCallback, useEffect, useState } from "react"

import { useLocation, useMatches, useNavigate, useOutlet } from "react-router-dom"

import { useKeySequence } from "@/hooks/use-key-sequence"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"
import { MobileNumberPrompt } from "@/modules/auth/components/MobileNumberPrompt"
import { GlobalSearch } from "@/modules/search/partials/GlobalSearch"
import { useConsoleBroadcastSync } from "@/services/broadcast"

import { cn, Skeleton } from "@datadack/common-ui"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { MotionProvider } from "../motion/MotionProvider"
import {
  ChakraWatermark,
  FreedomSaleBanner,
  IndependenceGreeting,
  useFreedomSale,
  useIndependenceGreeting,
} from "../seasonal"

const SIDEBAR_STORAGE_KEY = "console-sidebar-collapsed"

function RouteSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {["stat-1", "stat-2", "stat-3", "stat-4"].map((k) => (
          <Skeleton key={k} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const outlet = useOutlet()
  const matches = useMatches()

  // Independence Day chrome — inert outside the seasonal window.
  const freedomSale = useFreedomSale()
  const greeting = useIndependenceGreeting()

  // Work that finishes in another tab (a wallet top-up, a plan change) lands
  // here as a refetch rather than as a stale page waiting for a reload.
  useConsoleBroadcastSync()

  const [searchOpen, setSearchOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
  )

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  // ⌘K — open search
  const openSearch = useCallback(() => {
    setSearchOpen(true)
  }, [])
  useKeyboardShortcut("k", openSearch, "cmd")

  // G + letter — GitHub-style navigation (works because hooks use refs internally)
  useKeySequence(["g", "d"], () => void navigate("/"))
  useKeySequence(["g", "v"], () => void navigate("/compute/instances"))
  useKeySequence(["g", "i"], () => void navigate("/iam"))
  useKeySequence(["g", "b"], () => void navigate("/billing"))
  useKeySequence(["g", "p"], () => void navigate("/networking"))
  useKeySequence(["g", "r"], () => void navigate("/resource-groups"))

  const isHome = location.pathname === "/"

  // Routes can opt out of the service sidebar (e.g. full-bleed create
  // wizards) via `handle: { hideSidebar: true }`.
  const hideSidebar = matches.some(
    (m) => (m.handle as { hideSidebar?: boolean } | undefined)?.hideSidebar,
  )
  const showSidebar = !isHome && !hideSidebar

  // A step further than hideSidebar: `handle: { fullBleed: true }` also drops
  // the shell's own padding, so the route paints to the window edges. For a
  // page that is itself a workbench — the serverless editor, with its rail,
  // panels and status bar — that gutter is a frame around a frame.
  const fullBleed = matches.some(
    (m) => (m.handle as { fullBleed?: boolean } | undefined)?.fullBleed,
  )

  return (
    <MotionProvider>
      {/* `isolate` is here for the seasonal watermark: it makes this div the
          stacking context the wheel's `-z-10` resolves against, so the wheel
          lands above this element's own background and below everything in
          the shell. Without it the wheel would sink under `bg-background`. */}
      <div className="min-h-screen isolate flex flex-col bg-background text-foreground bg-gradient-surface">
        {freedomSale.active && isHome && <ChakraWatermark />}
        {freedomSale.bannerVisible && <FreedomSaleBanner onDismiss={freedomSale.dismiss} />}
        <Topbar onOpenSearch={openSearch} seasonalAccent={freedomSale.active} />

        <div className="flex-1 flex min-w-0">
          {showSidebar && (
            <Sidebar
              collapsed={collapsed}
              onToggle={() => {
                setCollapsed((c) => !c)
              }}
            />
          )}

          <main className={cn("min-w-0 flex-1", !showSidebar && "w-full")}>
            {showSidebar ? (
              // Google-Cloud-style content panel: a white surface with a
              // rounded top-left corner that connects to the dividerless
              // topbar + sidebar sitting on the shared tinted background.
              <div className="mt-2 min-h-[calc(100vh-96px-0.5rem)] rounded-tl-2xl border-t border-l border-border/50 bg-card shadow-sm md:min-h-[calc(100vh-52px-0.5rem)]">
                <div className="w-full px-4 py-6 md:px-6 lg:px-8">
                  <Suspense fallback={<RouteSkeleton />}>{outlet}</Suspense>
                </div>
              </div>
            ) : (
              <div
                className={
                  hideSidebar
                    ? // `min-w-0` is load-bearing: this is a flex column, and a
                      // flex item's min-width defaults to its content. Without it
                      // any wide child — a <pre> of generated YAML, a long table —
                      // stretches the column past the viewport and scrolls the
                      // whole page sideways, taking the topbar with it.
                      cn(
                        "flex min-h-[calc(100vh-96px)] w-full min-w-0 flex-col md:min-h-[calc(100vh-52px)]",
                        !fullBleed && "px-4 py-4 md:px-4 lg:px-4 lg:py-4",
                      )
                    : "mx-auto w-full max-w-400 px-4 py-6 md:px-6 lg:px-8"
                }
              >
                <Suspense fallback={<RouteSkeleton />}>{outlet}</Suspense>
              </div>
            )}
          </main>
        </div>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <MobileNumberPrompt />
        {greeting.show && <IndependenceGreeting onDismiss={greeting.dismiss} />}
      </div>
    </MotionProvider>
  )
}
