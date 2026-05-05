'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toggleServiceActive } from '@/server/actions/service';

type Props = { id: string; active: boolean };

export function ToggleServiceButton({ id, active }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleServiceActive(id);
    });
  }

  return (
    <Button variant="secondary" size="sm" disabled={isPending} onClick={handleToggle}>
      {active ? 'Désactiver' : 'Activer'}
    </Button>
  );
}
