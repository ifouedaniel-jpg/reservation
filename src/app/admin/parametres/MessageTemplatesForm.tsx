'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updateMessageTemplates } from '@/server/actions/settings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const VARIABLES = ['{prenom}', '{service}', '{date}', '{prix}', '{adresse}'];

type Props = {
  confirmed: string;
  rejected: string;
  cancelled: string;
};

type Key = 'confirmed' | 'rejected' | 'cancelled';

const LABELS: Record<Key, string> = {
  confirmed: 'Réservation confirmée ✓',
  rejected: 'Demande refusée',
  cancelled: 'Réservation annulée',
};

function TemplateTextarea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 resize-y font-mono"
      />
    </div>
  );
}

export default function MessageTemplatesForm({ confirmed, rejected, cancelled }: Props) {
  const [values, setValues] = useState({ confirmed, rejected, cancelled });
  const [isSaving, setIsSaving] = useState(false);

  function set(key: Key) {
    return (v: string) => setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateMessageTemplates(values);
      if (!result.ok) toast.error(result.error);
      else toast.success('Templates enregistrés');
    } catch {
      toast.error('Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Variables disponibles :{' '}
        {VARIABLES.map((v) => (
          <code key={v} className="mx-0.5 rounded bg-muted px-1 py-0.5">{v}</code>
        ))}
      </div>

      {(['confirmed', 'rejected', 'cancelled'] as Key[]).map((key) => (
        <TemplateTextarea
          key={key}
          id={key}
          label={LABELS[key]}
          value={values[key]}
          onChange={set(key)}
        />
      ))}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
