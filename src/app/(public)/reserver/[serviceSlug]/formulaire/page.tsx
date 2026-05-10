import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import BookingForm from "@/components/booking/BookingForm"
import { parsePriceMatrix, selectedOptionsSchema, calculatePrice, getDurationMinutes } from "@/schemas/priceMatrix"

type Props = {
  params: Promise<{ serviceSlug: string }>
  searchParams: Promise<{ slot?: string; selectedOptions?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serviceSlug } = await params
  const service = await prisma.service.findUnique({ where: { slug: serviceSlug, active: true } })
  if (!service) return {}
  return { title: `Réservation — ${service.name}` }
}

export default async function FormulaireReservationPage({ params, searchParams }: Props) {
  const { serviceSlug } = await params
  const { slot: slotId, selectedOptions: selectedOptionsJson } = await searchParams

  if (!slotId) notFound()

  const [service, slot] = await Promise.all([
    prisma.service.findUnique({ where: { slug: serviceSlug, active: true } }),
    prisma.timeSlot.findUnique({ where: { id: slotId, status: "OPEN" } }),
  ])

  if (!service || !slot) notFound()

  let priceCentsAtBooking = service.priceCents
  let estimatedDurationMinutes: number | null = null
  let optionsSummary: string | null = null

  if (selectedOptionsJson && service.priceMatrix) {
    const matrix = parsePriceMatrix(service.priceMatrix)
    if (matrix) {
      try {
        const opts = selectedOptionsSchema.parse(JSON.parse(selectedOptionsJson))
        priceCentsAtBooking = calculatePrice(matrix, opts)
        estimatedDurationMinutes = getDurationMinutes(matrix, opts)
        const optLabels = opts.optionIds
          .map((id) => matrix.options.find((o) => o.id === id)?.label)
          .filter(Boolean)
        optionsSummary = [opts.size, opts.length, ...optLabels].join(' · ')
      } catch {
        // fall back to base price/duration
      }
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href={`/reserver/${serviceSlug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Changer de créneau
      </Link>

      <h1 className="mb-8 text-2xl font-semibold">Vos coordonnées</h1>

      <BookingForm
        service={{
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          estimatedDurationMinutes,
          priceCentsAtBooking,
          optionsSummary,
        }}
        slot={{ id: slot.id, startsAt: slot.startsAt.toISOString() }}
        selectedOptionsJson={selectedOptionsJson ?? null}
      />
    </div>
  )
}
