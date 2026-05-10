"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { formatInTimeZone } from "date-fns-tz"
import { fr } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PARIS_TZ = "Europe/Paris"

type Slot = {
  id: string
  startsAt: string
  endsAt: string
}

type Props = {
  serviceSlug: string
  slots: Slot[]
  extraParams?: Record<string, string>
  disabled?: boolean
}

export default function SlotPicker({ serviceSlug, slots, extraParams, disabled }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const slotsByDate = useMemo(() => {
    const map: Record<string, Slot[]> = {}
    for (const slot of slots) {
      const key = formatInTimeZone(new Date(slot.startsAt), PARIS_TZ, "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push(slot)
    }
    return map
  }, [slots])

  const availableDateKeys = useMemo(() => new Set(Object.keys(slotsByDate)), [slotsByDate])

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate) return []
    const key = formatInTimeZone(selectedDate, PARIS_TZ, "yyyy-MM-dd")
    return slotsByDate[key] ?? []
  }, [selectedDate, slotsByDate])

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    setSelectedSlotId(null)
  }

  const isDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true
    const key = formatInTimeZone(date, PARIS_TZ, "yyyy-MM-dd")
    return !availableDateKeys.has(key)
  }

  const handleContinue = () => {
    if (!selectedSlotId) return
    const params = new URLSearchParams({ slot: selectedSlotId, ...extraParams })
    router.push(`/reserver/${serviceSlug}/formulaire?${params.toString()}`)
  }

  if (disabled) {
    return (
      <div className="rounded-xl border bg-muted/40 py-8 text-center text-sm text-muted-foreground">
        Sélectionnez vos options ci-dessus pour choisir un créneau.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center rounded-xl border bg-card p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={isDisabled}
          startMonth={new Date()}
        />
      </div>

      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {formatInTimeZone(selectedDate, PARIS_TZ, "EEEE d MMMM yyyy", { locale: fr })}
          </h3>
          {slotsForSelectedDay.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun créneau disponible ce jour.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {slotsForSelectedDay.map((slot) => {
                const time = formatInTimeZone(new Date(slot.startsAt), PARIS_TZ, "HH:mm")
                const isSelected = selectedSlotId === slot.id
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end border-t pt-4">
        <Button onClick={handleContinue} disabled={!selectedSlotId} size="lg">
          Continuer
        </Button>
      </div>
    </div>
  )
}
