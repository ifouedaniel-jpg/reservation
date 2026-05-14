import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { addWeeks, addMinutes } from "date-fns"
import { prisma } from "@/lib/db"
import { parsePriceMatrix, getMinPriceCents } from "@/schemas/priceMatrix"
import { computeAvailableStartTimes } from "@/lib/slots"
import { ReservationFlow } from "@/components/booking/ReservationFlow"
import { getSetting } from "@/lib/settings"
import { BOOKING_INFO_DEFAULTS } from "@/server/actions/settings"

type Props = { params: Promise<{ serviceSlug: string }> }

function InfoBlock({ title, text }: { title: string; text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <div className="space-y-2">
      <p className="font-semibold text-rose-700">{title}</p>
      <ul className="space-y-1.5 text-zinc-700 list-disc list-inside leading-snug">
        {lines.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    </div>
  )
}

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

  const [service, paypalLink, products, infoMeches, infoAcompte, infoCheveux] = await Promise.all([
    prisma.service.findUnique({ where: { slug: serviceSlug, active: true } }),
    getSetting('paypal_link'),
    prisma.product.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    getSetting('info_booking_meches'),
    getSetting('info_booking_acompte'),
    getSetting('info_booking_cheveux'),
  ])

  if (!service) notFound();
  const resolvedPaypalLink = paypalLink || null;

  const now = new Date()
  const eightWeeksFromNow = addWeeks(now, 8)

  const windows = await prisma.timeSlot.findMany({
    where: {
      status: "OPEN",
      startsAt: { gte: now, lte: eightWeeksFromNow },
    },
    include: {
      bookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        select: { bookingStartsAt: true, bookingEndsAt: true },
      },
    },
    orderBy: { startsAt: "asc" },
  })

  const STEP_MINUTES = 30

  const availableSlots = windows.flatMap((w) => {
    const startTimes = computeAvailableStartTimes(
      w,
      w.bookings,
      service.durationMinutes,
      STEP_MINUTES,
    )
    return startTimes.map((st) => ({
      windowId: w.id,
      startTime: st.toISOString(),
      endTime: addMinutes(st, service.durationMinutes).toISOString(),
    }))
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/prestations/${service.slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← {service.name}
      </Link>

      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold">Réserver</h1>
        <p className="text-sm text-muted-foreground">
          {service.name} · {formatDuration(service.durationMinutes)} ·{' '}
          {(() => {
            const matrix = parsePriceMatrix(service.priceMatrix)
            if (matrix) return `À partir de ${formatPrice(getMinPriceCents(matrix))}`
            return formatPrice(service.priceCents)
          })()}
        </p>
      </div>

      {/* Infos importantes avant réservation */}
      <div className="mb-8 rounded-xl border border-rose-100 bg-rose-50/60 p-5 space-y-5 text-sm">
        <InfoBlock title="Réservation & Mèches" text={infoMeches ?? BOOKING_INFO_DEFAULTS.meches} />
        <div className="border-t border-rose-100 pt-4">
          <InfoBlock title="Acompte & Confirmation" text={infoAcompte ?? BOOKING_INFO_DEFAULTS.acompte} />
        </div>
        <div className="border-t border-rose-100 pt-4">
          <InfoBlock title="État des cheveux & retard" text={infoCheveux ?? BOOKING_INFO_DEFAULTS.cheveux} />
        </div>
      </div>

      {availableSlots.length === 0 ? (
        <p className="rounded-xl border bg-muted/40 py-12 text-center text-sm text-muted-foreground">
          Aucun créneau disponible dans les 8 prochaines semaines.
          <br />
          Revenez bientôt ou contactez-nous directement.
        </p>
      ) : (
        <ReservationFlow
          service={{
            id: service.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            priceCents: service.priceCents,
          }}
          availableSlots={availableSlots}
          priceMatrixJson={service.priceMatrix ?? null}
          paypalLink={resolvedPaypalLink}
          products={products}
        />
      )}
    </div>
  )
}
