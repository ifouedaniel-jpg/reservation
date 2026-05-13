'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updatePaypalLink } from '@/server/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PaypalLinkForm({ currentLink }: { currentLink: string }) {
  const [value, setValue] = useState(currentLink);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await updatePaypalLink({ paypalLink: value });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success('Lien PayPal enregistré');
      }
    } catch {
      toast.error('Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="paypalLink">URL PayPal</Label>
        <Input
          id="paypalLink"
          type="url"
          placeholder="https://paypal.me/votrenom"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Laisser vide pour désactiver la redirection.
        </p>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setValue('')}
            disabled={isSaving}
          >
            Supprimer le lien
          </Button>
        )}
      </div>
    </form>
  );
}
