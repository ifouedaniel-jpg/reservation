import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"

type Props = {
  params: Promise<{ serviceSlug: string }>
  searchParams: Promise<{ slot?: string }>
}

export default async function FormulaireReservationPage({ params, searchParams }: Props) {
  const { serviceSlug } = await params
  const { slot: slotId } = await searchParams

  if (!slotId) notFound()

  const service = await prisma.service.findUnique({
    where: { slug: serviceSlug, active: true },
  })

  if (!service) notFound()

  const slot = await prisma.timeSlot.findUnique({
    where: { id: slotId, status: "OPEN" },
  })

  if (!slot) notFound()

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href={`/reserver/${serviceSlug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Changer de créneau
      </Link>

      <h1 className="mb-2 text-2xl font-semibold">Vos coordonnées</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Formulaire de réservation — à implémenter (T1.7)
      </p>

      <p className="rounded-xl border bg-muted/40 p-4 font-mono text-xs text-muted-foreground">
        slot: {slotId}
        <br />
        service: {service.slug}
      </p>
    </div>
  )
}
