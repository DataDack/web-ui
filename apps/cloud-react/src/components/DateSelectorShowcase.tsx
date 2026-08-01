import { useState } from "react"

import { BirthdateField } from "@/components/ui/birthdate-field"
import { DayGridPicker } from "@datadack/common-ui"
import { MonthYearPicker } from "@/components/ui/month-year-picker"

/**
 * Demo of the date-selector family under the rose design skin. Mount this on a
 * route (or in a story) to preview the components in the pink theme.
 */
export function DateSelectorShowcase() {
  const [birthdate, setBirthdate] = useState("1993-08-06")
  const [day, setDay] = useState(6)
  const [month, setMonth] = useState(7) // August
  const [year, setYear] = useState(1993)

  return (
    <div className="theme-rose min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto grid max-w-3xl gap-8">
        <div className="grid max-w-sm gap-2">
          <span className="text-lg text-muted-foreground">Birthdate</span>
          <BirthdateField value={birthdate} onChange={setBirthdate} />
        </div>

        <DayGridPicker className="max-w-md" value={day} onChange={setDay} />

        <MonthYearPicker
          className="max-w-md"
          month={month}
          year={year}
          fromYear={1991}
          toYear={2008}
          onBack={() => undefined}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      </div>
    </div>
  )
}
