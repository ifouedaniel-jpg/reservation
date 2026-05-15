export const dynamic = 'force-dynamic'
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { ServiceCard } from '@/components/booking/ServiceCard';

export const metadata: Metadata = {
  title: 'Nos prestations',
};

export default async function PrestationsPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      images: { select: { url: true }, orderBy: { order: 'asc' } },
    },
  });

  return (
    <div>
      <div className="bg-gradient-to-b from-rose-50 to-white py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="text-4xl font-bold text-zinc-900">Nos prestations</h1>
          <p className="mt-2 text-zinc-500">
            Choisissez une prestation et réservez votre créneau en ligne.
          </p>
        </div>
      </div>
    <div className="mx-auto max-w-5xl px-4 py-10">

      {services.length === 0 ? (
        <p className="text-muted-foreground">Aucune prestation disponible pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
