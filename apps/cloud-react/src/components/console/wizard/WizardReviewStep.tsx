import { Button } from "@datadack/common-ui"
import { Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"

import { KeyValueGrid, type KeyValueItem } from "../KeyValueGrid"

export interface ReviewGroup {
  title: string
  items: KeyValueItem[]
  /** Step index to jump back to */
  stepIndex: number
}

interface WizardReviewStepProps {
  groups: ReviewGroup[]
  onEdit: (stepIndex: number) => void
}

export function WizardReviewStep({ groups, onEdit }: Readonly<WizardReviewStepProps>) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.title} className="glass-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-foreground">{group.title}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onEdit(group.stepIndex)
              }}
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              <Pencil className="size-3" />
              {t("console.wizard.edit")}
            </Button>
          </div>
          <KeyValueGrid items={group.items} columns={2} />
        </div>
      ))}
    </div>
  )
}
