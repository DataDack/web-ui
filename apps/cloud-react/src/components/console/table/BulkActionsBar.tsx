import { type LucideIcon, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"

import { Button } from "@datadack/common-ui"

import { DUR, EASE } from "../motion/motion-config"

export interface BulkAction {
  label: string
  icon?: LucideIcon
  destructive?: boolean
  onAction: () => void
}

interface BulkActionsBarProps {
  count: number
  actions: BulkAction[]
  onClear: () => void
}

export function BulkActionsBar({ count, actions, onClear }: Readonly<BulkActionsBarProps>) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: DUR.base, ease: EASE.out }}
          className="glass-3 fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl px-3 py-2 shadow-lg max-w-[calc(100vw-2rem)]"
        >
          <span className="font-mono text-[12px] text-muted-foreground px-1 whitespace-nowrap">
            {t("console.table.selected", { count })}
          </span>
          <div className="w-px h-5 bg-border-glass" />
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.label}
                size="sm"
                variant={action.destructive ? "destructive" : "secondary"}
                onClick={action.onAction}
                className="h-8 gap-1.5"
              >
                {Icon && <Icon className="size-3.5" />}
                {action.label}
              </Button>
            )
          })}
          <Button
            size="icon"
            variant="ghost"
            onClick={onClear}
            className="h-8 w-8 text-muted-foreground"
            aria-label={t("console.table.clearSelection")}
          >
            <X className="size-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
