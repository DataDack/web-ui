import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { useDashboard } from '@/lib/queries'

/**
 * Google-Cloud-style shell: a dividerless blurred topbar and sidebar sitting on
 * the shared tinted background, with content on a raised panel that has a
 * rounded top-left corner connecting the two.
 */
export function AppShell() {
  const { refetch, isFetching, data } = useDashboard()

  return (
    <div className="bg-background bg-gradient-surface text-foreground flex min-h-screen flex-col">
      <Topbar
        onRefresh={() => {
          void refetch()
        }}
        refreshing={isFetching}
        status={data?.status}
      />

      <div className="flex min-w-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="border-border/50 bg-card mt-2 min-h-[calc(100vh-96px)] rounded-tl-2xl border-t border-l shadow-sm md:min-h-[calc(100vh-52px-0.5rem)]">
            <div className="w-full px-4 py-6 md:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
