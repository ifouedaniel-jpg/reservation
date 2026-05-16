'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updateBookingInfos } from '@/server/actions/settings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Props = {
  acompte: string;
  cheveux: string;
};

function InfoTextarea({
  id, label, description, value, onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <textarea
        id={id}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 resize-y"
      />
    </div>
  );
}

export default function BookingInfoForm({ acompte, cheveux }: Props) {
  const [values, setValues] = useState({ acompte, cheveux });
  const [isSaving, setIsSaving] = useState(false);

  function set(key: keyof typeof values) {
    return (v: string) => setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateBookingInfos(values);
      if (!result.ok) toast.error(result.error);
      else toast.success('Informations enregistrées');
    } catch {
      toast.error('Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <InfoTextarea
        id="acompte"
        label="Acompte & Confirmation"
        description="Une puce par ligne. Affiché en haut du tunnel de réservation."
        value={values.acompte}
        onChange={set('acompte')}
      />
      <InfoTextarea
        id="cheveux"
        label="État des cheveux & retard"
        description="Une puce par ligne. Affiché juste avant le bouton Valider."
        value={values.cheveux}
        onChange={set('cheveux')}
      />
      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
