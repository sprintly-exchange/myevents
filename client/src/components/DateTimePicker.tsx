import { useTranslation } from 'react-i18next';
import { Calendar, Clock, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value: string;           // "YYYY-MM-DDTHH:mm" or ""
  onChange: (v: string) => void;
  required?: boolean;
  min?: string;            // "YYYY-MM-DDTHH:mm" — clamps selectable date
  clearable?: boolean;     // show clear button
  className?: string;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

/** Parse "YYYY-MM-DDTHH:mm" → { date, hour, minute } */
function parse(value: string) {
  if (!value) return { date: '', hour: '09', minute: '00' };
  const [datePart, timePart = ''] = value.split('T');
  const [h = '09', m = '00'] = timePart.split(':');
  return { date: datePart, hour: pad(parseInt(h, 10)), minute: pad(parseInt(m, 10)) };
}

/** Snap minute to nearest 5-min increment */
function snapMinute(m: string) {
  const n = parseInt(m, 10);
  return pad(Math.round(n / 5) * 5 % 60);
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

export default function DateTimePicker({ value, onChange, required, min, clearable, className }: DateTimePickerProps) {
  const { t } = useTranslation();
  const { date, hour, minute } = parse(value);

  const minDate = min ? min.split('T')[0] : undefined;

  function update(d: string, h: string, m: string) {
    if (!d) { onChange(''); return; }
    onChange(`${d}T${h}:${m}`);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.value;
    if (!d) { onChange(''); return; }
    // If a min is set and selected date equals min date, clamp hour/minute
    if (min) {
      const [minDatePart, minTimePart = ''] = min.split('T');
      const [minH = '00', minM = '00'] = minTimePart.split(':');
      if (d === minDatePart) {
        const clampedH = pad(Math.max(parseInt(hour, 10), parseInt(minH, 10)));
        const clampedM = pad(Math.max(parseInt(minute, 10), parseInt(minM, 10)));
        update(d, clampedH, clampedM);
        return;
      }
    }
    update(d, hour || '09', minute || '00');
  }

  function handleHour(h: string) {
    if (!date) return;
    update(date, h, minute || '00');
  }

  function handleMinute(m: string) {
    if (!date) return;
    update(date, hour || '09', m);
  }

  const hasValue = !!date;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Date row */}
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="date"
          required={required}
          value={date}
          min={minDate}
          onChange={handleDateChange}
          className={cn(
            'w-full h-10 pl-9 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-800',
            'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors',
            'cursor-pointer',
            !date && 'text-slate-400'
          )}
        />
        {clearable && hasValue && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Time row — shown only when date is set */}
      {hasValue && (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
          <Select value={hour} onValueChange={handleHour}>
            <SelectTrigger className="w-[88px] h-9 border-slate-200 focus:border-blue-400 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {HOURS.map(h => (
                <SelectItem key={h} value={h}>{h}:00</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-slate-400 text-sm font-medium">:</span>
          <Select value={snapMinute(minute)} onValueChange={handleMinute}>
            <SelectTrigger className="w-[76px] h-9 border-slate-200 focus:border-blue-400 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-400 ml-1">
            {t('events.time24h')}
          </span>
        </div>
      )}
    </div>
  );
}
