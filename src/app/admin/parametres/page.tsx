import { requireAdmin } from '@/lib/auth';
import { getPaypalLink, getBookingInfos } from '@/server/actions/settings';
import PaypalLinkForm from './PaypalLinkForm';
import BookingInfoForm from './BookingInfoForm';

export const metadata = { title: 'Paramètres — Admin' };

export default async function ParametresPage() {
  await requireAdmin();
  const [paypalLink, bookingInfos] = await Promise.all([
    getPaypalLink(),
    getBookingInfos(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Paramètres</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

        <section className="rounded-xl border p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-medium">Informations affichées dans le tunnel de réservation</h2>
            <p className="text-sm text-muted-foreground">
              Ces textes sont affichés aux clientes lors de la prise de rendez-vous.
              Saisissez une puce par ligne.
            </p>
          </div>
          <BookingInfoForm
            acompte={bookingInfos.acompte}
            cheveux={bookingInfos.cheveux}
          />
        </section>
      </div>
    </div>
  );
}
