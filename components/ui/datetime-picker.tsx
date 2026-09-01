"use client"

import * as React from "react"
import { format } from "date-fns"
import { tr as trLocale } from "date-fns/locale"
import { Icon } from "@iconify/react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const TIME_FIELD_CLASS =
  "h-12 w-16 rounded-md border border-input bg-background px-2 text-center text-base font-medium tabular-nums shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

function clampTimePart(value: string, max: number) {
  const digits = value.replace(/\D/g, "").slice(0, 2)

  if (!digits) return ""

  const parsed = Number(digits)
  if (Number.isNaN(parsed)) return ""

  return String(Math.min(Math.max(parsed, 0), max)).padStart(digits.length === 1 ? 1 : 2, "0")
}

function normalizeTimePart(value: string, max: number) {
  return clampTimePart(value, max) || "00"
}

function stepTimePart(value: string, delta: number, max: number) {
  const current = clampTimePart(value, max)
  const next = current === "" ? 0 : Number(current) + delta
  return String(Math.min(Math.max(next, 0), max)).padStart(2, "0")
}

function selectAllCurrentTarget(e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) {
  e.currentTarget.select()
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Tarih ve saat seçin",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [hours, setHours] = React.useState(
    value ? String(value.getHours()).padStart(2, "0") : "09"
  )
  const [minutes, setMinutes] = React.useState(
    value ? String(value.getMinutes()).padStart(2, "0") : "00"
  )

  const commitDateTime = React.useCallback(
    (date: Date, nextHours = hours, nextMinutes = minutes) => {
      const h = Number(normalizeTimePart(nextHours, 23))
      const m = Number(normalizeTimePart(nextMinutes, 59))

      const nextDate = new Date(date)
      nextDate.setHours(h, m, 0, 0)

      setSelectedDate(nextDate)
      setHours(String(h).padStart(2, "0"))
      setMinutes(String(m).padStart(2, "0"))
      onChange?.(nextDate)
    },
    [hours, minutes, onChange]
  )

  const updateHours = (nextHours: string) => {
    setHours(nextHours)
    if (selectedDate && nextHours !== "") {
      commitDateTime(selectedDate, nextHours, minutes)
    }
  }

  const updateMinutes = (nextMinutes: string) => {
    setMinutes(nextMinutes)
    if (selectedDate && nextMinutes !== "") {
      commitDateTime(selectedDate, hours, nextMinutes)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined)
      onChange?.(undefined)
      return
    }

    commitDateTime(date)
  }

  const handleClear = () => {
    setSelectedDate(undefined)
    setHours("09")
    setMinutes("00")
    onChange?.(undefined)
  }

  const renderTimeControl = (
    label: string,
    value: string,
    onValueChange: (nextValue: string) => void,
    max: number
  ) => (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => onValueChange(stepTimePart(value, 1, max))}
        aria-label={`${label} artır`}
      >
        <Icon icon="mdi:chevron-up" className="h-4 w-4" />
      </Button>

      <Input
        aria-label={label}
        inputMode="numeric"
        maxLength={2}
        placeholder="00"
        type="text"
        value={value}
        onFocus={selectAllCurrentTarget}
        onClick={selectAllCurrentTarget}
        onChange={(e) => {
          const nextValue = clampTimePart(e.target.value, max)
          onValueChange(nextValue)
        }}
        onBlur={() => {
          const normalized = normalizeTimePart(value, max)
          onValueChange(normalized)
          if (selectedDate) {
            commitDateTime(
              selectedDate,
              label === "Saat" ? normalized : hours,
              label === "Dakika" ? normalized : minutes
            )
          }
        }}
        className={TIME_FIELD_CLASS}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => onValueChange(stepTimePart(value, -1, max))}
        aria-label={`${label} azalt`}
      >
        <Icon icon="mdi:chevron-down" className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full min-w-0 justify-start gap-2 text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <Icon icon="mdi:calendar-clock" className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedDate ? (
              format(selectedDate, "d MMMM yyyy, HH:mm", { locale: trLocale })
            ) : (
              placeholder
            )}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[340px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border bg-popover p-0 shadow-lg"
      >
        <div className="flex flex-col">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            locale={trLocale}
            className="mx-auto p-3 pb-2"
          />

          <div className="border-t border-border/70 bg-background/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icon icon="mdi:clock-outline" className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Saat Seçin</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              {renderTimeControl("Saat", hours, updateHours, 23)}
              <span className="text-3xl font-bold leading-none text-muted-foreground">
                :
              </span>
              {renderTimeControl("Dakika", minutes, updateMinutes, 59)}
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClear} className="flex-1">
                Temizle
              </Button>
              <Button size="sm" onClick={() => setOpen(false)} className="flex-1">
                Tamam
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
