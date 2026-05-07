'use client';

import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import type { EventClickArg, EventSourceFuncArg, EventInput } from '@fullcalendar/core';

function fetchEvents(
  fetchInfo: EventSourceFuncArg,
  successCallback: (events: EventInput[]) => void,
  failureCallback: (error: Error) => void
) {
  const params = new URLSearchParams({
    start: fetchInfo.startStr,
    end: fetchInfo.endStr,
  });
  fetch(`/api/admin/bookings/calendar?${params}`)
    .then((res) => {
      if (!res.ok) throw new Error('Erreur de chargement');
      return res.json() as Promise<EventInput[]>;
    })
    .then(successCallback)
    .catch(failureCallback);
}

export default function AdminCalendar() {
  const router = useRouter();

  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault();
    const bookingId = arg.event.extendedProps.bookingId as string;
    if (bookingId) {
      router.push(`/admin/reservations/${bookingId}`);
    }
  }

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      locale={frLocale}
      firstDay={1}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      events={fetchEvents}
      eventClick={handleEventClick}
      height="auto"
      slotMinTime="08:00:00"
      slotMaxTime="20:00:00"
    />
  );
}
