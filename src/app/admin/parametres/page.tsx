import { requireAdmin } from '@/lib/auth';
import { getPaypalLink } from '@/server/actions/settings';
import PaypalLinkForm from './PaypalLinkForm';

export const metadata = { title: 'Paramètres — Admin' };

export default async function ParametresPage() {
  await requireAdmin();
  const paypalLink = await getPaypalLink();

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-semibold">Paramètres</h1>

      <section className="rounded-xl border p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-medium">Lien de paiement PayPal</h2>
          <p className="text-sm text-muted-foreground">
            Si renseigné, les clientes seront automatiquement redirigées vers ce
            lien après avoir soumis leur demande de réservation.
          </p>
        </div>
        <PaypalLinkForm currentLink={paypalLink ?? ''} />
      </section>
    </div>
  );
}
