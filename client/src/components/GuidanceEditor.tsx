import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GuidanceItem } from '@/types';

interface Props { eventId: string }

export default function GuidanceEditor({ eventId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<GuidanceItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });

  const { data } = useQuery({
    queryKey: ['guidance', eventId],
    queryFn: () => api.get(`/events/${eventId}/guidance`).then(r => r.data),
  });
  const items: GuidanceItem[] = data?.items || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['guidance', eventId] });

  const addMutation = useMutation({
    mutationFn: (body: typeof form) => api.post(`/events/${eventId}/guidance`, body),
    onSuccess: () => { toast.success(t('guidance.itemAdded')); setAdding(false); setForm({ title: '', body: '' }); invalidate(); },
    onError: () => toast.error(t('guidance.addError')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: typeof form }) => api.put(`/events/${eventId}/guidance/${id}`, body),
    onSuccess: () => { toast.success(t('guidance.itemUpdated')); setEditing(null); invalidate(); },
    onError: () => toast.error(t('guidance.updateError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${eventId}/guidance/${id}`),
    onSuccess: () => { toast.success(t('guidance.itemDeleted')); invalidate(); },
    onError: () => toast.error(t('guidance.deleteError')),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => api.patch(`/events/${eventId}/guidance/reorder`, { order }),
    onSuccess: invalidate,
  });

  function moveItem(index: number, dir: -1 | 1) {
    const newItems = [...items];
    const swap = index + dir;
    if (swap < 0 || swap >= newItems.length) return;
    [newItems[index], newItems[swap]] = [newItems[swap], newItems[index]];
    reorderMutation.mutate(newItems.map(i => i.id));
  }

  function startEdit(item: GuidanceItem) {
    setEditing(item);
    setForm({ title: item.title, body: item.body });
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    setForm({ title: '', body: '' });
  }

  const FormBlock = ({ onSubmit, onCancel, submitting }: { onSubmit: () => void; onCancel: () => void; submitting: boolean }) => (
    <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
      <div className="space-y-1">
        <Label className="text-xs font-medium text-slate-600">{t('guidance.sectionTitle')} <span className="text-red-500">*</span></Label>
        <Input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder={t('guidance.sectionTitlePlaceholder')}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium text-slate-600">{t('guidance.sectionBody')} <span className="text-red-500">*</span></Label>
        <Textarea
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder={t('guidance.sectionBodyPlaceholder')}
          rows={2}
          className="text-sm resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button size="sm" onClick={onSubmit} disabled={!form.title.trim() || !form.body.trim() || submitting}>{t('common.save')}</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{t('guidance.subtitle')}</p>
        {!adding && !editing && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> {t('guidance.addItem')}
          </Button>
        )}
      </div>

      {adding && (
        <FormBlock
          onSubmit={() => addMutation.mutate(form)}
          onCancel={() => setAdding(false)}
          submitting={addMutation.isPending}
        />
      )}

      {items.length === 0 && !adding ? (
        <div className="text-center py-8 text-slate-400">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">{t('guidance.noItems')}</p>
          <p className="text-xs">{t('guidance.noItemsSubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id}>
              {editing?.id === item.id ? (
                <FormBlock
                  onSubmit={() => updateMutation.mutate({ id: item.id, body: form })}
                  onCancel={() => setEditing(null)}
                  submitting={updateMutation.isPending}
                />
              ) : (
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 group hover:border-slate-300 transition-colors">
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{item.body}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(item.id)}>
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
  );
}
