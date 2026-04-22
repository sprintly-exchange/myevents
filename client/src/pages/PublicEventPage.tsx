import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PublicEvent {
  title: string;
  description: string;
  event_date: string;
  location: string;
  template_name: string | null;
}

type Theme = 'Elegant' | 'Party' | 'Corporate' | 'Studentfest';

type AttendingValue = 'yes' | 'maybe' | 'no';

interface RsvpForm {
  name: string;
  email: string;
  attending: AttendingValue;
}

function resolveTheme(name: string | null): Theme {
  if (name === 'Party' || name === 'Corporate' || name === 'Studentfest') return name;
  return 'Elegant';
}

function formatDate(raw: string): string {
  return new Date(raw).toLocaleString('sv-SE', { dateStyle: 'full', timeStyle: 'short' });
}

// ─── Spinner ────────────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Elegant ────────────────────────────────────────────────────────────────

function ElegantPage({
  event,
  shareToken,
}: {
  event: PublicEvent;
  shareToken: string;
}) {
  const [form, setForm] = useState<RsvpForm>({ name: '', email: '', attending: 'yes' });
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAttending, setConfirmedAttending] = useState<AttendingValue>('yes');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const gold = '#c9a84c';
  const cream = '#f5e6c8';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/events/${shareToken}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError('This event is full. No more RSVPs are being accepted.');
        } else {
          setError(data.error ?? 'Something went wrong.');
        }
        return;
      }
      setConfirmedAttending(form.attending);
      setConfirmed(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const attendingOptions: { value: AttendingValue; label: string }[] = [
    { value: 'yes', label: 'Yes, I will attend' },
    { value: 'maybe', label: 'Perhaps' },
    { value: 'no', label: 'Regretfully, no' },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 50%, #1a1a2e 100%)' }}
    >
      {/* Hero */}
      <div className="flex flex-col items-center pt-16 pb-10 px-4 text-center">
        <p
          className="text-xs font-semibold tracking-[0.3em] uppercase mb-6"
          style={{ color: gold, fontVariant: 'small-caps' }}
        >
          You are cordially invited
        </p>
        <h1
          className="text-5xl md:text-6xl font-serif italic mb-6 leading-tight"
          style={{ color: cream, letterSpacing: '0.05em' }}
        >
          {event.title}
        </h1>
        <div className="w-24 h-px mb-8" style={{ background: gold }} />
        {event.description && (
          <p className="max-w-xl text-base leading-relaxed mb-6 opacity-80" style={{ color: cream }}>
            {event.description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col md:flex-row gap-4 justify-center px-6 md:px-12 max-w-3xl mx-auto w-full mb-12">
        {[
          { label: 'Date & Time', value: formatDate(event.event_date), icon: '📅' },
          { label: 'Location', value: event.location, icon: '📍' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex-1 rounded-lg p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderLeft: `3px solid ${gold}`,
              border: `1px solid rgba(201,168,76,0.3)`,
              borderLeftWidth: 3,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{item.icon}</span>
              <span
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: gold }}
              >
                {item.label}
              </span>
            </div>
            <p className="text-sm font-medium" style={{ color: cream }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* RSVP */}
      <div className="flex-1 flex justify-center px-4 pb-16">
        <div
          className="w-full max-w-md rounded-2xl p-8"
          style={{ background: 'rgba(15,52,96,0.85)', border: `1px solid rgba(201,168,76,0.3)` }}
        >
          {confirmed ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✨</div>
              <h2 className="text-2xl font-serif italic mb-3" style={{ color: cream }}>
                Thank you
              </h2>
              <p className="text-sm opacity-75" style={{ color: cream }}>
                Your RSVP has been received.{' '}
                {confirmedAttending === 'yes'
                  ? 'We look forward to your presence.'
                  : confirmedAttending === 'maybe'
                  ? 'We hope to see you there.'
                  : 'You will be missed.'}
              </p>
            </div>
          ) : (
            <>
              <h2
                className="text-xl font-serif italic text-center mb-6"
                style={{ color: gold }}
              >
                RSVP
              </h2>
              {error && (
                <div
                  className="mb-4 text-sm text-center px-4 py-3 rounded-lg"
                  style={{ background: 'rgba(255,80,80,0.15)', color: '#ffaaaa' }}
                >
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs tracking-wider uppercase" style={{ color: gold }}>
                    Name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                    style={{
                      background: 'rgba(245,230,200,0.1)',
                      color: cream,
                      border: '1px solid rgba(201,168,76,0.4)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = gold)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs tracking-wider uppercase" style={{ color: gold }}>
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                    style={{
                      background: 'rgba(245,230,200,0.1)',
                      color: cream,
                      border: '1px solid rgba(201,168,76,0.4)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = gold)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-wider uppercase" style={{ color: gold }}>
                    Attending
                  </label>
                  <div className="flex flex-col gap-2">
                    {attendingOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 cursor-pointer rounded-lg px-4 py-2.5 transition"
                        style={{
                          background:
                            form.attending === opt.value
                              ? 'rgba(201,168,76,0.15)'
                              : 'rgba(255,255,255,0.03)',
                          border:
                            form.attending === opt.value
                              ? `1px solid ${gold}`
                              : '1px solid rgba(201,168,76,0.2)',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            border: `2px solid ${gold}`,
                            background:
                              form.attending === opt.value ? gold : 'transparent',
                          }}
                        >
                          {form.attending === opt.value && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a2e]" />
                          )}
                        </div>
                        <span className="text-sm" style={{ color: cream }}>
                          {opt.label}
                        </span>
                        <input
                          type="radio"
                          className="sr-only"
                          name="attending"
                          value={opt.value}
                          checked={form.attending === opt.value}
                          onChange={() => setForm((f) => ({ ...f, attending: opt.value }))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 py-3 rounded-xl text-sm font-semibold tracking-widest uppercase transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(to right, #c9a84c, #a07830)',
                    color: '#1a1a2e',
                  }}
                >
                  {submitting && <Spinner className="w-4 h-4" />}
                  Confirm RSVP
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Studentfest ─────────────────────────────────────────────────────────────

function StudentfestPage({
  event,
  shareToken,
}: {
  event: PublicEvent;
  shareToken: string;
}) {
  const [form, setForm] = useState<RsvpForm>({ name: '', email: '', attending: 'yes' });
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAttending, setConfirmedAttending] = useState<AttendingValue>('yes');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const yellow = '#FECC02';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/events/${shareToken}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError('Det finns inga platser kvar för detta evenemang.');
        } else {
          setError(data.error ?? 'Något gick fel.');
        }
        return;
      }
      setConfirmedAttending(form.attending);
      setConfirmed(true);
    } catch {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  const confettiDots = [
    { top: '8%', left: '5%', size: 10, color: yellow, opacity: 0.5, rotate: 15 },
    { top: '15%', left: '90%', size: 14, color: '#fff', opacity: 0.3, rotate: 45 },
    { top: '25%', left: '80%', size: 8, color: yellow, opacity: 0.4, rotate: 0 },
    { top: '5%', left: '60%', size: 6, color: '#fff', opacity: 0.25, rotate: 30 },
    { top: '40%', left: '3%', size: 12, color: yellow, opacity: 0.35, rotate: 60 },
    { top: '55%', left: '92%', size: 9, color: '#fff', opacity: 0.3, rotate: 20 },
    { top: '70%', left: '8%', size: 7, color: yellow, opacity: 0.4, rotate: 80 },
    { top: '75%', left: '85%', size: 11, color: '#fff', opacity: 0.25, rotate: 45 },
    { top: '85%', left: '20%', size: 8, color: yellow, opacity: 0.45, rotate: 10 },
    { top: '90%', left: '70%', size: 13, color: '#fff', opacity: 0.2, rotate: 55 },
    { top: '50%', left: '95%', size: 6, color: yellow, opacity: 0.5, rotate: 35 },
    { top: '30%', left: '12%', size: 5, color: '#fff', opacity: 0.35, rotate: 70 },
  ];

  const attendingOptions: { value: AttendingValue; label: string }[] = [
    { value: 'yes', label: 'Ja, jag kommer 🎉' },
    { value: 'maybe', label: 'Kanske' },
    { value: 'no', label: 'Nej, tyvärr' },
  ];

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #005B99 0%, #004080 50%, #002d5a 100%)' }}
    >
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettiDots.map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              background: dot.color,
              opacity: dot.opacity,
              transform: `rotate(${dot.rotate}deg)`,
            }}
          />
        ))}
      </div>

      {/* Hero */}
      <div className="relative flex flex-col items-center pt-16 pb-8 px-4 text-center">
        <div className="text-7xl mb-5">🎓</div>
        <h1 className="text-5xl md:text-6xl font-black text-white mb-3 leading-tight">
          {event.title}
        </h1>
        <p className="text-lg font-bold mb-6" style={{ color: yellow }}>
          Du är inbjuden!
        </p>
        {/* Swedish flag stripe */}
        <div
          className="w-48 h-1 rounded-full mb-6"
          style={{
            background: `linear-gradient(to right, #005B99, ${yellow}, #005B99)`,
          }}
        />
        {event.description && (
          <p className="max-w-xl text-white/80 text-base leading-relaxed">{event.description}</p>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col md:flex-row gap-4 justify-center px-6 md:px-12 max-w-3xl mx-auto w-full mb-12 relative">
        {[
          { label: 'Datum', value: formatDate(event.event_date), icon: '📅' },
          { label: 'Plats', value: event.location, icon: '📍' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex-1 rounded-xl p-5 bg-white/10 backdrop-blur-sm"
            style={{ border: '2px solid rgba(255,255,255,0.3)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{item.icon}</span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: yellow }}>
                {item.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* RSVP */}
      <div className="flex-1 flex justify-center px-4 pb-16 relative">
        <div className="w-full max-w-md rounded-2xl p-8 bg-white/10 backdrop-blur-sm border border-white/20">
          {confirmed ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎓</div>
              <h2 className="text-2xl font-black text-white mb-3">
                Tack för din anmälan!
              </h2>
              <p className="text-white/80 text-sm">
                {confirmedAttending === 'yes'
                  ? 'Vi ses där! 🎉'
                  : confirmedAttending === 'maybe'
                  ? 'Vi hoppas att du kan komma!'
                  : 'Tråkigt att du inte kan — vi saknar dig!'}
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-black text-center text-white mb-6">
                Anmälan
              </h2>
              {error && (
                <div className="mb-4 text-sm text-center px-4 py-3 rounded-xl bg-red-500/20 text-red-200">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: yellow }}>
                    Namn
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="rounded-xl px-4 py-2.5 text-sm bg-white/15 text-white placeholder-white/40 outline-none border border-white/20 focus:border-[#FECC02] transition"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: yellow }}>
                    E-post
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-xl px-4 py-2.5 text-sm bg-white/15 text-white placeholder-white/40 outline-none border border-white/20 focus:border-[#FECC02] transition"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: yellow }}>
                    Deltar du?
                  </label>
                  <div className="flex flex-col gap-2">
                    {attendingOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 cursor-pointer rounded-xl px-4 py-2.5 transition"
                        style={{
                          background:
                            form.attending === opt.value ? 'rgba(254,204,2,0.15)' : 'rgba(255,255,255,0.07)',
                          border:
                            form.attending === opt.value
                              ? `1.5px solid ${yellow}`
                              : '1.5px solid rgba(255,255,255,0.2)',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            border: `2px solid ${yellow}`,
                            background: form.attending === opt.value ? yellow : 'transparent',
                          }}
                        >
                          {form.attending === opt.value && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#004080]" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-white">{opt.label}</span>
                        <input
                          type="radio"
                          className="sr-only"
                          name="attending"
                          value={opt.value}
                          checked={form.attending === opt.value}
                          onChange={() => setForm((f) => ({ ...f, attending: opt.value }))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 py-3 rounded-xl text-sm font-black tracking-wide uppercase transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: yellow, color: '#002d5a' }}
                >
                  {submitting && <Spinner className="w-4 h-4" />}
                  Skicka anmälan
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Party ───────────────────────────────────────────────────────────────────

function PartyPage({
  event,
  shareToken,
}: {
  event: PublicEvent;
  shareToken: string;
}) {
  const [form, setForm] = useState<RsvpForm>({ name: '', email: '', attending: 'yes' });
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAttending, setConfirmedAttending] = useState<AttendingValue>('yes');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/events/${shareToken}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError("This party is full — sorry!");
        } else {
          setError(data.error ?? 'Something went wrong.');
        }
        return;
      }
      setConfirmedAttending(form.attending);
      setConfirmed(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const floatingEmojis = [
    { emoji: '🎉', top: '6%', left: '4%', size: 60, rotate: -15, opacity: 0.35 },
    { emoji: '🎈', top: '12%', left: '88%', size: 50, rotate: 10, opacity: 0.3 },
    { emoji: '🥳', top: '60%', left: '5%', size: 55, rotate: 20, opacity: 0.25 },
    { emoji: '🎊', top: '65%', left: '88%', size: 65, rotate: -20, opacity: 0.3 },
    { emoji: '🎉', top: '88%', left: '15%', size: 45, rotate: 5, opacity: 0.25 },
    { emoji: '🎈', top: '85%', left: '80%', size: 50, rotate: -10, opacity: 0.3 },
  ];

  const attendingOptions: { value: AttendingValue; label: string; color: string }[] = [
    { value: 'yes', label: 'Hell yes! 🎉', color: '#a855f7' },
    { value: 'maybe', label: 'Maybe 🤔', color: '#ec4899' },
    { value: 'no', label: "Can't make it 😢", color: '#f97316' },
  ];

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)' }}
    >
      {/* Floating emojis */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floatingEmojis.map((item, i) => (
          <div
            key={i}
            className="absolute select-none leading-none"
            style={{
              top: item.top,
              left: item.left,
              fontSize: item.size,
              transform: `rotate(${item.rotate}deg)`,
              opacity: item.opacity,
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Hero */}
      <div className="relative flex flex-col items-center pt-16 pb-10 px-4 text-center">
        <div className="text-6xl mb-4">🎊</div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight drop-shadow-lg">
          {event.title}
        </h1>
        <p className="text-xl text-white/90 font-semibold mb-2">You're invited to the party!</p>
        {event.description && (
          <p className="max-w-xl text-white/80 text-base leading-relaxed mt-4">
            {event.description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col md:flex-row gap-4 justify-center px-6 md:px-12 max-w-3xl mx-auto w-full mb-12 relative">
        {[
          { label: 'When', value: formatDate(event.event_date), icon: '📅', border: '#f472b6' },
          { label: 'Where', value: event.location, icon: '📍', border: '#c084fc' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex-1 rounded-2xl p-5 bg-white shadow-lg"
            style={{ borderLeft: `4px solid ${item.border}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{item.icon}</span>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: item.border }}
              >
                {item.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-800">{item.value}</p>
          </div>
        ))}
      </div>

      {/* RSVP */}
      <div className="flex-1 flex justify-center px-4 pb-16 relative">
        <div className="w-full max-w-md rounded-3xl p-8 bg-white shadow-2xl">
          {confirmed ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎊🎉</div>
              <h2 className="text-2xl font-black text-gray-900 mb-3">
                {confirmedAttending === 'yes'
                  ? "We'll see you there!"
                  : confirmedAttending === 'maybe'
                  ? 'Hope you can make it!'
                  : 'Sorry you can\'t make it!'}
              </h2>
              <p className="text-gray-500 text-sm">Your RSVP is confirmed 🥳</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-black text-center text-gray-900 mb-6">
                Are you coming? 🎉
              </h2>
              {error && (
                <div className="mb-4 text-sm text-center px-4 py-3 rounded-2xl bg-red-100 text-red-600">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-purple-500">
                    Your Name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-900 outline-none border-2 border-purple-200 focus:border-purple-400 transition"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-pink-500">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-900 outline-none border-2 border-pink-200 focus:border-pink-400 transition"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-orange-500">
                    Your Answer
                  </label>
                  <div className="flex flex-col gap-2">
                    {attendingOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 transition border-2"
                        style={{
                          background: form.attending === opt.value ? `${opt.color}15` : '#f9fafb',
                          borderColor: form.attending === opt.value ? opt.color : '#e5e7eb',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition"
                          style={{
                            borderColor: opt.color,
                            background: form.attending === opt.value ? opt.color : 'transparent',
                          }}
                        >
                          {form.attending === opt.value && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                        <input
                          type="radio"
                          className="sr-only"
                          name="attending"
                          value={opt.value}
                          checked={form.attending === opt.value}
                          onChange={() => setForm((f) => ({ ...f, attending: opt.value }))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 py-3 rounded-full text-sm font-black tracking-wide uppercase transition disabled:opacity-60 flex items-center justify-center gap-2 bg-white border-2 border-purple-500 text-purple-600 hover:bg-purple-50 shadow-md"
                >
                  {submitting && <Spinner className="w-4 h-4 text-purple-500" />}
                  Send RSVP 🎊
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Corporate ───────────────────────────────────────────────────────────────

function CorporatePage({
  event,
  shareToken,
}: {
  event: PublicEvent;
  shareToken: string;
}) {
  const [form, setForm] = useState<RsvpForm>({ name: '', email: '', attending: 'yes' });
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAttending, setConfirmedAttending] = useState<AttendingValue>('yes');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/events/${shareToken}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError('This event has reached its maximum capacity.');
        } else {
          setError(data.error ?? 'An error occurred. Please try again.');
        }
        return;
      }
      setConfirmedAttending(form.attending);
      setConfirmed(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const attendingOptions: { value: AttendingValue; label: string }[] = [
    { value: 'yes', label: 'Attending' },
    { value: 'maybe', label: 'Tentative' },
    { value: 'no', label: 'Not Attending' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden bg-white">
        {/* Header bar */}
        <div className="bg-slate-900 px-8 py-8">
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-[0.25em] mb-3">
            Event Invitation
          </p>
          <h1 className="text-3xl font-bold text-white leading-tight">{event.title}</h1>
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {event.description && (
            <p className="text-slate-600 text-sm leading-relaxed mb-8 pb-8 border-b border-slate-100">
              {event.description}
            </p>
          )}

          {/* Date/Location rows */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-base">
                📅
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                  Date & Time
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(event.event_date)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-base">
                📍
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                  Location
                </p>
                <p className="text-sm font-semibold text-slate-800">{event.location}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 mb-8" />

          {/* RSVP */}
          {confirmed ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-2xl">
                ✓
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Thank you for your response
              </h2>
              <p className="text-slate-500 text-sm">
                {confirmedAttending === 'yes'
                  ? 'We look forward to seeing you at the event.'
                  : confirmedAttending === 'maybe'
                  ? 'We have noted your tentative response.'
                  : 'Thank you for letting us know.'}
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-900 mb-5">RSVP</h2>
              {error && (
                <div className="mb-4 text-sm px-4 py-3 rounded-xl bg-red-50 text-red-600 border border-red-100">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Attendance
                  </label>
                  <div className="flex flex-col gap-2">
                    {attendingOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 transition border"
                        style={{
                          background: form.attending === opt.value ? '#eff6ff' : '#f8fafc',
                          borderColor: form.attending === opt.value ? '#3b82f6' : '#e2e8f0',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition"
                          style={{
                            borderColor: form.attending === opt.value ? '#3b82f6' : '#94a3b8',
                            background: form.attending === opt.value ? '#3b82f6' : 'transparent',
                          }}
                        >
                          {form.attending === opt.value && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                        <input
                          type="radio"
                          className="sr-only"
                          name="attending"
                          value={opt.value}
                          checked={form.attending === opt.value}
                          onChange={() => setForm((f) => ({ ...f, attending: opt.value }))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting && <Spinner className="w-4 h-4" />}
                  Submit Response
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function PublicEventPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    fetch(`/api/public/events/${shareToken}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setEvent(data.event);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner className="w-10 h-10 text-white/60" />
      </div>
    );
  }

  if (notFound || !event || !shareToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white px-4 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Event not found</h1>
        <p className="text-slate-400 text-sm">
          This link may be invalid or the event may have been removed.
        </p>
      </div>
    );
  }

  const theme = resolveTheme(event.template_name);

  if (theme === 'Studentfest') {
    return <StudentfestPage event={event} shareToken={shareToken} />;
  }
  if (theme === 'Party') {
    return <PartyPage event={event} shareToken={shareToken} />;
  }
  if (theme === 'Corporate') {
    return <CorporatePage event={event} shareToken={shareToken} />;
  }
  return <ElegantPage event={event} shareToken={shareToken} />;
}
