import { FormEvent, useMemo, useState } from 'react'

type IconName = 'menu' | 'search' | 'plus' | 'calendar' | 'chevron' | 'close' | 'trash'

type CalendarEvent = {
  id: number
  title: string
  day: number
  start: string
  duration: number
  color: 'green' | 'red' | 'gold' | 'blue' | 'purple'
  category?: string
}

const DAYS = [
  { name: 'Mon', date: '03' },
  { name: 'Tue', date: '04' },
  { name: 'Wed', date: '05' },
  { name: 'Thur', date: '06' },
  { name: 'Fri', date: '07' },
  { name: 'Sat', date: '08', weekend: true },
  { name: 'Sun', date: '09', weekend: true },
]

const HOURS = Array.from({ length: 24 }, (_, index) => index)
const MINI_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const MINI_BLANKS = Array.from({ length: 5 }, (_, index) => `blank-${index}`)

const INITIAL_EVENTS: CalendarEvent[] = [
  { id: 1, title: 'Daily Standup', day: 0, start: '08:00', duration: 1, color: 'green', category: 'Today' },
  { id: 2, title: 'Budget Review', day: 0, start: '09:00', duration: 1, color: 'red', category: 'Today' },
  { id: 3, title: 'Sasha Jay 121', day: 0, start: '10:00', duration: 1, color: 'gold', category: 'Today' },
  { id: 4, title: 'Web Team Progress Update', day: 1, start: '11:00', duration: 1.25, color: 'green', category: 'Today' },
  { id: 5, title: 'Social team briefing', day: 1, start: '12:00', duration: 1, color: 'red', category: 'Today' },
  { id: 6, title: 'Tech Standup', day: 2, start: '14:00', duration: 1, color: 'purple', category: 'Tomorrow' },
  { id: 7, title: 'Developer Progress', day: 3, start: '15:00', duration: 1.5, color: 'blue', category: 'Tomorrow' },
]

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    trash: <><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14" /><path d="M10 11v6M14 11v6" /></>,
  }

  return (
    <svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">{paths[name]}</g>
    </svg>
  )
}

function minutesFromStart(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function MiniCalendar({ selectedDay, onSelect }: { selectedDay: number; onSelect: (day: number) => void }) {
  return (
    <div className="mini-calendar" aria-label="January 2022 mini calendar">
      <div className="mini-calendar__weekdays" aria-hidden="true">
        {['m', 't', 'w', 't', 'f', 's', 's'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="mini-calendar__days">
        {MINI_BLANKS.map((day) => <span key={day} />)}
        {MINI_DAYS.map((day) => (
          <button
            aria-label={`January ${day}, 2022`}
            aria-pressed={selectedDay === day}
            className={`mini-calendar__day${selectedDay === day ? ' mini-calendar__day--selected' : ''}`}
            key={day}
            onClick={() => onSelect(day)}
            type="button"
          >
            {String(day).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  )
}

function Sidebar({ events, isOpen, selectedDay, onClose, onSelectDay }: {
  events: CalendarEvent[]
  isOpen: boolean
  selectedDay: number
  onClose: () => void
  onSelectDay: (day: number) => void
}) {
  const groups = ['Today', 'Tomorrow']

  return (
    <>
      <button
        aria-label="Close sidebar"
        className={`calendar-app__backdrop${isOpen ? ' calendar-app__backdrop--visible' : ''}`}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <aside className={`calendar-sidebar${isOpen ? ' calendar-sidebar--open' : ''}`} aria-label="Calendar sidebar">
        <div className="calendar-sidebar__heading-row">
          <h2 className="calendar-sidebar__month">January</h2>
          <button aria-label="Close sidebar" className="icon-button calendar-sidebar__close" onClick={onClose} type="button">
            <Icon name="close" />
          </button>
        </div>
        <MiniCalendar selectedDay={selectedDay} onSelect={onSelectDay} />

        <section className="agenda" aria-labelledby="agenda-heading">
          <h2 className="agenda__title" id="agenda-heading">Upcoming events</h2>
          {events.length === 0 ? (
            <div className="agenda__empty" role="status">
              <span className="agenda__empty-icon" aria-hidden="true">🎉</span>
              <p>No upcoming events</p>
            </div>
          ) : (
            <div className="agenda__groups">
              {groups.map((group) => {
                const groupEvents = events.filter((event) => event.category === group)
                if (!groupEvents.length) return null
                return (
                  <div className="agenda__group" key={group}>
                    <h3 className="agenda__group-title">{group === 'Today' ? '🗓️' : '☕'} {group}</h3>
                    <ul className="agenda__list">
                      {groupEvents.map((event) => (
                        <li className="agenda__item" key={event.id}>
                          <span className={`agenda__dot agenda__dot--${event.color}`} />
                          <span className={`agenda__name agenda__name--${event.color}`}>{event.title}</span>
                          <time className="agenda__time">{event.start}</time>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              <div className="agenda__group">
                <h3 className="agenda__group-title">✈️ Vacations</h3>
                <div className="agenda__item">
                  <span className="agenda__dot agenda__dot--green" />
                  <span className="agenda__name agenda__name--green">Bahamas</span>
                  <time className="agenda__time">01-02 to 14-02</time>
                </div>
              </div>
            </div>
          )}
        </section>
      </aside>
    </>
  )
}

function WeekCalendar({ events, onSelectEvent }: { events: CalendarEvent[]; onSelectEvent: (event: CalendarEvent) => void }) {
  return (
    <div className="week-calendar">
      <div className="week-calendar__header">
        <div className="week-calendar__timezone">GMT+9</div>
        {DAYS.map((day, index) => (
          <div className={`week-calendar__day-heading${index === 1 ? ' week-calendar__day-heading--today' : ''}`} key={day.name}>
            <span>{day.name}</span>
            <strong>{day.date}</strong>
          </div>
        ))}
      </div>
      <div className="week-calendar__scroller">
        <div className="week-calendar__body">
          <div className="week-calendar__times" aria-hidden="true">
            {HOURS.map((hour) => (
              <div className="week-calendar__time" key={hour}>{String(hour).padStart(2, '0')}:00</div>
            ))}
          </div>
          <div className="week-calendar__days">
            {DAYS.map((day, dayIndex) => (
              <div className={`week-calendar__column${day.weekend ? ' week-calendar__column--weekend' : ''}`} key={day.name}>
                {events.filter((event) => event.day === dayIndex).map((event) => {
                  const top = minutesFromStart(event.start) / 60 * 72
                  const height = Math.max(event.duration * 72 - 5, 44)
                  return (
                    <button
                      className={`week-calendar__event week-calendar__event--${event.color}`}
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      style={{ top, height }}
                      type="button"
                    >
                      <strong>{event.title}</strong>
                      <span>{event.start}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            <div className="week-calendar__now" style={{ top: 9.5 * 72 }}><span /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EventDialog({ event, onClose, onDelete }: {
  event: CalendarEvent
  onClose: () => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="dialog-layer" role="presentation" onMouseDown={(eventTarget) => eventTarget.target === eventTarget.currentTarget && onClose()}>
      <section aria-labelledby="event-title" aria-modal="true" className="dialog" role="dialog">
        <div className="dialog__header">
          <span className={`dialog__accent dialog__accent--${event.color}`} />
          <button aria-label="Close event details" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
        </div>
        <h2 className="dialog__title" id="event-title">{event.title}</h2>
        <p className="dialog__meta">{DAYS[event.day].name}, January {Number(DAYS[event.day].date)} · {event.start}</p>
        <div className="dialog__actions">
          <button className="button button--danger" onClick={() => onDelete(event.id)} type="button"><Icon name="trash" /> Delete event</button>
          <button className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>
      </section>
    </div>
  )
}

function AddEventDialog({ onAdd, onClose }: { onAdd: (event: Omit<CalendarEvent, 'id'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(0)
  const [start, setStart] = useState('09:00')

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    if (!title.trim()) return
    onAdd({ title: title.trim(), day, start, duration: 1, color: 'blue', category: day < 2 ? 'Today' : 'Tomorrow' })
  }

  return (
    <div className="dialog-layer" role="presentation" onMouseDown={(eventTarget) => eventTarget.target === eventTarget.currentTarget && onClose()}>
      <section aria-labelledby="add-event-title" aria-modal="true" className="dialog" role="dialog">
        <div className="dialog__header">
          <span className="dialog__eyebrow">NEW EVENT</span>
          <button aria-label="Close add event dialog" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
        </div>
        <h2 className="dialog__title" id="add-event-title">Add event</h2>
        <form className="event-form" onSubmit={submit}>
          <label className="event-form__field">Event name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Team sync" /></label>
          <div className="event-form__row">
            <label className="event-form__field">Day<select value={day} onChange={(event) => setDay(Number(event.target.value))}>{DAYS.map((item, index) => <option key={item.name} value={index}>{item.name}, Jan {item.date}</option>)}</select></label>
            <label className="event-form__field">Time<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          </div>
          <div className="dialog__actions">
            <button className="button button--primary" type="submit"><Icon name="plus" /> Add event</button>
            <button className="button button--secondary" onClick={onClose} type="button">Cancel</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function App() {
  const [events, setEvents] = useState(INITIAL_EVENTS)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedDay, setSelectedDay] = useState(2)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [addingEvent, setAddingEvent] = useState(false)

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized ? events.filter((event) => event.title.toLowerCase().includes(normalized)) : events
  }, [events, query])

  const deleteEvent = (id: number) => {
    setEvents((current) => current.filter((event) => event.id !== id))
    setSelectedEvent(null)
  }

  const addEvent = (event: Omit<CalendarEvent, 'id'>) => {
    setEvents((current) => [...current, { ...event, id: Date.now() }])
    setAddingEvent(false)
  }

  return (
    <main className="calendar-page">
      <div className="calendar-app">
        <Sidebar
          events={visibleEvents}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectDay={setSelectedDay}
          selectedDay={selectedDay}
        />
        <section className="calendar-app__main" aria-label="Weekly calendar">
          <header className="calendar-toolbar">
            <div className="calendar-toolbar__left">
              <button aria-label="Toggle sidebar" className="icon-button" onClick={() => setSidebarOpen((open) => !open)} type="button"><Icon name="menu" /></button>
              <h1 className="calendar-toolbar__title"><span>03-09 Jan</span> <small>2022</small></h1>
              <button className="view-button" type="button">Week <Icon name="chevron" size={14} /></button>
            </div>
            <div className="calendar-toolbar__right">
              <div className={`calendar-search${searchOpen ? ' calendar-search--open' : ''}`}>
                {searchOpen && <input aria-label="Search events" autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="Search events" value={query} />}
                <button aria-label={searchOpen ? 'Close search' : 'Search events'} className="icon-button icon-button--muted" onClick={() => { setSearchOpen((open) => !open); if (searchOpen) setQuery('') }} type="button"><Icon name={searchOpen ? 'close' : 'search'} /></button>
              </div>
              <button className="add-button" onClick={() => setAddingEvent(true)} type="button"><span>Add event</span><Icon name="plus" /></button>
            </div>
          </header>
          {query && <div className="search-status">Showing {visibleEvents.length} result{visibleEvents.length === 1 ? '' : 's'} for “{query}”</div>}
          <WeekCalendar events={visibleEvents} onSelectEvent={setSelectedEvent} />
        </section>
      </div>
      {selectedEvent && <EventDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={deleteEvent} />}
      {addingEvent && <AddEventDialog onAdd={addEvent} onClose={() => setAddingEvent(false)} />}
    </main>
  )
}
