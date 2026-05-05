'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBlockedDate } from '@/server/actions/availability';

export function BlockedDateForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createBlockedDate(null, formData);
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Bloquer une date
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <form action={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Raison (optionnel)</Label>
            <Input id="reason" name="reason" type="text" placeholder="Ex : Noël, Congés…" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Enregistrement…' : 'Bloquer cette date'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
