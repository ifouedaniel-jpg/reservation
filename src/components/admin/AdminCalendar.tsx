'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import type { EventClickArg, EventSourceFuncArg, EventInput, DatesSetArg } from '@fullcalendar/core';
import { Button } from '@/components/ui/button';

function makeFetcher(url: string) {
  return function (
    fetchInfo: EventSourceFuncArg,
    successCallback: (events: EventInput[]) => void,
    failureCallback: (error: Error) => void,
  ) {
    const params = new URLSearchParams({ start: fetchInfo.startStr, end: fetchInfo.endStr });
    fetch(`${url}?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur de chargement');
        return res.json() as Promise<EventInput[]>;
      })
      .then(successCallback)
      .catch(failureCallback);
  };
}

export default function AdminCalendar() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [title, setTitle] = useState('');

  function handleDatesSet(arg: DatesSetArg) {
    setTitle(arg.view.title);
  }

  function prev() { calendarRef.current?.getApi().prev(); }
  function next() { calendarRef.current?.getApi().next(); }
  function today() { calendarRef.current?.getApi().today(); }

  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault();
    const { bookingId, type, date } = arg.event.extendedProps as {
      bookingId?: string;
      type?: string;
      date?: string;
    };
    if (type === 'slot' && date) {
      router.push(`/admin/disponibilites?date=${date}`);
    } else if (bookingId) {
      router.push(`/admin/reservations/${bookingId}`);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar custom */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prev} aria-label="Mois précédent">
            ←
          </Button>
          <span className="min-w-36 text-center text-base font-semibold capitalize">
            {title}
          </span>
          <Button variant="outline" size="icon" onClick={next} aria-label="Mois suivant">
            →
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={today}>
          Aujourd&apos;hui
        </Button>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded-sm bg-[#22c55e]" />
          Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded-sm bg-[#d1d5db]" />
          Fermé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded-sm bg-[#f97316]" />
          Réservé (en attente)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded-sm bg-[#ef4444]" />
          Réservé (confirmé)
        </span>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={frLocale}
        firstDay={1}
        headerToolbar={false}
        datesSet={handleDatesSet}
        eventSources={[
          { events: makeFetcher('/api/admin/slots/calendar') },
          { events: makeFetcher('/api/admin/bookings/calendar') },
        ]}
        eventClick={handleEventClick}
        views={{ dayGridMonth: { displayEventEnd: true } }}
        height="auto"
      />
    </div>
  );
}
