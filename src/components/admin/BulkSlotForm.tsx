'use client';

import { useState, useMemo, useTransition } from 'react';
import { addDays, nextDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createBulkSlots } from '@/server/actions/slots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'consecutive' | 'recurrence';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

function tomorrowStr() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd');
}

// Trouve les N prochaines occurrences d'un jour de semaine à partir d'une date
function nextOccurrences(startDate: string, dayOfWeek: number, count: number): string[] {
  const start = new Date(startDate + 'T12:00:00');
  const dates: string[] = [];
  // nextDay de date-fns attend 0=dimanche … 6=samedi
  const dow = dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  let current = nextDay(start, dow);
  // Si la date de départ EST déjà ce jour, on l'inclut
  if (start.getDay() === dayOfWeek) current = start;
  for (let i = 0; i < count; i++) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 7);
  }
  return dates;
}

function consecutiveDates(startDate: string, count: number): string[] {
  const start = new Date(startDate + 'T12:00:00');
  return Array.from({ length: count }, (_, i) =>
    format(addDays(start, i), 'yyyy-MM-dd'),
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return format(d, 'EEEE dd MMMM yyyy', { locale: fr });
}

export function BulkSlotForm() {
  const [mode, setMode] = useState<Mode>('consecutive');
  const [startDate, setStartDate] = useState(tomorrowStr());
  const [count, setCount] = useState(3);
  const [dayOfWeek, setDayOfWeek] = useState(1); // lundi
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewDates = useMemo(() => {
    const n = Math.min(Math.max(count, 1), 30);
    if (mode === 'consecutive') return consecutiveDates(startDate, n);
    return nextOccurrences(startDate, dayOfWeek, n);
  }, [mode, startDate, count, dayOfWeek]);

  const timeValid = startTime < endTime;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!timeValid) return;
    setResult(null);
    setError(null);
    const slots = previewDates.map((date) => ({ date, startTime, endTime }));
    startTransition(async () => {
      const res = await createBulkSlots(slots);
      if (res.ok) setResult({ created: res.created, skipped: res.skipped });
      else setError(res.error);
    });
  }

  return (
    <div className="rounded-lg border p-5 space-y-5">
      <h3 className="font-medium">Ajout en bloc</h3>

      {/* Sélecteur de mode */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('consecutive')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'consecutive'
              ? 'bg-primary text-primary-foreground'
              : 'border text-muted-foreground hover:text-foreground'
          }`}
        >
          Jours consécutifs
        </button>
        <button
          type="button"
          onClick={() => setMode('recurrence')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'recurrence'
              ? 'bg-primary text-primary-foreground'
              : 'border text-muted-foreground hover:text-foreground'
          }`}
        >
          Récurrence hebdomadaire
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Date de départ */}
          <div className="space-y-1.5">
            <Label htmlFor="bulk-start-date">
              {mode === 'consecutive' ? 'Date de début' : 'À partir du'}
            </Label>
            <Input
              id="bulk-start-date"
              type="date"
              value={startDate}
              min={todayStr()}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-44"
              required
            />
          </div>

          {/* Jour de semaine (mode récurrence) */}
          {mode === 'recurrence' && (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-dow">Jour de la semaine</Label>
              <select
                id="bulk-dow"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="bulk-count">
              {mode === 'consecutive' ? 'Nombre de jours' : 'Nombre de semaines'}
            </Label>
            <Input
              id="bulk-count"
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24"
              required
            />
          </div>

          {/* Horaires */}
          <div className="space-y-1.5">
            <Label htmlFor="bulk-start-time">Heure de début</Label>
            <Input
              id="bulk-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-36"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-end-time">Heure de fin</Label>
            <Input
              id="bulk-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-36"
              required
            />
          </div>
        </div>

        {!timeValid && (
          <p className="text-sm text-destructive">L&apos;heure de fin doit être après l&apos;heure de début.</p>
        )}

        {/* Preview */}
        {previewDates.length > 0 && (
          <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {previewDates.length} fenêtre{previewDates.length > 1 ? 's' : ''} à créer · {startTime}–{endTime}
            </p>
            <ul className="space-y-0.5 text-sm">
              {previewDates.slice(0, 10).map((d) => (
                <li key={d} className="capitalize text-muted-foreground">
                  {formatDateLabel(d)}
                </li>
              ))}
              {previewDates.length > 10 && (
                <li className="text-muted-foreground">
                  … et {previewDates.length - 10} de plus
                </li>
              )}
            </ul>
          </div>
        )}

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {result && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {result.created} fenêtre{result.created > 1 ? 's' : ''} créée{result.created > 1 ? 's' : ''}
            {result.skipped > 0 && ` · ${result.skipped} ignorée${result.skipped > 1 ? 's' : ''} (chevauchement)`}
          </p>
        )}

        <Button type="submit" disabled={isPending || !timeValid}>
          {isPending ? 'Création…' : `Créer ${previewDates.length} fenêtre${previewDates.length > 1 ? 's' : ''}`}
        </Button>
      </form>
    </div>
  );
}
