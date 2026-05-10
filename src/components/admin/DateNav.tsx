'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, '0'),
    String(dt.getDate()).padStart(2, '0'),
  ].join('-');
}

export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const go = (d: string) => router.push(`/admin/disponibilites?date=${d}`);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => go(shiftDate(date, -1))}>
        ←
      </Button>
      <Input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="w-40"
      />
      <Button variant="outline" size="sm" onClick={() => go(shiftDate(date, 1))}>
        →
      </Button>
    </div>
  );
}
