import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Zap, Star, Copy, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { buildPaymentQrValue, type PaymentSettings } from '@/lib/payment';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/types';

interface PaymentInfo {
  reference: string;
  planName: string;
  planPrice: number;
  planCurrency: string;
  payment: PaymentSettings;
}

export default function UpgradePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(r => r.data),
  });

  const plans: Plan[] = data?.plans || [];

  const upgradeMutation = useMutation({
    mutationFn: (planId: string) => api.post('/upgrade-requests', { plan_id: planId }),
    onSuccess: (res) => {
      const { request, swish } = res.data;
      const payment: PaymentSettings = res.data.payment || {
        method_name: 'Swish',
        recipient_label: t('upgrade.paymentDestination'),
        recipient_value: swish?.number || '',
        holder_label: t('upgrade.recipient'),
        holder_value: swish?.holder || '',
        qr_template: '',
      };
      setPaymentInfo({
        reference: request.payment_reference,
        planName: request.plan_name,
        planPrice: request.plan_price,
        planCurrency: request.plan_currency || 'SEK',
        payment,
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Request failed'),
  });

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const paymentQrData = buildPaymentQrValue(paymentInfo?.payment, {
    amount: paymentInfo?.planPrice || 0,
    currency: paymentInfo?.planCurrency || 'SEK',
    reference: paymentInfo?.reference || '',
    appName: 'MyEvents',
  });

  const baseFeatures: Record<string, string[]> = {
    Basic: ['Email invitations', 'RSVP tracking', 'Email templates'],
    Pro: ['Everything in Basic', 'Priority support', 'Advanced analytics'],
    Unlimited: ['Everything in Pro', 'Custom templates', 'Dedicated support'],
  };

  const getPlanFeatures = (plan: Plan) => {
    const eventLine = plan.event_limit === -1
      ? 'Unlimited events'
      : `Up to ${plan.event_limit} event${plan.event_limit !== 1 ? 's' : ''}`;
    return [eventLine, ...(baseFeatures[plan.name] || [])];
  };

  if (paymentInfo) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('upgrade.completePayment')}</h1>
              <p className="text-slate-500 text-sm">{t('upgrade.completePaymentSubtitle', { method: paymentInfo.payment.method_name })}</p>
            </div>

            {/* Reference code */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 mb-5 text-white text-center shadow-lg shadow-blue-500/20">
              <p className="text-sm text-blue-200 mb-2 font-medium uppercase tracking-wide">{t('upgrade.paymentReference')}</p>
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-4xl font-mono font-bold tracking-widest">{paymentInfo.reference}</span>
                <button
                  onClick={() => copyRef(paymentInfo.reference)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-blue-200 text-xs">{t('upgrade.includeReference')}</p>
            </div>

            {/* Payment details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('upgrade.paymentDetails')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.plan')}</span>
                  <span className="font-semibold text-slate-800">{paymentInfo.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('upgrade.amount')}</span>
                  <span className="font-bold text-lg text-blue-600">{paymentInfo.planPrice} {paymentInfo.planCurrency}</span>
                </div>
                {paymentInfo.payment.recipient_value && (
                  <>
                    <div className="border-t border-slate-100 pt-3 flex justify-between">
                      <span className="text-slate-500">{paymentInfo.payment.recipient_label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">{paymentInfo.payment.recipient_value}</span>
                        <button onClick={() => copyRef(paymentInfo.payment.recipient_value)} className="text-slate-400 hover:text-slate-600">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {paymentInfo.payment.holder_value && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">{paymentInfo.payment.holder_label}</span>
                        <span className="font-semibold text-slate-800">{paymentInfo.payment.holder_value}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* QR code */}
            {paymentQrData && (
              <div className="flex flex-col items-center bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
                <p className="text-sm text-slate-500 mb-4">{t('upgrade.scanQr', { method: paymentInfo.payment.method_name })}</p>
                <div className="p-4 bg-white rounded-xl border border-slate-100">
                  <QRCodeSVG value={paymentQrData} size={180} />
                </div>
                <p className="text-xs text-slate-400 mt-3 text-center">
                  {t('upgrade.qrSubtitle', { method: paymentInfo.payment.method_name })}
                </p>
              </div>
            )}

            {/* Steps */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <p className="text-sm font-semibold text-amber-800 mb-3">{t('upgrade.howToPay')}</p>
              <ol className="space-y-2 text-sm text-amber-700">
                <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> {t('upgrade.step1')}</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">2.</span> {t('upgrade.step2', { method: paymentInfo.payment.method_name })}</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">3.</span> {t('upgrade.step3', { price: paymentInfo.planPrice, currency: paymentInfo.planCurrency })}</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">4.</span> {t('upgrade.step4', { ref: paymentInfo.reference })}</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">5.</span> {t('upgrade.step5')}</li>
              </ol>
            </div>

            <Button
              variant="outline"
              className="w-full border-slate-200"
              onClick={() => setPaymentInfo(null)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('upgrade.chooseDifferentPlan')}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-4">
            <Star className="h-3.5 w-3.5" />
            {t('upgrade.plansAndPricing')}
          </div>
          <h1 className="text-3xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('upgrade.title')}
            </span>
          </h1>
          <p className="text-slate-500 max-w-md mx-auto">
            {t('upgrade.subtitle')}
          </p>
          {user?.plan_name && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-sm text-slate-600">
              {t('upgrade.currentPlan', { name: user.plan_name })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === user?.plan_id;
            const isPaid = user?.payment_status === 'paid';
            const isPopular = plan.name === 'Pro';
            const planFeatures = getPlanFeatures(plan);
            const planCurrency = plan.currency ?? 'SEK';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-sm border transition-all ${
                  isPopular
                    ? 'border-blue-300 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10 bg-gradient-to-b from-blue-50/50 to-white'
                    : 'border-slate-200/70 hover:shadow-md'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-md">
                      <Zap className="h-3 w-3 mr-1" />{t('upgrade.mostPopular')}
                    </Badge>
                  </div>
                )}

                <div className="p-6 pb-4 text-center border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h2>
                  {plan.description && (
                    <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                  )}
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className="text-4xl font-bold text-slate-900">{plan.price_sek}</span>
                    <span className="text-slate-500 text-sm">{planCurrency}</span>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <ul className="space-y-3">
                    {planFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan && isPaid ? (
                    <Button
                      className="w-full bg-slate-100 text-slate-500 hover:bg-slate-100 cursor-default"
                      disabled
                    >
                      <Check className="h-4 w-4 mr-2" />{t('upgrade.currentPlanButton')}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        isCurrentPlan
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                          : isPopular
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20'
                          : ''
                      }`}
                      variant={isCurrentPlan || isPopular ? 'default' : 'outline'}
                      onClick={() => upgradeMutation.mutate(plan.id)}
                      disabled={upgradeMutation.isPending}
                    >
                      {upgradeMutation.isPending
                        ? t('upgrade.requesting')
                        : isCurrentPlan
                          ? t('upgrade.payNow')
                          : t('upgrade.selectPlan', { name: plan.name })}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
