'use client';

import { useState, useTransition } from 'react';
import { createManualSlot } from '@/server/actions/slots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ManualSlotForm({ date }: { date: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createManualSlot(null, formData);
      if (result.ok) {
        setSuccess(true);
        setFormKey((k) => k + 1);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-lg border p-5 space-y-4">
      <h3 className="font-medium">Ajouter un créneau</h3>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Créneau ajouté avec succès.
        </p>
      )}

      <form key={formKey} action={handleSubmit}>
        <input type="hidden" name="date" value={date} />

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="slot-start">Heure de début</Label>
            <Input
              id="slot-start"
              name="startTime"
              type="time"
              required
              defaultValue="09:00"
              className="w-36"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slot-end">Heure de fin</Label>
            <Input
              id="slot-end"
              name="endTime"
              type="time"
              required
              defaultValue="09:30"
              className="w-36"
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Ajout…' : '+ Ajouter'}
          </Button>
        </div>
      </form>
    </div>
  );
}
