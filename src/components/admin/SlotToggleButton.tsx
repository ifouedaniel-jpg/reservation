'use client';

import { useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { toggleSlotStatus } from '@/server/actions/slots';

type Props = { id: string; status: string };

export function SlotToggleButton({ id, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const isToggleable = status === 'OPEN' || status === 'CLOSED';

  if (!isToggleable) {
    return null;
  }

  return (
    <Switch
      checked={status === 'OPEN'}
      disabled={isPending}
      onCheckedChange={() =>
        startTransition(async () => {
          await toggleSlotStatus(id);
        })
      }
    />
  );
}
