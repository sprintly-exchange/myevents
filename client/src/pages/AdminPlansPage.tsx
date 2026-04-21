import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Check, Star, Pencil, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/types';

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', event_limit: 10, price_sek: 99, description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', event_limit: 0, price_sek: 0, description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/plans', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success(t('admin.plans.planCreated'));
      setShowForm(false);
      setForm({ name: '', event_limit: 10, price_sek: 99, description: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editForm }) => api.put(`/plans/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success(t('admin.plans.planUpdated'));
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); toast.success(t('admin.plans.planDeleted')); },
    onError: () => toast.error('Failed to deactivate'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.post(`/plans/${id}/set-default`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); toast.success('Default plan updated'); },
    onError: () => toast.error('Failed'),
  });

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setEditForm({ name: plan.name, event_limit: plan.event_limit, price_sek: plan.price_sek, description: plan.description || '' });
  };

  const plans: Plan[] = data?.plans || [];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('admin.plans.title')}</h1>
            <p className="text-slate-500 mt-1">{t('admin.plans.subtitle')}</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Plus className="h-4 w-4 mr-2" />{t('admin.plans.addPlan')}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700">New Plan</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">{t('admin.plans.planName')}</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border-slate-200 focus:border-blue-400" placeholder="Enterprise" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">{t('admin.plans.eventLimit')}</Label>
                  <Input type="number" value={form.event_limit} onChange={e => setForm({ ...form, event_limit: parseInt(e.target.value) })} className="border-slate-200 focus:border-blue-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">{t('admin.plans.price')}</Label>
                  <Input type="number" value={form.price_sek} onChange={e => setForm({ ...form, price_sek: parseFloat(e.target.value) })} className="border-slate-200 focus:border-blue-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Description</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border-slate-200 focus:border-blue-400" placeholder="Short description" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {createMutation.isPending ? 'Creating...' : 'Create Plan'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan: Plan) => (
              <div key={plan.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${plan.is_default ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200/70'}`}>
                <div className={`h-1.5 w-full ${plan.is_default ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-slate-300 to-slate-400'}`} />

                {editingId === plan.id ? (
                  <div className="p-6 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">{t('admin.plans.planName')}</Label>
                      <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-9 text-sm border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">{t('admin.plans.eventLimit')}</Label>
                      <Input type="number" value={editForm.event_limit} onChange={e => setEditForm({ ...editForm, event_limit: parseInt(e.target.value) })} className="h-9 text-sm border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">{t('admin.plans.price')}</Label>
                      <Input type="number" value={editForm.price_sek} onChange={e => setEditForm({ ...editForm, price_sek: parseFloat(e.target.value) })} className="h-9 text-sm border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Description</Label>
                      <Input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="h-9 text-sm border-slate-200" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs flex-1" onClick={() => updateMutation.mutate({ id: plan.id, data: editForm })} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? t('events.saving') : t('common.save')}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      {plan.is_default && (
                        <Badge className="bg-blue-100 text-blue-700 border-0">
                          <Star className="h-3 w-3 mr-1" />{t('admin.plans.default')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold text-slate-900">{plan.event_limit === -1 ? '∞' : plan.event_limit}</span>
                      <span className="text-sm text-slate-400">events</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-1">{plan.description}</p>
                    <p className="text-sm font-medium text-slate-700 mb-5">{plan.price_sek} SEK</p>
                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <Button size="sm" variant="outline" className="border-slate-200 hover:bg-slate-50 text-xs" onClick={() => startEdit(plan)}>
                        <Pencil className="h-3 w-3 mr-1" />{t('common.edit')}
                      </Button>
                      {!plan.is_default && (
                        <Button size="sm" variant="outline" className="border-slate-200 hover:bg-slate-50 text-xs" onClick={() => setDefaultMutation.mutate(plan.id)}>
                          <Check className="h-3 w-3 mr-1" />{t('admin.plans.setDefault')}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 ml-auto" onClick={() => { if (confirm('Deactivate this plan?')) deleteMutation.mutate(plan.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
