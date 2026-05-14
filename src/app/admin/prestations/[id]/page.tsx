import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { updateService } from '@/server/actions/service';
import { ServiceForm } from '@/components/admin/ServiceForm';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPrestationPage({ params }: Props) {
  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
      priceWithExtensionCents: true,
      active: true,
      sortOrder: true,
      priceMatrix: true,
      images: { select: { id: true, url: true, order: true }, orderBy: { order: 'asc' } },
    },
  });
  if (!service) notFound();

  const boundAction = updateService.bind(null, service.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modifier la prestation</h1>
      <ServiceForm action={boundAction} service={service} />
    </div>
  );
}
