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
import { anonymizeBookingAction } from '@/server/actions/booking';

type Props = { bookingId: string };

export default function AnonymizeButton({ bookingId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending} className="text-muted-foreground">
            Anonymiser cette cliente
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Anonymiser les données ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les informations personnelles (nom, téléphone, email, Instagram, notes)
              seront remplacées par <code>[supprimé]</code>. Cette action est{' '}
              <strong>irréversible</strong>. L&apos;historique de réservation
              (prestation, date, tarif) est conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  setError(null);
                  const result = await anonymizeBookingAction(bookingId);
                  if (!result.ok) {
                    setError(result.error ?? 'Une erreur est survenue.');
                  } else {
                    router.refresh();
                  }
                });
              }}
            >
              Confirmer l&apos;anonymisation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
