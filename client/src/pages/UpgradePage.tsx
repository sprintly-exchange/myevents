import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Zap, Star } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/types';

export default function UpgradePage() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(r => r.data),
  });

  const plans: Plan[] = data?.plans || [];

  const upgradeMutation = useMutation({
    mutationFn: (planId: string) => api.post('/upgrade-requests', { plan_id: planId }),
    onSuccess: () => toast.success('Upgrade request submitted! Admin will review it shortly.'),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Request failed'),
  });

  const features: Record<string, string[]> = {
    Basic: ['Up to 5 events', 'Email invitations', 'RSVP tracking', 'Email templates'],
    Pro: ['Up to 20 events', 'Everything in Basic', 'Priority support', 'Advanced analytics'],
    Unlimited: ['Unlimited events', 'Everything in Pro', 'Custom templates', 'Dedicated support'],
  };

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
            Choose the plan that works best for you. All plans include unlimited invitations per event.
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
                    <span className="text-slate-500 text-sm">SEK/mo</span>
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
                      {upgradeMutation.isPending ? 'Requesting...' : `Upgrade to ${plan.name}`}
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
