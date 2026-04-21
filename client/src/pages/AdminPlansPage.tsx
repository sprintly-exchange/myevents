import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Check, Star, Pencil, X, Infinity, Users, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/types';

const emptyForm = { name: '', event_limit: '10', price_sek: '99', description: '' };

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [panelPlan, setPanelPlan] = useState<Plan | null | 'new'>(null); // null=closed, 'new'=create, Plan=edit
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(r => r.data),
  });

  const plans: Plan[] = data?.plans || [];

  const openNew = () => {
    setForm(emptyForm);
    setPanelPlan('new');
  };

  const openEdit = (plan: Plan) => {
    setForm({
      name: plan.name,
      event_limit: String(plan.event_limit),
      price_sek: String(plan.price_sek),
      description: plan.description || '',
    });
    setPanelPlan(plan);
  };

  const closePanel = () => setPanelPlan(null);

  const createMutation = useMutation({
    mutationFn: () => api.post('/plans', {
      name: form.name,
      event_limit: Number(form.event_limit),
      price_sek: Number(form.price_sek),
      description: form.description,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success(t('admin.plans.planCreated'));
      closePanel();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create plan'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/plans/${id}`, {
      name: form.name,
      event_limit: Number(form.event_limit),
      price_sek: Number(form.price_sek),
      description: form.description,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success(t('admin.plans.planUpdated'));
      closePanel();
    },
    onError: () => toast.error('Failed to update plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); toast.success(t('admin.plans.planDeleted')); },
    onError: () => toast.error('Failed to deactivate plan'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.post(`/plans/${id}/set-default`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); toast.success('Default plan updated'); },
    onError: () => toast.error('Failed to set default'),
  });

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('Plan name is required');
    if (panelPlan === 'new') createMutation.mutate();
    else if (panelPlan) updateMutation.mutate(panelPlan.id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isNew = panelPlan === 'new';

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('admin.plans.title')}</h1>
            <p className="text-slate-500 mt-1">{t('admin.plans.subtitle')}</p>
          </div>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0">
            <Plus className="h-4 w-4 mr-2" />{t('admin.plans.addPlan')}
          </Button>
        </div>

        <div className={`flex gap-6 transition-all ${panelPlan ? 'items-start' : ''}`}>
          {/* Plan cards */}
          <div className={`flex-1 min-w-0 ${isLoading ? 'flex justify-center py-10' : 'grid grid-cols-1 md:grid-cols-3 gap-5'}`}>
            {isLoading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : plans.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-slate-400">
                <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No plans yet</p>
                <p className="text-sm mt-1">Click "Add Plan" to create your first subscription plan</p>
              </div>
            ) : plans.map((plan) => {
              const isEditing = typeof panelPlan === 'object' && panelPlan !== null && panelPlan.id === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                    isEditing ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-md' :
                    plan.is_default ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200/70 hover:shadow-md'
                  }`}
                >
                  {/* Colour bar */}
                  <div className={`h-1.5 w-full ${plan.is_default ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-slate-200'}`} />

                  <div className="p-5">
                    {/* Name + badge */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-slate-900 truncate">{plan.name}</h3>
                      {plan.is_default && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 shrink-0 ml-2">
                          <Star className="h-3 w-3 mr-1 fill-current" />{t('admin.plans.default')}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          {plan.event_limit === -1
                            ? <Infinity className="h-5 w-5 text-indigo-500" />
                            : <span className="text-2xl font-bold text-slate-900">{plan.event_limit}</span>
                          }
                        </div>
                        <p className="text-xs text-slate-400">Events</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-slate-900">{plan.price_sek}</div>
                        <p className="text-xs text-slate-400">SEK</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`text-xs border-slate-200 hover:bg-slate-50 flex-1 ${isEditing ? 'border-blue-300 text-blue-600 bg-blue-50' : ''}`}
                        onClick={() => isEditing ? closePanel() : openEdit(plan)}
                      >
                        {isEditing ? <><X className="h-3 w-3 mr-1" />Cancel</> : <><Pencil className="h-3 w-3 mr-1" />{t('common.edit')}</>}
                      </Button>
                      {!plan.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-slate-200 hover:bg-slate-50 flex-1"
                          onClick={() => setDefaultMutation.mutate(plan.id)}
                          disabled={setDefaultMutation.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />{t('admin.plans.setDefault')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { if (confirm('Deactivate this plan? Users on this plan won\'t be affected.')) deleteMutation.mutate(plan.id); }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit / Create panel */}
          {panelPlan && (
            <div className="w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  {isNew ? 'New Plan' : `Edit "${typeof panelPlan !== 'string' && panelPlan.name}"`}
                </h2>
                <button onClick={closePanel} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('admin.plans.planName')}</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Enterprise"
                    className="border-slate-200 focus:border-blue-400 h-10"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</Label>
                  <Input
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Short plan description"
                    className="border-slate-200 focus:border-blue-400 h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {t('admin.plans.eventLimit')}
                    </Label>
                    <Input
                      type="number"
                      value={form.event_limit}
                      onChange={e => setForm({ ...form, event_limit: e.target.value })}
                      className="border-slate-200 focus:border-blue-400 h-10"
                    />
                    <p className="text-xs text-slate-400">Use -1 for unlimited</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Price (SEK)
                    </Label>
                    <Input
                      type="number"
                      value={form.price_sek}
                      onChange={e => setForm({ ...form, price_sek: e.target.value })}
                      className="border-slate-200 focus:border-blue-400 h-10"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Preview</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{form.name || 'Plan name'}</span>
                    <span className="text-blue-600 font-bold">{form.price_sek || '0'} SEK</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    {form.event_limit === '-1' ? 'Unlimited events' : `Up to ${form.event_limit || 0} events`}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : isNew ? 'Create Plan' : t('common.save')}
                  </Button>
                  <Button variant="outline" onClick={closePanel} className="border-slate-200">
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

