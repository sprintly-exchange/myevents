import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Check } from 'lucide-react';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/types';

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', event_limit: 10, price_sek: 99, description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/plans', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan created');
      setShowForm(false);
      setForm({ name: '', event_limit: 10, price_sek: 99, description: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan deactivated');
    },
    onError: () => toast.error('Failed to deactivate'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.post(`/plans/${id}/set-default`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Default plan updated');
    },
    onError: () => toast.error('Failed'),
  });

  const plans: Plan[] = data?.plans || [];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
            <p className="text-gray-500 mt-1">Manage subscription plans</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />Add Plan
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">New Plan</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Event Limit (-1 = unlimited)</Label>
                  <Input type="number" value={form.event_limit} onChange={e => setForm({ ...form, event_limit: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Price (SEK)</Label>
                  <Input type="number" value={form.price_sek} onChange={e => setForm({ ...form, price_sek: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Plan'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan: Plan) => (
              <Card key={plan.id} className={plan.is_default ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="flex gap-1">
                      {plan.is_default ? <Badge>Default</Badge> : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-3xl font-bold">{plan.price_sek} <span className="text-sm font-normal text-gray-500">SEK/mo</span></p>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                  <p className="text-sm text-gray-500">
                    {plan.event_limit === -1 ? 'Unlimited events' : `${plan.event_limit} events`}
                  </p>
                  <div className="flex gap-2 pt-2">
                    {!plan.is_default && (
                      <Button size="sm" variant="outline" onClick={() => setDefaultMutation.mutate(plan.id)}>
                        <Check className="h-3 w-3 mr-1" />Set Default
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-red-500"
                      onClick={() => { if (confirm('Deactivate this plan?')) deleteMutation.mutate(plan.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
