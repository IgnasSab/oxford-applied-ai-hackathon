import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import themePlugin from '@fullcalendar/react/themes/monarch';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/monarch/theme.css';
import '@fullcalendar/react/themes/monarch/palettes/purple.css';
import { CalendarDays, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { conflicts, dateLabel, timeLabel } from './api';
import { Button, Empty, ErrorMessage, Heading } from './components';

const plugins = [themePlugin, timeGridPlugin];
const toolbar = { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' };
const timeFormat = { hour: '2-digit', minute: '2-digit', hour12: false };

export default function Schedule({ matches, bookings, onSelect, onBook }) {
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAvailable, setShowAvailable] = useState(true);
  const [initialView] = useState(() => window.matchMedia('(max-width: 650px)').matches ? 'timeGridDay' : 'timeGridWeek');
  const entries = useMemo(() => [
    ...bookings.map((booking) => ({ ...booking, calendar_id: `booking-${booking.id}`, available: false, status: 'Confirmed' })),
    ...matches.filter((study) => study.status === 'eligible' && !study.booked).flatMap((study) => study.slots.map((slot) => ({ ...slot, calendar_id: `slot-${slot.id}`, study_id: study.id, title: study.title, duration: study.duration, location: study.location, available: true, status: slot.remaining === 0 ? 'Full' : conflicts(slot, study.duration, bookings) ? 'Schedule conflict' : 'Available' }))),
  ].sort((first, second) => new Date(first.starts_at) - new Date(second.starts_at)), [matches, bookings]);
  const [initialDate] = useState(() => {
    const now = new Date();
    const nextEntry = entries.find((entry) => new Date(entry.starts_at) >= now);
    return nextEntry ? nextEntry.starts_at : now.toISOString();
  });
  const events = useMemo(() => entries.filter((entry) => showAvailable || !entry.available).map((entry) => ({
    id: entry.calendar_id,
    title: entry.title,
    start: entry.starts_at,
    end: new Date(new Date(entry.starts_at).getTime() + entry.duration * 60000).toISOString(),
    color: entry.available ? '#e5e7eb' : '#d8eee2',
    contrastColor: entry.available ? '#414650' : '#205f43',
    extendedProps: { status: entry.status },
  })), [entries, showAvailable]);
  const selected = entries.find((entry) => entry.calendar_id === selectedId);
  const upcoming = entries.filter((entry) => !entry.available && new Date(entry.starts_at) >= new Date());
  async function book() {
    setBusy(true); setError('');
    try { await onBook(selected.id); setSelectedId(null); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="page calendar-page">
    <Heading title="My schedule" />
    <div className="schedule-toolbar"><div className="calendar-legend"><span><i className="confirmed-swatch" />Confirmed</span><span><i className="available-swatch" />Available</span><span>Europe/London</span></div><label className="check"><input type="checkbox" checked={showAvailable} onChange={(event) => setShowAvailable(event.target.checked)} />Show available sessions</label></div>
    {selected && <section className="calendar-selection" aria-label="Selected session"><div><span className={`status ${selected.available ? '' : 'success'}`}>{!selected.available && <CheckCircle2 size={13} />}{selected.status}</span><h2>{selected.title}</h2><p>{dateLabel(selected.starts_at)} · {timeLabel(selected.starts_at)} · {selected.duration} min · {selected.location}</p><ErrorMessage message={error} /></div><div className="calendar-selection-actions">{matches.some((study) => study.id === selected.study_id) && <Button secondary onClick={() => onSelect(selected.study_id)}>Study details</Button>}{selected.available && <Button disabled={busy || selected.status !== 'Available'} onClick={book}>{busy ? 'Booking…' : 'Confirm booking'}</Button>}<button className="icon-button" aria-label="Close session details" onClick={() => { setSelectedId(null); setError(''); }}><X size={17} /></button></div></section>}
    <div className="schedule-layout"><div><div className="study-calendar"><FullCalendar
      plugins={plugins} initialView={initialView} initialDate={initialDate} timeZone="Europe/London" firstDay={1}
      headerToolbar={toolbar} buttonText={{ today: 'Today', week: 'Week', day: 'Day' }}
      events={events} eventClick={({ event }) => { setSelectedId(event.id); setError(''); }}
      eventContent={({ event, timeText }) => <div className="calendar-event-copy" title={`${event.title} · ${timeText} · ${event.extendedProps.status}`}><strong>{event.title}</strong><span>{timeText}</span></div>}
      eventClass="study-calendar-event" toolbarClass="calendar-controls" toolbarTitleClass="calendar-title"
      slotLaneClass="calendar-time-row" dayHeaderClass="calendar-day-heading"
      dayHeaderFormat={{ weekday: 'short', day: 'numeric' }} eventTimeFormat={timeFormat}
      slotHeaderFormat={timeFormat} allDaySlot={false} nowIndicator editable={false} eventInteractive
      scrollTime="08:00:00" slotDuration="00:30:00" height="max(500px, calc(100dvh - 220px))"
    /></div>
    <p className="small-note calendar-note">Select a grey session to review and confirm. Only studies you’re eligible for appear.</p></div>
    <section className="upcoming-bookings" aria-label="Upcoming bookings"><h2>Upcoming bookings</h2>{upcoming.length ? upcoming.map((booking) => <article className="upcoming-booking" key={booking.id}><time dateTime={booking.starts_at}>{dateLabel(booking.starts_at)} · {timeLabel(booking.starts_at)}</time><h3>{booking.title}</h3><p>{booking.duration} min · {booking.location}</p><button className="text-button" onClick={() => { setSelectedId(booking.calendar_id); setError(''); }}>View booking<ChevronRight size={14} /></button>{matches.some((study) => study.id === booking.study_id) && <button className="text-button" onClick={() => onSelect(booking.study_id)}>Study details<ChevronRight size={14} /></button>}</article>) : <Empty icon={CalendarDays} title="No upcoming bookings">Confirmed sessions will appear here.</Empty>}</section></div>
  </div>;
}
