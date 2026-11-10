import React, { useMemo, useState } from 'react';
import { Calendar, Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeDefaultEventTime() {
  const soon = new Date(Date.now() + 15 * 60 * 1000);
  return `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`;
}

export default function AgendaCalendar({ events = [], onAddEvent, onDeleteEvent }) {
  const [viewMode, setViewMode] = useState('Day');
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [isAdding, setIsAdding] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState(makeDefaultEventTime);

  const todayKey = toLocalDateKey(new Date());
  const selectedDateObject = new Date(`${selectedDate}T12:00:00`);
  const monthTitle = selectedDateObject.toLocaleDateString('tr-TR', { month: 'long' });
  const monthYear = selectedDateObject.getFullYear();

  const weekDays = useMemo(() => {
    const start = new Date(selectedDateObject);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const monthStart = new Date(selectedDateObject.getFullYear(), selectedDateObject.getMonth(), 1, 12);
    const offset = (monthStart.getDay() + 6) % 7;
    const daysInMonth = new Date(selectedDateObject.getFullYear(), selectedDateObject.getMonth() + 1, 0).getDate();
    const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const date = new Date(monthStart);
      date.setDate(1 - offset + index);
      return date;
    });
  }, [selectedDate]);

  const eventDateKey = (event) => event?.date === 'Bugün' || !event?.date ? todayKey : String(event.date).slice(0, 10);
  const eventsForDate = events
    .filter((event) => eventDateKey(event) === selectedDate)
    .sort((a, b) => String(a?.time || '').localeCompare(String(b?.time || '')));

  const moveDate = (amount) => {
    const next = new Date(selectedDateObject);
    if (viewMode === 'Month') next.setMonth(next.getMonth() + amount, 1);
    else next.setDate(next.getDate() + amount);
    setSelectedDate(toLocalDateKey(next));
  };

  const addEvent = (event) => {
    event.preventDefault();
    const title = eventTitle.trim();
    if (!title || !eventTime) return;
    onAddEvent?.({ title, date: selectedDate, time: eventTime, notified: false });
    setEventTitle('');
    setIsAdding(false);
  };

  const hasEventsOn = (date) => events.some((event) => eventDateKey(event) === toLocalDateKey(date));

  return (
    <div className="agenda-tab-view">
      <div className="agenda-top-row">
        <div className="agenda-title-group">
          <span className="agenda-eyebrow">TAKVİM</span>
          <div className="agenda-month-heading">
            <h2>{monthTitle} <span className="clock-number-text">{monthYear}</span></h2>
            <button type="button" className="agenda-nav-btn" onClick={() => moveDate(-1)} aria-label="Önceki dönem"><ChevronLeft size={15} /></button>
            <button type="button" className="agenda-nav-btn" onClick={() => moveDate(1)} aria-label="Sonraki dönem"><ChevronRight size={15} /></button>
            <button type="button" className="agenda-today-btn" onClick={() => setSelectedDate(todayKey)}>Bugün</button>
          </div>
        </div>

        <div className="agenda-controls-right">
          <div className="agenda-day-month-pill">
            <button type="button" className={`dm-btn ${viewMode === 'Day' ? 'active' : ''}`} onClick={() => setViewMode('Day')} aria-pressed={viewMode === 'Day'}>Gün</button>
            <button type="button" className={`dm-btn ${viewMode === 'Month' ? 'active' : ''}`} onClick={() => setViewMode('Month')} aria-pressed={viewMode === 'Month'}>Ay</button>
          </div>
          <button
            type="button"
            className="agenda-plus-circle"
            onClick={() => {
              setEventTime(makeDefaultEventTime());
              setViewMode('Day');
              setIsAdding((value) => !value);
            }}
            title="Etkinlik ekle"
            aria-label="Etkinlik ekle"
          >
            {isAdding ? <X size={15} color="#fff" /> : <Plus size={16} strokeWidth={2.5} color="#eaf2f9" />}
          </button>
        </div>
      </div>

      {viewMode === 'Day' ? (
        <>
          <div className="agenda-week-strip">
            {weekDays.map((date) => {
              const key = toLocalDateKey(date);
              return (
                <button key={key} type="button" className={`agenda-date-cell ${key === selectedDate ? 'selected' : ''} ${key === todayKey ? 'today' : ''}`} onClick={() => setSelectedDate(key)} aria-pressed={key === selectedDate}>
                  <span>{date.toLocaleDateString('tr-TR', { weekday: 'short' }).replace('.', '')}</span>
                  <strong>{date.getDate()}</strong>
                  {hasEventsOn(date) && <i />}
                </button>
              );
            })}
          </div>
          {isAdding && (
            <form className="agenda-quick-add" onSubmit={addEvent}>
              <input autoFocus value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setIsAdding(false); }} placeholder="Etkinlik adı" aria-label="Etkinlik adı" />
              <input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} aria-label="Etkinlik saati" />
              <button type="submit" disabled={!eventTitle.trim()}><Check size={14} /> Ekle</button>
            </form>
          )}
          <div className="agenda-event-list">
            {eventsForDate.length ? eventsForDate.map((event, index) => (
              <div className="agenda-event-card" key={event.id || `${event.title}-${index}`}>
                <span className="agenda-event-time">{event.time || '09:00'}</span>
                <i className="agenda-event-accent" />
                <div><strong title={event.title || String(event)}>{event.title || event}</strong><small className={selectedDate === todayKey ? '' : 'clock-number-text'}>{selectedDate === todayKey ? 'Bugün' : selectedDateObject.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</small></div>
                <button type="button" className="agenda-event-delete" onClick={() => onDeleteEvent?.(event.id)} aria-label={`${event.title || 'Etkinlik'} etkinliğini sil`} title="Etkinliği sil"><Trash2 size={14} /></button>
              </div>
            )) : (
              <div className="agenda-empty-state">
                <span className="agenda-empty-icon"><Calendar size={19} strokeWidth={1.8} /></span>
                <span>Bu gün için etkinlik yok</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="agenda-month-grid" style={{ gridTemplateRows: `14px repeat(${monthDays.length / 7}, minmax(0, 1fr))` }}>
          {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map((day, index) => <span className="agenda-weekday-label" key={`${day}-${index}`}>{day}</span>)}
          {monthDays.map((date) => {
            const key = toLocalDateKey(date);
            return (
              <button key={key} type="button" className={`agenda-month-day ${date.getMonth() !== selectedDateObject.getMonth() ? 'outside' : ''} ${key === selectedDate ? 'selected' : ''} ${key === todayKey ? 'today' : ''}`} onClick={() => setSelectedDate(key)} aria-pressed={key === selectedDate}>
                {date.getDate()}{hasEventsOn(date) && <i />}
              </button>
            );
          })}
        </div>
      )}

      <div className="agenda-local-label">Takvim bu cihazda saklanır</div>
    </div>
  );
}
