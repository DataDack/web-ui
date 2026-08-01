import { Suspense, useState } from "react"

import { useOutlet } from "react-router-dom"

import { MotionProvider } from "@/components/console"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

import { Skeleton } from "@datadack/serverless-ui"

import { AdminSidebar } from "./AdminSidebar"
import { AdminTopbar } from "./AdminTopbar"

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
      <div className="flex min-h-screen flex-col bg-background text-foreground bg-gradient-surface">
        <AdminTopbar
          onOpenMobileNav={() => {
            setMobileNavOpen(true)
          }}
        />

        <div className="flex min-w-0 flex-1">
          {/* Desktop sidebar */}
          <div className="sticky top-[52px] hidden h-[calc(100vh-52px)] w-60 lg:flex">
            <AdminSidebar />
          </div>

          <main className="mx-auto w-full max-w-[1400px] min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8">
            <Suspense fallback={<RouteSkeleton />}>{outlet}</Suspense>
          </main>
        </div>

        {/* Mobile sidebar drawer */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0">
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
