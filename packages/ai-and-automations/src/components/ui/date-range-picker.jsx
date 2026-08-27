import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const DateRangePicker = React.forwardRef(({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  disabled,
  ...props
}, ref) => {
  // value = { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
  const from = value?.from ? new Date(value.from) : undefined;
  const to = value?.to ? new Date(value.to) : undefined;
  const selected = from ? { from, to: to || from } : undefined;

  const formatDate = (d) => format(d, "MMM dd");

  const toDateStr = (day) => {
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !from && "text-muted-foreground",
            className
          )}
          {...props}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {from ? (
            to && to.getTime() !== from.getTime() ? (
              <span>{formatDate(from)} - {formatDate(to)}</span>
            ) : (
              <span>{format(from, "PPP")}</span>
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) => {
            if (range?.from) {
              onChange({
                from: toDateStr(range.from),
                to: range.to ? toDateStr(range.to) : toDateStr(range.from),
              });
            } else {
              onChange({ from: '', to: '' });
            }
          }}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
});
DateRangePicker.displayName = "DateRangePicker";

export { DateRangePicker }
