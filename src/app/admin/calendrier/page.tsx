import dynamic from 'next/dynamic';
import { requireAdmin } from '@/lib/auth';

const AdminCalendar = dynamic(
  () => import('@/components/admin/AdminCalendar'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Chargement du calendrier…
      </div>
    ),
  }
);

export default async function CalendrierPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendrier</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
            En attente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            Confirmé
          </span>
        </div>
      </div>
      <AdminCalendar />
    </div>
  );
}
