import { requireAdmin } from '@/lib/auth';
import { getPaypalLink, getBookingInfos, getMessageTemplates } from '@/server/actions/settings';
import PaypalLinkForm from './PaypalLinkForm';
import BookingInfoForm from './BookingInfoForm';
import MessageTemplatesForm from './MessageTemplatesForm';

export const metadata = { title: 'Paramètres — Admin' };

export default async function ParametresPage() {
  await requireAdmin();
  const [paypalLink, bookingInfos, templates] = await Promise.all([
    getPaypalLink(),
    getBookingInfos(),
    getMessageTemplates(),
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

      <section className="rounded-xl border p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-medium">Messages WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Templates envoyés automatiquement lors des changements de statut de réservation.
          </p>
        </div>
        <MessageTemplatesForm
          confirmed={templates.confirmed}
          rejected={templates.rejected}
          cancelled={templates.cancelled}
        />
      </section>
    </div>
  );
}
