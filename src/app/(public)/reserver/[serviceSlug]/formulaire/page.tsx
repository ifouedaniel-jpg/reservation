import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { addMinutes } from "date-fns"
import { prisma } from "@/lib/db"
import { parsePriceMatrix, selectedOptionsSchema, calculatePrice, getDurationMinutes } from "@/schemas/priceMatrix"
import { getSetting } from "@/lib/settings"
import FormulaireClient from "./FormulaireClient"

type Props = {
  params: Promise<{ serviceSlug: string }>
  searchParams: Promise<{ windowId?: string; startTime?: string; selectedOptions?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serviceSlug } = await params
  const service = await prisma.service.findUnique({ where: { slug: serviceSlug, active: true } })
  if (!service) return {}
  return { title: `Réservation — ${service.name}` }
}

export default async function FormulaireReservationPage({ params, searchParams }: Props) {
  const { serviceSlug } = await params
  const { windowId, startTime, selectedOptions: selectedOptionsJson } = await searchParams

  if (!windowId || !startTime) notFound()

  const bookingStartsAt = new Date(startTime)
  if (isNaN(bookingStartsAt.getTime())) notFound()

  const [service, window, paypalLink] = await Promise.all([
    prisma.service.findUnique({ where: { slug: serviceSlug, active: true } }),
    prisma.timeSlot.findUnique({ where: { id: windowId, status: "OPEN" } }),
    getSetting('paypal_link'),
  ])

  if (!service || !window) notFound()

  // Vérifie que l'heure de début est dans la fenêtre
  if (bookingStartsAt < window.startsAt || bookingStartsAt >= window.endsAt) notFound()

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

  const durationMinutes = estimatedDurationMinutes ?? service.durationMinutes
  const bookingEndsAt = addMinutes(bookingStartsAt, durationMinutes)

  // Vérifie que la fin du RDV ne dépasse pas la fenêtre
  if (bookingEndsAt > window.endsAt) notFound()

  // Re-validation serveur : vérifie l'absence de chevauchement
  const overlapping = await prisma.booking.count({
    where: {
      timeSlotId: windowId,
      status: { in: ["PENDING", "CONFIRMED"] },
      bookingStartsAt: { lt: bookingEndsAt },
      bookingEndsAt: { gt: bookingStartsAt },
    },
  })
  if (overlapping > 0) {
    // Le créneau a été pris entre le moment où l'utilisateur a sélectionné et maintenant
    notFound()
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href={`/reserver/${serviceSlug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Changer de créneau
      </Link>

      <h1 className="mb-8 text-2xl font-semibold">Votre réservation</h1>

      <FormulaireClient
        service={{
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          estimatedDurationMinutes,
          priceCentsAtBooking,
          optionsSummary,
        }}
        slot={{
          windowId: window.id,
          bookingStartsAt: bookingStartsAt.toISOString(),
          bookingEndsAt: bookingEndsAt.toISOString(),
        }}
        selectedOptionsJson={selectedOptionsJson ?? null}
        paypalLink={paypalLink ?? null}
      />
    </div>
  )
}
