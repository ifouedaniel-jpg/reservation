import { requireAdmin } from '@/lib/auth';
import AdminCalendarLoader from '@/components/admin/AdminCalendarLoader';

export default async function CalendrierPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Calendrier</h1>
      <AdminCalendarLoader />
    </div>
  );
}
