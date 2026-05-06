"use client"

import * as React from "react"
import { DayPicker, type DayButtonProps } from "react-day-picker"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CalendarDayButton({ day, modifiers, className, ...props }: DayButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "h-9 w-9 p-0 rounded-md font-normal text-sm inline-flex items-center justify-center transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        modifiers.selected &&
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        modifiers.today && !modifiers.selected && "bg-accent text-accent-foreground font-semibold",
        modifiers.outside && "opacity-40",
        modifiers.disabled && "opacity-30 cursor-not-allowed pointer-events-none",
        className
      )}
    />
  )
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = false, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={fr}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-8",
        caption_label: "text-sm font-medium capitalize",
        nav: "absolute inset-x-0 top-0 flex justify-between items-center",
        button_previous:
          "h-8 w-8 inline-flex items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground opacity-70 hover:opacity-100 disabled:pointer-events-none disabled:opacity-30",
        button_next:
          "h-8 w-8 inline-flex items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground opacity-70 hover:opacity-100 disabled:pointer-events-none disabled:opacity-30",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 font-normal text-[0.8rem] text-center pb-1",
        weeks: "",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center flex items-center justify-center",
        day_button: "",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        DayButton: CalendarDayButton,
        Chevron: ({ orientation }) =>
          orientation === "left" || orientation === "up" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"
export { Calendar }
