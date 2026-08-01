import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { CreateFunctionForm } from '@/features/studio/components/CreateFunctionForm'
import { queryKeys } from '@/lib/queries'

import { Button, PageHeader, useTheme } from '@datadack/serverless-ui'

import '@/features/studio/studio.css'

/**
 * Full-screen create flow. A dialog was the wrong container: the runtime
 * catalog is a scrolling grid, and nesting one scroll region inside another
 * made both awkward.
 */
export function CreateFunctionPage() {
  const { resolvedTheme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2 mb-3 gap-1.5"
      >
        <Link to="/functions">
          <ArrowLeft className="size-3.5" />
          Functions
        </Link>
      </Button>

      <PageHeader
        title="Create function"
        icon={Plus}
        description="Author from a starter template. The control plane zips and deploys it server-side."
      />

      <CreateFunctionForm
        layout="page"
        theme={resolvedTheme}
        onCancel={() => {
          void navigate('/functions')
        }}
        onCreated={(name) => {
          // The list is driven by the polled dashboard snapshot; invalidating
          // shows the new function immediately instead of up to 5s later.
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
          toast.success(`Created ${name}`, { description: 'Opening the code editor…' })
          void navigate(`/functions/${encodeURIComponent(name)}`)
        }}
      />
    </>
  )
}
