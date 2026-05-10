'use client';

import dynamic from 'next/dynamic';

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

export default function AdminCalendarLoader() {
  return <AdminCalendar />;
}
