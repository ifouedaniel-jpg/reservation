import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { DeleteServiceButton } from '@/components/admin/DeleteServiceButton';
import { ToggleServiceButton } from '@/components/admin/ToggleServiceButton';

export default async function PrestationsPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prestations</h1>
        <Button asChild>
          <Link href="/admin/prestations/nouveau">Nouvelle prestation</Link>
        </Button>
      </div>

      {services.length === 0 ? (
        <p className="text-muted-foreground">Aucune prestation pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Image</th>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Durée</th>
                <th className="px-4 py-3 text-left font-medium">Prix</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {service.imageUrl ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={service.imageUrl}
                          alt={service.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{service.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{service.durationMinutes} min</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(service.priceCents / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        service.active
                          ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                          : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500'
                      }
                    >
                      {service.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/prestations/${service.id}`}>Éditer</Link>
                      </Button>
                      <ToggleServiceButton id={service.id} active={service.active} />
                      <DeleteServiceButton id={service.id} name={service.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
