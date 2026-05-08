import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Camera, CameraOff, CheckCircle2, Circle, Users, ScanLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Guest {
  id: string;
  recipient_name: string | null;
  recipient_email: string;
  status: string;
  token: string;
  checked_in_at: string | null;
}

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const scannerDivId = 'html5qr-checkin-scanner';

  const { data, isLoading } = useQuery({
    queryKey: ['checkin-guests', id],
    queryFn: () => api.get(`/events/${id}/checkin`).then(r => r.data),
    refetchInterval: scanning ? 5000 : false,
  });

  const guests: Guest[] = data?.guests || [];
  const eventTitle: string = data?.event?.title || '';
  const checkedInCount = guests.filter(g => g.checked_in_at).length;

  const checkinMutation = useMutation({
    mutationFn: (token: string) => api.post(`/invitations/checkin/${token}`),
    onSuccess: (res) => {
      const name = res.data.invitation?.recipient_name || res.data.invitation?.recipient_email || 'Guest';
      if (res.data.already_checked_in) {
        toast.info(t('checkin.alreadyCheckedInName', { name }));
      } else {
        toast.success(t('checkin.checkinSuccess', { name }));
      }
      qc.invalidateQueries({ queryKey: ['checkin-guests', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || t('checkin.checkinError'));
    },
  });

  function extractToken(text: string): string {
    // Support both full URL (.../checkin/<token>) and raw token
    const match = text.match(/\/checkin\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : text.trim();
  }

  async function startScanner() {
    setScannerError(null);
    lastScannedRef.current = null;
    try {
      // Destroy any previous instance
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch { /* ignore */ }
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode(scannerDivId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      // Mark scanning=true first so the div becomes visible before start()
      setScanning(true);

      // Small delay to let React re-render the visible div before Html5Qrcode measures it
      await new Promise(resolve => setTimeout(resolve, 100));

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const token = extractToken(decodedText);
          // Debounce: ignore same token within 3 seconds
          if (!token || token === lastScannedRef.current) return;
          lastScannedRef.current = token;
          setTimeout(() => { lastScannedRef.current = null; }, 3000);
          checkinMutation.mutate(token);
        },
        undefined
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      // NotAllowedError = camera permission denied
      const friendly = msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')
        ? 'Camera permission denied. Allow camera access in your browser settings.'
        : msg || 'Camera error';
      setScannerError(friendly);
      setScanning(false);
      scannerRef.current = null;
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t('common.back')}
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('checkin.title')}</h1>
          {eventTitle && <p className="text-slate-500 text-sm mt-0.5">{eventTitle}</p>}
        </div>

        {/* Stats bar */}
        <div className="flex gap-4">
          <div className="flex-1 bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
            <p className="text-2xl font-bold text-slate-800">{guests.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('checkin.total')}</p>
          </div>
          <div className="flex-1 bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
            <p className="text-2xl font-bold text-emerald-700">{checkedInCount}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{t('checkin.checkedInCount')}</p>
          </div>
        </div>

        {/* Camera scanner */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">{t('checkin.scannerLabel')}</span>
            </div>
            <Button
              size="sm"
              variant={scanning ? 'outline' : 'default'}
              onClick={scanning ? stopScanner : startScanner}
            >
              {scanning ? (
                <><CameraOff className="h-3.5 w-3.5 mr-1.5" />{t('checkin.stopCamera')}</>
              ) : (
                <><Camera className="h-3.5 w-3.5 mr-1.5" />{t('checkin.startCamera')}</>
              )}
            </Button>
          </div>

          <div
            id={scannerDivId}
            className="w-full transition-all overflow-hidden"
            style={{ height: scanning ? 300 : 0 }}
          />

          {!scanning && (
            <div className="py-10 flex flex-col items-center gap-2 text-slate-400">
              <Camera className="h-10 w-10 opacity-30" />
              <p className="text-sm">{t('checkin.startCamera')}</p>
            </div>
          )}

          {scannerError && (
            <p className="px-4 pb-3 text-xs text-red-500">{scannerError}</p>
          )}
        </div>

        {/* Manual guest list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">{t('checkin.guestList')}</span>
          </div>

          {guests.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">{t('checkin.noGuests')}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {guests.map(guest => (
                <div key={guest.id} className="flex items-center gap-3 px-4 py-3">
                  {guest.checked_in_at ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {guest.recipient_name || guest.recipient_email}
                      </p>
                      {guest.status === 'maybe' && (
                        <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          {t('checkin.maybeAttending')}
                        </span>
                      )}
                    </div>
                    {guest.recipient_name && (
                      <p className="text-xs text-slate-400 truncate">{guest.recipient_email}</p>
                    )}
                    {guest.checked_in_at && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {t('checkin.checkedIn')} · {new Date(guest.checked_in_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  {!guest.checked_in_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 text-xs h-7"
                      onClick={() => checkinMutation.mutate(guest.token)}
                      disabled={checkinMutation.isPending}
                    >
                      {t('checkin.checkInButton')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
