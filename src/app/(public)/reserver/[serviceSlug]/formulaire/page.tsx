import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import BookingForm from "@/components/booking/BookingForm"

type Props = {
  params: Promise<{ serviceSlug: string }>
  searchParams: Promise<{ slot?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serviceSlug } = await params
  const service = await prisma.service.findUnique({ where: { slug: serviceSlug, active: true } })
  if (!service) return {}
  return { title: `Réservation — ${service.name}` }
}

export default async function FormulaireReservationPage({ params, searchParams }: Props) {
  const { serviceSlug } = await params
  const { slot: slotId } = await searchParams

  if (!slotId) notFound()

  const [service, slot] = await Promise.all([
    prisma.service.findUnique({ where: { slug: serviceSlug, active: true } }),
    prisma.timeSlot.findUnique({ where: { id: slotId, status: "OPEN" } }),
  ])

  if (!service || !slot) notFound()

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
          priceCents: service.priceCents,
        }}
        slot={{
          id: slot.id,
          startsAt: slot.startsAt.toISOString(),
        }}
      />
    </div>
  )
}
