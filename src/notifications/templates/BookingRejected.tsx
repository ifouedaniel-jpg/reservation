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

const s = {
  body: { backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif', margin: '0', padding: '24px 0' },
  container: { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '560px', borderRadius: '8px', overflow: 'hidden' as const },
  header: { backgroundColor: '#1a1a1a', padding: '20px 32px' },
  brandName: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold', margin: '0' },
  content: { padding: '32px' },
  h1: { color: '#1a1a1a', fontSize: '20px', fontWeight: 'bold', marginTop: '0', marginBottom: '8px' },
  p: { color: '#374151', fontSize: '15px', lineHeight: '1.6', margin: '12px 0' },
  link: { color: '#1a1a1a', fontWeight: 'bold' },
  footer: { color: '#9ca3af', fontSize: '12px', textAlign: 'center' as const, margin: '0' },
  hr: { borderColor: '#e5e7eb', margin: '0' },
};

function fmtDate(date: Date) {
  return formatParis(date, "EEEE d MMMM yyyy 'à' HH'h'mm");
}

export default function BookingRejected({ booking }: { booking: BookingSnapshot }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const servicesUrl = `${siteUrl}/prestations`;

  return (
    <Html lang="fr">
      <Head />
      <Preview>Votre demande n&apos;a pas pu être confirmée</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.header}>
            <Text style={s.brandName}>{businessName}</Text>
          </Section>

          <Section style={s.content}>
            <Text style={s.h1}>Demande non confirmée</Text>
            <Text style={s.p}>Bonjour {booking.customerFirstName},</Text>
            <Text style={s.p}>
              Nous n&apos;avons malheureusement pas pu confirmer votre demande
              pour <strong>{booking.service.name}</strong> le{' '}
              <span style={{ textTransform: 'capitalize' }}>{fmtDate(booking.timeSlot.startsAt)}</span>.
            </Text>
            <Text style={s.p}>
              N&apos;hésitez pas à choisir un autre créneau sur notre site :{' '}
              <a href={servicesUrl} style={s.link}>{servicesUrl}</a>
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
