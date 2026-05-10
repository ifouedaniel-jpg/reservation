'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toggleSlotStatus, deleteSlot, updateSlot } from '@/server/actions/slots';

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Libre',
  CLOSED: 'Fermé',
  PENDING: 'En attente',
  BOOKED: 'Réservé',
};

type Props = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  dateStr: string;
};

export function SlotRow({ id, startTime, endTime, status, dateStr }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view');
  const [editStart, setEditStart] = useState(startTime);
  const [editEnd, setEditEnd] = useState(endTime);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isToggleable = status === 'OPEN' || status === 'CLOSED';
  const isEditable = status === 'OPEN' || status === 'CLOSED';

  function handleToggle() {
    startTransition(async () => {
      await toggleSlotStatus(id);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSlot(id);
      if (!result.ok) setError(result.error);
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateSlot(id, dateStr, editStart, editEnd);
      if (result.ok) {
        setMode('view');
      } else {
        setError(result.error);
      }
    });
  }

  if (mode === 'edit') {
    return (
      <tr className="border-b last:border-0 bg-muted/20">
        <td className="px-4 py-2">
          <Input
            type="time"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            className="w-32 h-8 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <Input
            type="time"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
            className="w-32 h-8 text-sm"
          />
        </td>
        <td className="px-4 py-2" colSpan={2}>
          <div className="flex flex-wrap items-center gap-2">
            {error && <span className="text-xs text-destructive">{error}</span>}
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setMode('view'); setError(null); }}
              disabled={isPending}
            >
              Annuler
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  if (mode === 'confirm-delete') {
    return (
      <tr className="border-b last:border-0 bg-destructive/5">
        <td className="px-4 py-3 font-medium tabular-nums">{startTime}</td>
        <td className="px-4 py-3 tabular-nums text-muted-foreground">{endTime}</td>
        <td className="px-4 py-3 text-sm text-destructive" colSpan={2}>
          <div className="flex flex-wrap items-center gap-2">
            {error && <span className="text-xs text-destructive mr-2">{error}</span>}
            <span>Supprimer ce créneau ?</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? 'Suppression…' : 'Confirmer'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setMode('view'); setError(null); }}
              disabled={isPending}
            >
              Annuler
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3 font-medium tabular-nums">{startTime}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{endTime}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {STATUS_LABEL[status] ?? status}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          {isToggleable && (
            <Switch
              checked={status === 'OPEN'}
              disabled={isPending}
              onCheckedChange={handleToggle}
            />
          )}
          {isEditable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setMode('edit'); setError(null); }}
              disabled={isPending}
            >
              Modifier
            </Button>
          )}
          {isEditable && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { setMode('confirm-delete'); setError(null); }}
              disabled={isPending}
            >
              Supprimer
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
