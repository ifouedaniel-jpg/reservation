'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { markNotificationSentAction } from '@/server/actions/notifications';

type Props = {
  notificationId: string;
  bookingId: string;
  channel: string;
  link?: string;
  message?: string;
};

export default function NotificationActions({
  notificationId,
  bookingId,
  channel,
  link,
  message,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-xs font-medium text-green-700">✓ Envoyé</span>;
  }

  const channelLabel =
    channel === 'WHATSAPP' ? 'WhatsApp' : channel === 'INSTAGRAM' ? 'Instagram' : channel;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="xs">
            Ouvrir {channelLabel} →
          </Button>
        </a>
      )}
      {message && <CopyButton text={message} />}
      <Button
        variant="ghost"
        size="xs"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await markNotificationSentAction(notificationId, bookingId);
            setDone(true);
          });
        }}
      >
        Marquer comme envoyé
      </Button>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? 'Copié !' : 'Copier le message'}
    </Button>
  );
}
