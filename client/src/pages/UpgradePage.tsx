import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Zap, Star, Copy, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/types';

interface PaymentInfo {
  reference: string;
  planName: string;
  planPrice: number;
  swishNumber: string;
  swishHolder: string;
}

export default function UpgradePage() {
  const { user } = useAuth();
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
      setPaymentInfo({
        reference: request.payment_reference,
        planName: request.plan_name,
        planPrice: request.plan_price,
        swishNumber: swish.number,
        swishHolder: swish.holder,
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Request failed'),
  });

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const swishQrData = paymentInfo?.swishNumber
    ? `swish://payment?data={"version":1,"payee":{"value":"${paymentInfo.swishNumber}","editable":false},"amount":{"value":${paymentInfo.planPrice},"editable":false},"message":{"value":"${paymentInfo.reference}","editable":false}}`
    : '';

  const features: Record<string, string[]> = {
    Basic: ['Up to 5 events', 'Email invitations', 'RSVP tracking', 'Email templates'],
    Pro: ['Up to 20 events', 'Everything in Basic', 'Priority support', 'Advanced analytics'],
    Unlimited: ['Unlimited events', 'Everything in Pro', 'Custom templates', 'Dedicated support'],
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
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Complete Your Payment</h1>
              <p className="text-slate-500 text-sm">Send payment via Swish with your unique reference code</p>
            </div>

            {/* Reference code */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 mb-5 text-white text-center shadow-lg shadow-blue-500/20">
              <p className="text-sm text-blue-200 mb-2 font-medium uppercase tracking-wide">Your Payment Reference</p>
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-4xl font-mono font-bold tracking-widest">{paymentInfo.reference}</span>
                <button
                  onClick={() => copyRef(paymentInfo.reference)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-blue-200 text-xs">Include this reference in your Swish message</p>
            </div>

            {/* Payment details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Payment Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-semibold text-slate-800">{paymentInfo.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-lg text-blue-600">{paymentInfo.planPrice} SEK</span>
                </div>
                {paymentInfo.swishNumber && (
                  <>
                    <div className="border-t border-slate-100 pt-3 flex justify-between">
                      <span className="text-slate-500">Swish number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">{paymentInfo.swishNumber}</span>
                        <button onClick={() => copyRef(paymentInfo.swishNumber)} className="text-slate-400 hover:text-slate-600">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Recipient</span>
                      <span className="font-semibold text-slate-800">{paymentInfo.swishHolder}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* QR code */}
            {swishQrData && (
              <div className="flex flex-col items-center bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
                <p className="text-sm text-slate-500 mb-4">Scan to open Swish automatically</p>
                <div className="p-4 bg-white rounded-xl border border-slate-100">
                  <QRCodeSVG value={swishQrData} size={180} />
                </div>
                <p className="text-xs text-slate-400 mt-3 text-center">
                  The QR code pre-fills the amount, recipient, and your reference code
                </p>
              </div>
            )}

            {/* Steps */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <p className="text-sm font-semibold text-amber-800 mb-3">How to pay</p>
              <ol className="space-y-2 text-sm text-amber-700">
                <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> Open Swish on your phone</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">2.</span> Scan the QR code or enter the number manually</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">3.</span> Send <strong>{paymentInfo.planPrice} SEK</strong></li>
                <li className="flex gap-2"><span className="font-bold shrink-0">4.</span> In the message field, enter your reference: <strong>{paymentInfo.reference}</strong></li>
                <li className="flex gap-2"><span className="font-bold shrink-0">5.</span> Wait for admin confirmation — usually within 24 hours</li>
              </ol>
            </div>

            <Button
              variant="outline"
              className="w-full border-slate-200"
              onClick={() => setPaymentInfo(null)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Choose a Different Plan
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
            Plans & Pricing
          </div>
          <h1 className="text-3xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Choose Your Plan
            </span>
          </h1>
          <p className="text-slate-500 max-w-md mx-auto">
            Choose the plan that works best for you. Pay via Swish — activated by admin after verification.
          </p>
          {user?.plan_name && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-sm text-slate-600">
              Current plan: <strong className="text-slate-800">{user.plan_name}</strong>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === user?.plan_id;
            const isPopular = plan.name === 'Pro';
            const planFeatures = features[plan.name] || [];

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
                      <Zap className="h-3 w-3 mr-1" />Most Popular
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
                    <span className="text-slate-500 text-sm">SEK</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {plan.event_limit === -1 ? 'Unlimited events' : `Up to ${plan.event_limit} events`}
                  </p>
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

                  {isCurrentPlan ? (
                    <Button
                      className="w-full bg-slate-100 text-slate-500 hover:bg-slate-100 cursor-default"
                      disabled
                    >
                      <Check className="h-4 w-4 mr-2" />Current Plan
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        isPopular
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20'
                          : ''
                      }`}
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => upgradeMutation.mutate(plan.id)}
                      disabled={upgradeMutation.isPending}
                    >
                      {upgradeMutation.isPending ? 'Requesting...' : `Select ${plan.name}`}
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
