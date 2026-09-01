"use client"

import * as React from "react"
import { Icon } from "@iconify/react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type ChevronProps,
  type MonthCaptionProps,
  useDayPicker,
} from "react-day-picker"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        defaultClassNames.day_button,
        "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function CalendarChevron({ orientation, className, ...props }: ChevronProps) {
  const icon = orientation === "left"
    ? "mdi:chevron-left"
    : orientation === "right"
      ? "mdi:chevron-right"
      : orientation === "up"
        ? "mdi:chevron-up"
        : "mdi:chevron-down"

  return <Icon icon={icon} className={cn("h-4 w-4", className)} {...props} />
}

function CalendarMonthCaption({
  calendarMonth,
  className,
}: MonthCaptionProps) {
  const defaultClassNames = getDefaultClassNames()
  const { previousMonth, nextMonth, goToMonth } = useDayPicker()
  const monthLabel = calendarMonth.date.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  })

  return (
    <div
      className={cn(
        defaultClassNames.month_caption,
        "flex h-8 w-full items-center justify-between gap-2 px-1",
        className
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        )}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        aria-label="Önceki ay"
      >
        <Icon icon="mdi:chevron-left" className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1 text-center text-sm font-medium">
        {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        )}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        aria-label="Sonraki ay"
      >
        <Icon icon="mdi:chevron-right" className="h-4 w-4" />
      </Button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn("mx-auto w-fit p-3", className)}
      classNames={{
        ...defaultClassNames,
        root: cn(
          defaultClassNames.root,
          "mx-auto rounded-lg bg-transparent text-popover-foreground"
        ),
        months: cn(
          defaultClassNames.months,
          "flex flex-col items-center gap-4 sm:flex-row sm:gap-4"
        ),
        month: cn(defaultClassNames.month, "w-full max-w-[320px] space-y-4"),
        month_caption: cn(defaultClassNames.month_caption, "w-full"),
        caption_label: cn(defaultClassNames.caption_label, "w-full text-sm font-medium"),
        nav: cn(defaultClassNames.nav, "hidden"),
        button_previous: cn(defaultClassNames.button_previous, "hidden"),
        button_next: cn(defaultClassNames.button_next, "hidden"),
        month_grid: cn(defaultClassNames.month_grid, "mx-auto w-full border-collapse"),
        weekdays: cn(defaultClassNames.weekdays, "flex w-full justify-center"),
        weekday: cn(
          defaultClassNames.weekday,
          "flex w-9 justify-center rounded-md text-[0.8rem] font-normal text-muted-foreground"
        ),
        week: cn(defaultClassNames.week, "mt-2 flex w-full justify-center"),
        day: cn(
          defaultClassNames.day,
          "relative flex justify-center p-0 text-center text-sm focus-within:relative focus-within:z-20"
        ),
        day_button: cn(
          defaultClassNames.day_button,
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        today: cn(defaultClassNames.today, "bg-accent text-accent-foreground"),
        outside: cn(
          defaultClassNames.outside,
          "text-muted-foreground/50 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30"
        ),
        disabled: cn(defaultClassNames.disabled, "text-muted-foreground opacity-50"),
        selected: cn(
          defaultClassNames.selected,
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
        ),
        range_middle: cn(defaultClassNames.range_middle, "aria-selected:bg-accent aria-selected:text-accent-foreground"),
        range_start: cn(defaultClassNames.range_start, "rounded-s-md"),
        range_end: cn(defaultClassNames.range_end, "rounded-e-md"),
        hidden: cn(defaultClassNames.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        DayButton: CalendarDayButton,
        MonthCaption: CalendarMonthCaption,
        ...components,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
