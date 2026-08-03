import { Button, Input, Label, type TagRow } from "@datadack/common-ui"
import { Plus, Tag, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

interface TagEditorProps {
  rows: TagRow[]
  onChange: (rows: TagRow[]) => void
  label?: string
}

export function TagEditor({ rows, onChange, label }: Readonly<TagEditorProps>) {
  const { t } = useTranslation()

  const addRow = () => {
    onChange([...rows, { key: "", value: "" }])
  }
  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index))
  }
  const updateRow = (index: number, field: keyof TagRow, value: string) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          <Tag className="w-3.5 h-3.5" />
          {label ?? t("console.tags.label")}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRow}
          className="h-7 gap-1 text-xs text-muted-foreground"
        >
          <Plus className="w-3 h-3" />
          {t("console.tags.add")}
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          // Rows have no stable identity while being edited — index keys are intentional
          // eslint-disable-next-line react/no-array-index-key
          <div key={index} className="flex items-center gap-2">
            <Input
              value={row.key}
              onChange={(e) => {
                updateRow(index, "key", e.target.value)
              }}
              placeholder={t("console.tags.keyPlaceholder")}
              className="font-mono flex-1"
            />
            <span className="text-muted-foreground text-sm">=</span>
            <Input
              value={row.value}
              onChange={(e) => {
                updateRow(index, "value", e.target.value)
              }}
              placeholder={t("console.tags.valuePlaceholder")}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                removeRow(index)
              }}
              disabled={rows.length === 1}
              className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
              aria-label={t("console.tags.remove")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
