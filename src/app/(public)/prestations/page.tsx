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
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-3xl font-semibold">Nos prestations</h1>
        <p className="text-muted-foreground">
          Choisissez une prestation et réservez votre créneau en ligne.
        </p>
      </div>

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
  );
}
