import { Suspense, useState } from "react"

import { useOutlet } from "react-router-dom"

import { MotionProvider } from "@/components/console"

import { Sheet, SheetContent, SheetTitle, Skeleton } from "@datadack/common-ui"

import { AdminSidebar } from "./AdminSidebar"
import { AdminTopbar } from "./AdminTopbar"
import "./admin-density.css"

function RouteSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

/** Dedicated layout for the super-admin console — its own topbar + sidebar,
 *  mounted outside the tenant AppShell. */
export function AdminShell() {
  const outlet = useOutlet()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <MotionProvider>
      <div data-admin-shell className="flex min-h-screen flex-col bg-background text-foreground bg-gradient-surface">
        <AdminTopbar
          onOpenMobileNav={() => {
            setMobileNavOpen(true)
          }}
        />

        <div className="flex min-w-0 flex-1">
          {/* Desktop sidebar */}
          <div className="sticky top-12 hidden h-[calc(100vh-48px)] w-52 lg:flex xl:w-56">
            <AdminSidebar />
          </div>

          <main data-admin-main className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-3 py-3 md:px-4 md:py-4 lg:px-5">
            <Suspense fallback={<RouteSkeleton />}>{outlet}</Suspense>
          </main>
        </div>

        {/* Mobile sidebar drawer */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AdminSidebar
              onNavigate={() => {
                setMobileNavOpen(false)
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
    </MotionProvider>
  )
}
