'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  confirmBookingAction,
  rejectBookingAction,
  cancelBookingAction,
  markCompletedAction,
  markNoShowAction,
} from '@/server/actions/booking';

type ActionResult = { ok: boolean; error?: string };
type Props = { bookingId: string; status: string };

export default function BookingActions({ bookingId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'Une erreur est survenue.');
      } else {
        router.refresh();
      }
    });
  }

  if (status === 'PENDING') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <ConfirmDialog
          title="Valider la réservation ?"
          description="La cliente recevra une confirmation via son canal de contact."
          actionLabel="Valider"
          onConfirm={() => handle(() => confirmBookingAction(bookingId))}
          disabled={isPending}
        >
          <Button size="sm" disabled={isPending}>Valider</Button>
        </ConfirmDialog>

        <ConfirmDialog
          title="Refuser la réservation ?"
          description="Le créneau sera à nouveau disponible pour d'autres clientes."
          actionLabel="Refuser"
          actionVariant="destructive"
          onConfirm={() => handle(() => rejectBookingAction(bookingId))}
          disabled={isPending}
        >
          <Button variant="destructive" size="sm" disabled={isPending}>Refuser</Button>
        </ConfirmDialog>
      </div>
    );
  }

  if (status === 'CONFIRMED') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <ConfirmDialog
          title="Marquer comme terminé ?"
          description="Le rendez-vous sera enregistré comme honoré."
          actionLabel="Confirmer"
          onConfirm={() => handle(() => markCompletedAction(bookingId))}
          disabled={isPending}
        >
          <Button variant="secondary" size="sm" disabled={isPending}>Honoré</Button>
        </ConfirmDialog>

        <ConfirmDialog
          title="Marquer comme no-show ?"
          description="La cliente ne s'est pas présentée au rendez-vous."
          actionLabel="Confirmer"
          actionVariant="destructive"
          onConfirm={() => handle(() => markNoShowAction(bookingId))}
          disabled={isPending}
        >
          <Button variant="outline" size="sm" disabled={isPending}>No-show</Button>
        </ConfirmDialog>

        <ConfirmDialog
          title="Annuler le rendez-vous ?"
          description="Le créneau sera remis à disposition."
          actionLabel="Confirmer l'annulation"
          actionVariant="destructive"
          onConfirm={() => handle(() => cancelBookingAction(bookingId))}
          disabled={isPending}
        >
          <Button variant="outline" size="sm" disabled={isPending}>Annuler</Button>
        </ConfirmDialog>
      </div>
    );
  }

  return null;
}

// ── Sous-composant ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  description,
  actionLabel,
  actionVariant = 'default',
  onConfirm,
  disabled,
  children,
}: {
  title: string;
  description?: string;
  actionLabel: string;
  actionVariant?: 'default' | 'destructive';
  onConfirm: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>Annuler</AlertDialogCancel>
          <AlertDialogAction variant={actionVariant} onClick={onConfirm} disabled={disabled}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
