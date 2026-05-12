import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { buildPaymentQrValue, type PaymentSettings } from '@/lib/payment';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PaymentData {
  payment?: PaymentSettings;
  payment_methods?: PaymentSettings[];
  price?: number;
  planName?: string;
  currency?: string;
}

export default function PendingPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const stateData = (location.state as PaymentData) || {};
  const [checking, setChecking] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');

  const { data: pendingData } = useQuery({
    queryKey: ['upgrade-request-pending'],
    queryFn: () => api.get('/upgrade-requests/pending').then(r => r.data),
    retry: false,
  });

  const paymentMethods: PaymentSettings[] = stateData.payment_methods || pendingData?.payment_methods || [];
  const payment: PaymentSettings | null = stateData.payment || pendingData?.payment || paymentMethods[0] || (pendingData?.swish ? {
    method_name: 'Swish',
    recipient_label: t('upgrade.paymentDestination'),
    recipient_value: pendingData.swish.number || '',
    holder_label: t('upgrade.recipient'),
    holder_value: pendingData.swish.holder || '',
    qr_template: '',
  } : null);
  const price = stateData.price || pendingData?.request?.plan_price || 0;
  const currency = stateData.currency || pendingData?.request?.plan_currency || 'SEK';
  const planName = stateData.planName || pendingData?.request?.plan_name || 'Basic';
  const reference = pendingData?.request?.paymentReference || pendingData?.request?.payment_reference || '';
  const activePaymentMethod = paymentMethods.find((method) => method.id === selectedPaymentMethodId) || payment;

  const paymentQrData = buildPaymentQrValue(activePaymentMethod, {
    amount: price,
    currency,
    reference,
    appName: 'MyEvents',
  });
  const hasHolder = !!activePaymentMethod?.holder_value;
  const amountStepNumber = hasHolder ? '4.' : '3.';
  const referenceStepNumber = hasHolder ? '5.' : '4.';
  const checkStepNumber = hasHolder ? (reference ? '6.' : '5.') : (reference ? '5.' : '4.');

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get('/auth/me');
      const user = res.data.user;
      if (user.payment_status === 'paid') {
        toast.success(t('pendingPayment.paymentConfirmed'));
        navigate('/dashboard');
      } else {
        toast.info(t('pendingPayment.notYetConfirmed'));
      }
    } catch {
      toast.error('Please log in again.');
      navigate('/login');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthLayout>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 mb-4">
          <span className="text-3xl">💳</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('pendingPayment.title')}</h2>
        <p className="text-slate-500 text-sm">
          {t('pendingPayment.subtitle', { plan: planName })}
        </p>
      </div>

      {/* Payment details card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-3">{t('upgrade.paymentDetails')}</h3>
        <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">{t('common.plan')}</span>
              <span className="font-semibold text-blue-900">{planName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">{t('upgrade.amount')}</span>
              <span className="font-bold text-xl text-blue-700">{price} {currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">{t('upgrade.paymentReference')}</span>
            <span className="font-mono font-semibold text-blue-900">
              {reference || <span className="text-slate-400 italic">loading…</span>}
            </span>
          </div>
            {activePaymentMethod?.recipient_value && (
              <>
                {paymentMethods.length > 1 && (
                  <div className="border-t border-blue-200 pt-2.5 mt-2.5">
                    <div className="flex justify-between text-sm items-center gap-2">
                      <span className="text-blue-700">{t('upgrade.paymentMethod')}</span>
                      <select
                        className="border border-blue-200 bg-white rounded-md px-2 py-1 text-xs"
                        value={selectedPaymentMethodId}
                        onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                      >
                        {paymentMethods.map((method, index) => (
                          <option key={method.id || index} value={method.id || ''}>
                            {method.method_name} {method.country_code ? `(${method.country_code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="border-t border-blue-200 pt-2.5 mt-2.5">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-blue-700">{activePaymentMethod?.recipient_label}</span>
                    <span className="font-mono font-semibold text-blue-900">{activePaymentMethod?.recipient_value}</span>
                  </div>
                  {activePaymentMethod?.holder_value && (
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">{activePaymentMethod.holder_label}</span>
                      <span className="font-semibold text-blue-900">{activePaymentMethod.holder_value}</span>
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
      </div>

      {/* QR code */}
      {paymentQrData && (
        <div className="flex flex-col items-center mb-5">
          <p className="text-sm text-slate-500 mb-3">{t('pendingPayment.scanQr', { method: activePaymentMethod?.method_name || t('upgrade.paymentMethodFallback') })}</p>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <QRCodeSVG value={paymentQrData} size={160} />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
        <p className="text-sm font-semibold text-amber-800 mb-2">{t('pendingPayment.instructions')}</p>
        <ol className="space-y-1.5 text-sm text-amber-700">
          <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> {t('pendingPayment.step1')}</li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">2.</span>
            {t('pendingPayment.step2Detailed', {
              method: activePaymentMethod?.method_name || t('upgrade.paymentMethodFallback'),
              label: activePaymentMethod?.recipient_label || t('upgrade.paymentDestination'),
              recipient: activePaymentMethod?.recipient_value || '—',
            })}
          </li>
          {activePaymentMethod?.holder_value && (
            <li className="flex gap-2">
              <span className="font-bold shrink-0">3.</span>
              {t('pendingPayment.stepHolder', {
                label: activePaymentMethod?.holder_label || t('upgrade.recipient'),
                holder: activePaymentMethod.holder_value,
              })}
            </li>
          )}
          <li className="flex gap-2"><span className="font-bold shrink-0">{amountStepNumber}</span> {t('pendingPayment.step3', { price, currency })}</li>
          {reference && <li className="flex gap-2"><span className="font-bold shrink-0">{referenceStepNumber}</span> {t('pendingPayment.step4', { ref: reference })}</li>}
          <li className="flex gap-2"><span className="font-bold shrink-0">{checkStepNumber}</span> {t('pendingPayment.step5')}</li>
        </ol>
        <p className="mt-3 text-xs text-amber-700">
          {t('pendingPayment.manualApprovalNote')}
        </p>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-11 shadow-md shadow-blue-500/20"
        onClick={handleCheckStatus}
        disabled={checking}
      >
        {checking ? t('pendingPayment.checking') : t('pendingPayment.checkStatusDone')}
      </Button>
    </AuthLayout>
  );
}
