'use client';

import { useTransition } from 'react';
import { toggleSlotStatus } from '@/server/actions/slots';

type Props = { id: string; time: string; status: string };

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer',
  CLOSED: 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer line-through',
  PENDING: 'bg-yellow-100 text-yellow-800 cursor-default',
  BOOKED: 'bg-blue-100 text-blue-800 cursor-default',
};

export function SlotToggleButton({ id, time, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const isToggleable = status === 'OPEN' || status === 'CLOSED';
  const style = STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground cursor-default';

  if (!isToggleable) {
    return (
      <span
        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${style}`}
        title={status}
      >
        {time}
      </span>
    );
  }

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await toggleSlotStatus(id);
        })
      }
      disabled={isPending}
      title={status === 'OPEN' ? 'Cliquer pour fermer' : 'Cliquer pour ouvrir'}
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${style}`}
    >
      {time}
    </button>
  );
}
