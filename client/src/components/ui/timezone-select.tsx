import { useState, useMemo, useRef, useEffect } from 'react';
import { Globe, ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTzDisplayName, getTzOffsetLabel } from '@/lib/tz';

const FALLBACK_TIMEZONES = [
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Anchorage', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/New_York', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
  'Asia/Bangkok', 'Asia/Colombo', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Jakarta',
  'Asia/Karachi', 'Asia/Kolkata', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo',
  'Atlantic/Reykjavik',
  'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Brussels',
  'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Helsinki', 'Europe/Istanbul',
  'Europe/Lisbon', 'Europe/London', 'Europe/Madrid', 'Europe/Moscow',
  'Europe/Oslo', 'Europe/Paris', 'Europe/Rome', 'Europe/Stockholm',
  'Europe/Vienna', 'Europe/Warsaw', 'Europe/Zurich',
  'Pacific/Auckland', 'Pacific/Honolulu', 'Pacific/Fiji',
  'UTC',
];

function getAllTimezones(): { region: string; zones: string[] }[] {
  const all: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? FALLBACK_TIMEZONES;
  const grouped: Record<string, string[]> = {};
  for (const tz of all) {
    const region = tz.includes('/') ? tz.split('/')[0] : 'Other';
    (grouped[region] ||= []).push(tz);
  }
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, zones]) => ({ region, zones }));
}

export function TimezoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const allGroups = useMemo(() => getAllTimezones(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allGroups;
    const q = search.toLowerCase();
    return allGroups
      .map(g => ({
        ...g,
        zones: g.zones.filter(tz =>
          tz.toLowerCase().includes(q) ||
          getTzDisplayName(tz).toLowerCase().includes(q) ||
          getTzOffsetLabel(tz).toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.zones.length > 0);
  }, [allGroups, search]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchRef.current?.focus();
        selectedRef.current?.scrollIntoView({ block: 'nearest' });
      }, 50);
    } else {
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayLabel = value
    ? `${getTzDisplayName(value)} (${getTzOffsetLabel(value)})`
    : 'Select timezone';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full h-10 flex items-center gap-2 px-3 rounded-lg border border-slate-200',
          'bg-white text-sm text-slate-700 hover:border-slate-300 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400',
          open && 'ring-2 ring-blue-400/50 border-blue-400'
        )}
      >
        <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col max-h-72 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search timezones…"
                className="w-full h-8 pl-8 pr-7 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-slate-400 text-center">No timezones found</div>
            ) : (
              filtered.map(({ region, zones }) => (
                <div key={region}>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 sticky top-0">
                    {region}
                  </div>
                  {zones.map(tz => (
                    <button
                      key={tz}
                      ref={tz === value ? selectedRef : undefined}
                      type="button"
                      onClick={() => { onChange(tz); setOpen(false); }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 transition-colors',
                        value === tz && 'bg-blue-50 text-blue-700 font-medium'
                      )}
                    >
                      <span>{getTzDisplayName(tz)}</span>
                      <span className="text-xs text-slate-400 font-mono ml-2 flex-shrink-0">
                        {getTzOffsetLabel(tz)}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
