'use client';

import { useState, useMemo, useTransition } from 'react';
import { addDays, nextDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createManualSlot, createBulkSlots } from '@/server/actions/slots';

type Mode = 'unitaire' | 'consecutive' | 'recurrence';

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

function nextOccurrences(startDate: string, dayOfWeek: number, count: number): string[] {
  const start = new Date(startDate + 'T12:00:00');
  const dow = dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  let current = start.getDay() === dayOfWeek ? start : nextDay(start, dow);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 7);
  }
  return dates;
}

function consecutiveDates(startDate: string, count: number): string[] {
  const start = new Date(startDate + 'T12:00:00');
  return Array.from({ length: count }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
}

function formatDateLabel(dateStr: string): string {
  return format(new Date(dateStr + 'T12:00:00'), 'EEEE dd MMMM yyyy', { locale: fr });
}

type Props = {
  onCreated?: () => void;
};

export function AvailabilityModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('unitaire');

  // Unitaire
  const [unitDate, setUnitDate] = useState(todayStr());
  const [unitStart, setUnitStart] = useState('09:00');
  const [unitEnd, setUnitEnd] = useState('18:00');
  const [unitError, setUnitError] = useState<string | null>(null);
  const [unitSuccess, setUnitSuccess] = useState(false);
  const [unitPending, startUnitTransition] = useTransition();

  // Bloc
  const [startDate, setStartDate] = useState(tomorrowStr());
  const [count, setCount] = useState(3);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [bulkStart, setBulkStart] = useState('09:00');
  const [bulkEnd, setBulkEnd] = useState('18:00');
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkPending, startBulkTransition] = useTransition();

  const unitTimeValid = unitStart < unitEnd;
  const bulkTimeValid = bulkStart < bulkEnd;

  const previewDates = useMemo(() => {
    const n = Math.min(Math.max(count, 1), 30);
    if (mode === 'consecutive') return consecutiveDates(startDate, n);
    if (mode === 'recurrence') return nextOccurrences(startDate, dayOfWeek, n);
    return [];
  }, [mode, startDate, count, dayOfWeek]);

  function resetFeedback() {
    setUnitError(null);
    setUnitSuccess(false);
    setBulkResult(null);
    setBulkError(null);
  }

  function handleUnitSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitTimeValid) return;
    resetFeedback();
    const fd = new FormData();
    fd.set('date', unitDate);
    fd.set('startTime', unitStart);
    fd.set('endTime', unitEnd);
    startUnitTransition(async () => {
      const res = await createManualSlot(null, fd);
      if (res.ok) {
        setUnitSuccess(true);
        onCreated?.();
      } else {
        setUnitError(res.error);
      }
    });
  }

  function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkTimeValid) return;
    resetFeedback();
    const slots = previewDates.map((date) => ({ date, startTime: bulkStart, endTime: bulkEnd }));
    startBulkTransition(async () => {
      const res = await createBulkSlots(slots);
      if (res.ok) {
        setBulkResult({ created: res.created, skipped: res.skipped });
        onCreated?.();
      } else {
        setBulkError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetFeedback(); }}>
      <DialogTrigger asChild>
        <Button size="sm">+ Disponibilité</Button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>Ajouter des disponibilités</DialogTitle>
        </DialogHeader>

        {/* Sélecteur de mode */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'unitaire', label: 'Jour unique' },
            { key: 'consecutive', label: 'Jours consécutifs' },
            { key: 'recurrence', label: 'Récurrence hebdo' },
          ] as { key: Mode; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMode(key); resetFeedback(); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === key
                  ? 'bg-primary text-primary-foreground'
                  : 'border text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Mode unitaire ── */}
        {mode === 'unitaire' && (
          <form onSubmit={handleUnitSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit-date">Date</Label>
                <Input
                  id="unit-date"
                  type="date"
                  value={unitDate}
                  min={todayStr()}
                  onChange={(e) => setUnitDate(e.target.value)}
                  className="w-full sm:w-44"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit-start">Début</Label>
                <Input id="unit-start" type="time" value={unitStart}
                  onChange={(e) => setUnitStart(e.target.value)} className="w-full sm:w-32" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit-end">Fin</Label>
                <Input id="unit-end" type="time" value={unitEnd}
                  onChange={(e) => setUnitEnd(e.target.value)} className="w-full sm:w-32" required />
              </div>
            </div>
            {!unitTimeValid && <p className="text-sm text-destructive">La fin doit être après le début.</p>}
            {unitError && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{unitError}</p>}
            {unitSuccess && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Fenêtre créée avec succès.</p>}
            <Button type="submit" disabled={unitPending || !unitTimeValid}>
              {unitPending ? 'Création…' : 'Créer'}
            </Button>
          </form>
        )}

        {/* ── Mode bloc ── */}
        {(mode === 'consecutive' || mode === 'recurrence') && (
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-date">À partir du</Label>
                <Input
                  id="bulk-date"
                  type="date"
                  value={startDate}
                  min={todayStr()}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-44"
                  required
                />
              </div>

              {mode === 'recurrence' && (
                <div className="space-y-1.5">
                  <Label htmlFor="bulk-dow">Jour</Label>
                  <select
                    id="bulk-dow"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="bulk-count">
                  {mode === 'consecutive' ? 'Nb de jours' : 'Nb de semaines'}
                </Label>
                <Input
                  id="bulk-count"
                  type="number"
                  min={1}
                  max={30}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full sm:w-24"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bulk-start">Début</Label>
                <Input id="bulk-start" type="time" value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)} className="w-full sm:w-32" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-end">Fin</Label>
                <Input id="bulk-end" type="time" value={bulkEnd}
                  onChange={(e) => setBulkEnd(e.target.value)} className="w-full sm:w-32" required />
              </div>
            </div>

            {!bulkTimeValid && <p className="text-sm text-destructive">La fin doit être après le début.</p>}

            {previewDates.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {previewDates.length} fenêtre{previewDates.length > 1 ? 's' : ''} · {bulkStart}–{bulkEnd}
                </p>
                <ul className="space-y-0.5 text-sm">
                  {previewDates.slice(0, 8).map((d) => (
                    <li key={d} className="capitalize text-muted-foreground">{formatDateLabel(d)}</li>
                  ))}
                  {previewDates.length > 8 && (
                    <li className="text-muted-foreground">… et {previewDates.length - 8} de plus</li>
                  )}
                </ul>
              </div>
            )}

            {bulkError && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{bulkError}</p>}
            {bulkResult && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                {bulkResult.created} fenêtre{bulkResult.created > 1 ? 's' : ''} créée{bulkResult.created > 1 ? 's' : ''}
                {bulkResult.skipped > 0 && ` · ${bulkResult.skipped} ignorée${bulkResult.skipped > 1 ? 's' : ''} (chevauchement)`}
              </p>
            )}

            <Button type="submit" disabled={bulkPending || !bulkTimeValid || previewDates.length === 0}>
              {bulkPending ? 'Création…' : `Créer ${previewDates.length} fenêtre${previewDates.length > 1 ? 's' : ''}`}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
