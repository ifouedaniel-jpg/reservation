import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { formatParis } from '@/lib/time';
import type { BookingSnapshot } from '../messages';

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Votre salon';
const businessAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? 'notre salon';

const s = {
  body: { backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif', margin: '0', padding: '24px 0' },
  container: { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '560px', borderRadius: '8px', overflow: 'hidden' as const },
  header: { backgroundColor: '#1a1a1a', padding: '20px 32px' },
  brandName: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold', margin: '0' },
  content: { padding: '32px' },
  h1: { color: '#1a1a1a', fontSize: '20px', fontWeight: 'bold', marginTop: '0', marginBottom: '8px' },
  p: { color: '#374151', fontSize: '15px', lineHeight: '1.6', margin: '12px 0' },
  box: { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px 20px', margin: '24px 0', border: '1px solid #bbf7d0' },
  row: { color: '#374151', fontSize: '14px', margin: '6px 0' },
  label: { fontWeight: 'bold', color: '#1a1a1a' },
  link: { color: '#1a1a1a' },
  footer: { color: '#9ca3af', fontSize: '12px', textAlign: 'center' as const, margin: '0' },
  hr: { borderColor: '#e5e7eb', margin: '0' },
};

function fmtDate(date: Date) {
  return formatParis(date, "EEEE d MMMM yyyy 'à' HH'h'mm");
}

function fmtPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default function BookingConfirmed({ booking }: { booking: BookingSnapshot }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const trackingUrl = `${siteUrl}/ma-reservation/${booking.publicCode}`;

  return (
    <Html lang="fr">
      <Head />
      <Preview>Votre rendez-vous est confirmé ✓</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.header}>
            <Text style={s.brandName}>{businessName}</Text>
          </Section>

          <Section style={s.content}>
            <Text style={s.h1}>Rendez-vous confirmé ✓</Text>
            <Text style={s.p}>Bonjour {booking.customerFirstName},</Text>
            <Text style={s.p}>
              Votre réservation pour <strong>{booking.service.name}</strong> est confirmée.
              Nous avons hâte de vous accueillir !
            </Text>

            <Section style={s.box}>
              <Text style={s.row}>
                <span style={s.label}>Prestation :</span> {booking.service.name}
              </Text>
              <Text style={s.row}>
                <span style={s.label}>Date :</span>{' '}
                <span style={{ textTransform: 'capitalize' }}>{fmtDate(booking.timeSlot.startsAt)}</span>
              </Text>
              <Text style={s.row}>
                <span style={s.label}>Durée :</span> {booking.service.durationMinutes} min
              </Text>
              <Text style={s.row}>
                <span style={s.label}>Lieu :</span> {businessAddress}
              </Text>
              <Text style={s.row}>
                <span style={s.label}>Tarif :</span> {fmtPrice(booking.priceCentsAtBooking)}{' '}
                <span style={{ color: '#6b7280' }}>(règlement sur place)</span>
              </Text>
            </Section>

            <Text style={s.p}>
              Suivi de réservation :{' '}
              <a href={trackingUrl} style={s.link}>{trackingUrl}</a>
            </Text>
          </Section>

          <Hr style={s.hr} />
          <Section style={{ padding: '16px 32px' }}>
            <Text style={s.footer}>{businessName}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
