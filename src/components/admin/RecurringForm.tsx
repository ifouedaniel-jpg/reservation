'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createRecurring } from '@/server/actions/availability';

const SELECT_CLASS =
  'border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const DAY_OPTIONS = [
  { value: '1', label: 'Lundi' },
  { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' },
  { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' },
  { value: '6', label: 'Samedi' },
  { value: '0', label: 'Dimanche' },
];

const SLOT_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '60 min' },
];

export function RecurringForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createRecurring(null, formData);
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
        Ajouter une règle
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <form action={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">Jour</Label>
            <select id="dayOfWeek" name="dayOfWeek" required className={SELECT_CLASS}>
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Début</Label>
            <Input id="startTime" name="startTime" type="time" required defaultValue="09:00" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">Fin</Label>
            <Input id="endTime" name="endTime" type="time" required defaultValue="19:00" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slotMinutes">Créneaux</Label>
            <select id="slotMinutes" name="slotMinutes" required className={SELECT_CLASS}>
              {SLOT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
