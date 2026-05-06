import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { addWeeks } from "date-fns"
import { prisma } from "@/lib/db"
import SlotPicker from "@/components/SlotPicker"

type Props = { params: Promise<{ serviceSlug: string }> }

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} h ${m.toString().padStart(2, "0")}` : `${h} h`
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serviceSlug } = await params
  const service = await prisma.service.findUnique({ where: { slug: serviceSlug, active: true } })
  if (!service) return {}
  return { title: `Réserver — ${service.name}` }
}

export default async function ReserverPage({ params }: Props) {
  const { serviceSlug } = await params

  const service = await prisma.service.findUnique({
    where: { slug: serviceSlug, active: true },
  })

  if (!service) notFound()

  const now = new Date()
  const eightWeeksFromNow = addWeeks(now, 8)

  const rawSlots = await prisma.timeSlot.findMany({
    where: {
      status: "OPEN",
      startsAt: { gte: now, lte: eightWeeksFromNow },
    },
    orderBy: { startsAt: "asc" },
  })

  const slots = rawSlots.map((s) => ({
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/prestations/${service.slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← {service.name}
      </Link>

      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">Choisir un créneau</h1>
        <p className="text-sm text-muted-foreground">
          {service.name} · {formatDuration(service.durationMinutes)} · {formatPrice(service.priceCents)}
        </p>
      </div>

      {slots.length === 0 ? (
        <p className="rounded-xl border bg-muted/40 py-12 text-center text-sm text-muted-foreground">
          Aucun créneau disponible dans les 8 prochaines semaines.
          <br />
          Revenez bientôt ou contactez-nous directement.
        </p>
      ) : (
        <SlotPicker serviceSlug={service.slug} slots={slots} />
      )}
    </div>
  )
}
