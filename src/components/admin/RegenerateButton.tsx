'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { regenerateSlotsAction } from '@/server/actions/slots';

export function RegenerateButton() {
  const [result, setResult] = useState<{ ok: boolean; count?: number; error?: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await regenerateSlotsAction();
      setResult(res);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? 'Génération en cours…' : 'Régénérer les créneaux des 8 prochaines semaines'}
      </Button>
      {result?.ok && (
        <p className="text-sm text-green-700">
          {result.count ?? 0} créneau{(result.count ?? 0) !== 1 ? 'x' : ''} créé
          {(result.count ?? 0) !== 1 ? 's' : ''}.
        </p>
      )}
      {result && !result.ok && <p className="text-sm text-destructive">{result.error}</p>}
    </div>
  );
}
