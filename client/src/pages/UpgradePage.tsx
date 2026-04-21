import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Zap } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      <div className="p-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Upgrade Your Plan</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Choose the plan that works best for you. All plans include unlimited invitations per event.
          </p>
          {user?.plan_name && (
            <p className="mt-3 text-sm text-blue-600">
              Current plan: <strong>{user.plan_name}</strong>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === user?.plan_id;
            const isPopular = plan.name === 'Pro';
            const planFeatures = features[plan.name] || [];

            return (
              <Card key={plan.id} className={`relative ${isPopular ? 'border-primary shadow-lg ring-2 ring-primary' : ''}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-3 py-1"><Zap className="h-3 w-3 mr-1" />Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price_sek}</span>
                    <span className="text-gray-500"> SEK/mo</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.event_limit === -1 ? 'Unlimited events' : `Up to ${plan.event_limit} events`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {planFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="outline" disabled>Current Plan</Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => upgradeMutation.mutate(plan.id)}
                      disabled={upgradeMutation.isPending}
                    >
                      {upgradeMutation.isPending ? 'Requesting...' : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
