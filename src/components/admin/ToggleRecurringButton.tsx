'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toggleRecurringActive } from '@/server/actions/availability';

type Props = { id: string; active: boolean };

export function ToggleRecurringButton({ id, active }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleRecurringActive(id);
    });
  }

  return (
    <Button variant="secondary" size="sm" disabled={isPending} onClick={handleToggle}>
      {active ? 'Désactiver' : 'Activer'}
    </Button>
  );
}
