import { useState, useRef, useEffect } from 'react';
import { Clock, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  confirmLabel?: string;
  triggerClassName?: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const ITEM_H = 36;
const VISIBLE_H = 180;
const PAD = ITEM_H * 2; // 72px — allows first/last items to center

export function TimePickerInput({ value, onChange, placeholder = '--:--', label = 'Time', confirmLabel = 'Set time', triggerClassName, className }: TimePickerInputProps) {
  const [open, setOpen] = useState(false);
  // Draft state while picker is open (committed on Done)
  const [draftHour, setDraftHour] = useState<string>('08');
  const [draftMinute, setDraftMinute] = useState<string>('00');

  const wrapRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);

  const parsed = value?.match(/^(\d{2}):(\d{2})$/);
  const displayHour = parsed?.[1] ?? null;
  const displayMinute = parsed?.[2] ?? null;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function openPicker() {
    const h = displayHour ?? '08';
    const m = displayMinute ?? '00';
    const closestMinute = MINUTES.includes(m)
      ? m
      : MINUTES.reduce((prev, curr) =>
          Math.abs(+curr - +m) < Math.abs(+prev - +m) ? curr : prev
        );
    setDraftHour(h);
    setDraftMinute(closestMinute);
    setOpen(true);

    // Scroll to selected after render
    setTimeout(() => {
      const hi = HOURS.indexOf(h);
      const mi = MINUTES.indexOf(closestMinute);
      if (hourColRef.current && hi >= 0) hourColRef.current.scrollTop = hi * ITEM_H;
      if (minColRef.current && mi >= 0) minColRef.current.scrollTop = mi * ITEM_H;
    }, 0);
  }

  function scrollToItem(ref: React.RefObject<HTMLDivElement | null>, index: number) {
    if (ref.current) {
      ref.current.scrollTo({ top: index * ITEM_H, behavior: 'smooth' });
    }
  }

  function pickHour(h: string) {
    setDraftHour(h);
    scrollToItem(hourColRef, HOURS.indexOf(h));
  }

  function pickMinute(m: string) {
    setDraftMinute(m);
    scrollToItem(minColRef, MINUTES.indexOf(m));
  }

  function confirm() {
    onChange(`${draftHour}:${draftMinute}`);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : openPicker}
        className={cn(
          'flex items-center gap-2 w-full h-9 px-3 text-sm rounded-md border bg-white transition-all',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
          open
            ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-sm'
            : 'border-slate-200 hover:border-slate-400',
          !value && 'text-slate-400',
          triggerClassName
        )}
      >
        <Clock className={cn('h-3.5 w-3.5 shrink-0 transition-colors', value ? 'text-indigo-500' : 'text-slate-400')} />
        <span className="flex-1 text-left font-mono tracking-widest">
          {value || placeholder}
        </span>
        {value && (
          <span
            onMouseDown={clear}
            className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden w-44 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Clock className="h-3 w-3" />
              <span>{label}</span>
            </div>
            <span className="text-sm font-mono font-bold text-indigo-600 tabular-nums">
              {draftHour}:{draftMinute}
            </span>
          </div>

          {/* Scroll columns */}
          <div className="flex" style={{ height: VISIBLE_H }}>
            {/* Hour column */}
            <div className="relative flex-1">
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
              {/* Center highlight bar */}
              <div
                className="absolute inset-x-1 rounded-lg bg-indigo-50 pointer-events-none z-[5]"
                style={{ top: (VISIBLE_H - ITEM_H) / 2, height: ITEM_H }}
              />
              <div
                ref={hourColRef}
                className="h-full overflow-y-auto px-1"
                style={{ scrollbarWidth: 'none' }}
              >
                <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
                  {HOURS.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => pickHour(h)}
                      style={{ height: ITEM_H }}
                      className={cn(
                        'w-full flex items-center justify-center text-sm font-mono rounded-lg transition-all duration-150 relative z-20',
                        draftHour === h
                          ? 'text-indigo-700 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Colon separator */}
            <div className="flex items-center justify-center w-5 shrink-0 text-slate-300 font-bold text-lg select-none">
              :
            </div>

            {/* Minute column */}
            <div className="relative flex-1">
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
              <div
                className="absolute inset-x-1 rounded-lg bg-indigo-50 pointer-events-none z-[5]"
                style={{ top: (VISIBLE_H - ITEM_H) / 2, height: ITEM_H }}
              />
              <div
                ref={minColRef}
                className="h-full overflow-y-auto px-1"
                style={{ scrollbarWidth: 'none' }}
              >
                <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
                  {MINUTES.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => pickMinute(m)}
                      style={{ height: ITEM_H }}
                      className={cn(
                        'w-full flex items-center justify-center text-sm font-mono rounded-lg transition-all duration-150 relative z-20',
                        draftMinute === m
                          ? 'text-indigo-700 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer / Done button */}
          <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={confirm}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              {confirmLabel} {draftHour}:{draftMinute}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
