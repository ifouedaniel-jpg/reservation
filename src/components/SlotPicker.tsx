"use client"

import { useState, useMemo } from "react"
import { formatInTimeZone } from "date-fns-tz"
import { fr } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

const PARIS_TZ = "Europe/Paris"

export type AvailableSlot = {
  windowId: string
  startTime: string
  endTime: string
}

type Props = {
  availableSlots: AvailableSlot[]
  onSelect: (slot: AvailableSlot) => void
  selectedStartTime?: string
  disabled?: boolean
}

export default function SlotPicker({ availableSlots, onSelect, selectedStartTime, disabled }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()

  const slotsByDate = useMemo(() => {
    const map: Record<string, AvailableSlot[]> = {}
    for (const slot of availableSlots) {
      const key = formatInTimeZone(new Date(slot.startTime), PARIS_TZ, "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push(slot)
    }
    return map
  }, [availableSlots])

  const availableDateKeys = useMemo(() => new Set(Object.keys(slotsByDate)), [slotsByDate])

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate) return []
    const key = formatInTimeZone(selectedDate, PARIS_TZ, "yyyy-MM-dd")
    return slotsByDate[key] ?? []
  }, [selectedDate, slotsByDate])

  const isDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true
    const key = formatInTimeZone(date, PARIS_TZ, "yyyy-MM-dd")
    return !availableDateKeys.has(key)
  }

  if (disabled) {
    return (
      <div className="rounded-xl border bg-muted/40 py-8 text-center text-sm text-muted-foreground">
        Sélectionnez vos options ci-dessus pour choisir un créneau.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-center rounded-xl border bg-card p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => setSelectedDate(date)}
          disabled={isDisabled}
          startMonth={new Date()}
        />
      </div>

      {selectedDate && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground capitalize">
            {formatInTimeZone(selectedDate, PARIS_TZ, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          {slotsForSelectedDay.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun créneau disponible ce jour.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slotsForSelectedDay.map((slot, i) => {
                const start = formatInTimeZone(new Date(slot.startTime), PARIS_TZ, "HH:mm")
                const end = formatInTimeZone(new Date(slot.endTime), PARIS_TZ, "HH:mm")
                const isSelected = selectedStartTime === slot.startTime
                return (
                  <button
                    key={`${slot.windowId}-${i}`}
                    onClick={() => onSelect(slot)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition-colors text-center",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span className="block">{start}</span>
                    <span className="block text-xs opacity-70">→ {end}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
