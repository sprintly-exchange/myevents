import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, CreditCard, Lock, Send, Users, Pencil, Power, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PaymentProfile {
  id: string;
  country_code: string;
  method_name: string;
  recipient_label: string;
  recipient_value: string;
  holder_label: string;
  holder_value: string;
  qr_template?: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
}

const COMMON_COUNTRIES = [
  { value: 'GLOBAL', labelKey: 'admin.settings.countryOptionGlobal' },
  { value: 'SE', labelKey: 'admin.settings.countryOptionSE' },
  { value: 'NO', labelKey: 'admin.settings.countryOptionNO' },
  { value: 'DK', labelKey: 'admin.settings.countryOptionDK' },
  { value: 'FI', labelKey: 'admin.settings.countryOptionFI' },
];

const getDefaultPaymentForm = () => ({
  id: '',
  country_code: 'SE',
  payment_method_name: 'Swish',
  payment_recipient_label: 'Swish number',
  payment_recipient_value: '',
  payment_holder_label: 'Recipient',
  payment_holder_name: '',
  payment_qr_template: '',
  is_default: true,
  priority: '100',
  is_active: true,
});

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '',
  });
  const [paymentForm, setPaymentForm] = useState(getDefaultPaymentForm());
  const [countryPreset, setCountryPreset] = useState<'GLOBAL' | 'SE' | 'NO' | 'DK' | 'FI' | 'OTHER'>('SE');
  const [freeTierForm, setFreeTierForm] = useState({ free_tier_invite_limit: '1' });
  const [testEmail, setTestEmail] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data),
  });
  const { data: paymentProfilesData } = useQuery({
    queryKey: ['admin-payment-profiles'],
    queryFn: () => api.get('/admin/payment-profiles').then(r => r.data),
  });

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setSmtpForm({
        smtp_host: s.smtp_host || '',
        smtp_port: s.smtp_port || '587',
        smtp_user: s.smtp_user || '',
        smtp_pass: s.smtp_pass || '',
        smtp_from: s.smtp_from || '',
      });
      setPaymentForm({
        ...getDefaultPaymentForm(),
        payment_method_name: s.payment_method_name || 'Swish',
        payment_recipient_label: s.payment_recipient_label || 'Swish number',
        payment_recipient_value: s.payment_recipient_value || s.swish_number || '',
        payment_holder_label: s.payment_holder_label || 'Recipient',
        payment_holder_name: s.payment_holder_name || s.swish_holder_name || '',
        payment_qr_template: s.payment_qr_template || '',
      });
      setFreeTierForm({ free_tier_invite_limit: s.free_tier_invite_limit || '1' });
    }
  }, [data]);

  useEffect(() => {
    const normalized = (paymentForm.country_code || '').toUpperCase();
    if (COMMON_COUNTRIES.some((country) => country.value === normalized)) {
      setCountryPreset(normalized as 'GLOBAL' | 'SE' | 'NO' | 'DK' | 'FI');
      return;
    }
    setCountryPreset('OTHER');
  }, [paymentForm.country_code]);

  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const changePassword = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post('/admin/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to change password'),
  });

  const handleChangePassword = () => {
    if (passwordForm.new_password !== passwordForm.confirm_password)
      return toast.error('New passwords do not match');
    changePassword.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  const saveSettings = useMutation({
    mutationFn: (settings: { key: string; value: string }[]) =>
      api.post('/admin/settings', { settings }),
    onSuccess: () => toast.success(t('admin.settings.settingsSaved')),
    onError: () => toast.error('Failed to save settings'),
  });

  const testEmailMutation = useMutation({
    mutationFn: (to: string) => api.post('/admin/settings/test-email', { to }),
    onSuccess: () => toast.success(t('admin.settings.testEmailSent')),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to send test email'),
  });

  const saveSmtp = () => {
    const settings = Object.entries(smtpForm).map(([key, value]) => ({ key, value }));
    saveSettings.mutate(settings);
  };

  const savePaymentProfile = useMutation({
    mutationFn: (payload: Record<string, any>) => api.post('/admin/payment-profiles', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payment-profiles'] });
      toast.success(t('admin.settings.paymentProfileSaved'));
      setPaymentForm(getDefaultPaymentForm());
    },
    onError: () => toast.error(t('admin.settings.paymentProfileSaveFailed')),
  });

  const deactivatePaymentProfile = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/payment-profiles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payment-profiles'] });
      toast.success(t('admin.settings.paymentProfileDeactivated'));
      if (paymentForm.id) setPaymentForm(getDefaultPaymentForm());
    },
    onError: () => toast.error(t('admin.settings.paymentProfileDeactivateFailed')),
  });

  const reorderPaymentProfiles = useMutation({
    mutationFn: (payloads: Record<string, any>[]) => Promise.all(payloads.map((payload) => api.post('/admin/payment-profiles', payload))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payment-profiles'] });
      toast.success(t('admin.settings.paymentProfileOrderUpdated'));
    },
    onError: () => toast.error(t('admin.settings.paymentProfileOrderUpdateFailed')),
  });

  const savePayment = () => {
    savePaymentProfile.mutate({
      id: paymentForm.id || undefined,
      country_code: paymentForm.country_code,
      method_name: paymentForm.payment_method_name,
      recipient_label: paymentForm.payment_recipient_label,
      recipient_value: paymentForm.payment_recipient_value,
      holder_label: paymentForm.payment_holder_label,
      holder_value: paymentForm.payment_holder_name,
      qr_template: paymentForm.payment_qr_template,
      is_default: paymentForm.is_default,
      priority: Number(paymentForm.priority),
      is_active: paymentForm.is_active,
    });
  };

  const saveFreeTier = () => {
    saveSettings.mutate([{ key: 'free_tier_invite_limit', value: freeTierForm.free_tier_invite_limit }]);
  };

  const paymentProfiles: PaymentProfile[] = paymentProfilesData?.profiles || [];

  const startEditingPaymentProfile = (profile: PaymentProfile) => {
    setPaymentForm({
      id: profile.id,
      country_code: profile.country_code || 'GLOBAL',
      payment_method_name: profile.method_name || '',
      payment_recipient_label: profile.recipient_label || '',
      payment_recipient_value: profile.recipient_value || '',
      payment_holder_label: profile.holder_label || '',
      payment_holder_name: profile.holder_value || '',
      payment_qr_template: profile.qr_template || '',
      is_default: !!profile.is_default,
      priority: String(profile.priority ?? 100),
      is_active: !!profile.is_active,
    });
  };

  const movePaymentProfile = (profile: PaymentProfile, direction: 'up' | 'down') => {
    const countryProfiles = paymentProfiles
      .filter((item) => item.country_code === profile.country_code)
      .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    const currentIndex = countryProfiles.findIndex((item) => item.id === profile.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const target = countryProfiles[targetIndex];
    if (!target || currentIndex < 0) return;

    const updatePayload = (item: PaymentProfile, priority: number) => ({
      id: item.id,
      country_code: item.country_code,
      method_name: item.method_name,
      recipient_label: item.recipient_label,
      recipient_value: item.recipient_value,
      holder_label: item.holder_label,
      holder_value: item.holder_value,
      qr_template: item.qr_template || '',
      is_default: item.is_default,
      is_active: item.is_active,
      priority,
    });

    reorderPaymentProfiles.mutate([
      updatePayload(profile, target.priority ?? 100),
      updatePayload(target, profile.priority ?? 100),
    ]);
  };

  const fieldClass = "border-slate-200 focus:border-blue-400 h-10";

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.settings.title')}</h1>
          <p className="text-slate-500 mt-1">{t('admin.settings.subtitle')}</p>
        </div>

        <Tabs defaultValue="smtp">
          <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="smtp" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Mail className="h-3.5 w-3.5" />SMTP Email
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CreditCard className="h-3.5 w-3.5" />{t('admin.settings.paymentSettings')}
            </TabsTrigger>
            <TabsTrigger value="freetier" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-3.5 w-3.5" />Free Tier
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Lock className="h-3.5 w-3.5" />Change Password
            </TabsTrigger>
          </TabsList>

          {/* SMTP Tab */}
          <TabsContent value="smtp">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{t('admin.settings.smtpSettings')}</h2>
                    <p className="text-xs text-slate-500">Configure SMTP server for sending invitation emails</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpHost')}</Label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={smtpForm.smtp_host}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpPort')}</Label>
                    <Input
                      placeholder="587"
                      value={smtpForm.smtp_port}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpUser')}</Label>
                    <Input
                      placeholder="your@email.com"
                      value={smtpForm.smtp_user}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpPass')}</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={smtpForm.smtp_pass}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_pass: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpFrom')}</Label>
                    <Input
                      placeholder="noreply@myevents.se"
                      value={smtpForm.smtp_from}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_from: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={saveSmtp} disabled={saveSettings.isPending} className="bg-blue-600 hover:bg-blue-700">
                    {saveSettings.isPending ? t('admin.settings.saving') : 'Save SMTP Settings'}
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">{t('admin.settings.sendTestEmail')}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      className={fieldClass + ' flex-1'}
                    />
                    <Button
                      variant="outline"
                      className="border-slate-200"
                      onClick={() => testEmailMutation.mutate(testEmail)}
                      disabled={testEmailMutation.isPending || !testEmail}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {testEmailMutation.isPending ? 'Sending...' : 'Send Test'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{t('admin.settings.paymentSettings')}</h2>
                    <p className="text-xs text-slate-500">{t('admin.settings.paymentSettingsHelp')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.savedPaymentProfiles')}</Label>
                    {paymentForm.id && (
                      <Button variant="outline" className="h-8 border-slate-200 text-xs" onClick={() => setPaymentForm(getDefaultPaymentForm())}>
                        {t('admin.settings.cancelEdit')}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {paymentProfiles.length === 0 && (
                      <p className="text-xs text-slate-500">{t('admin.settings.noPaymentProfiles')}</p>
                    )}
                    {paymentProfiles.map((profile) => {
                      const sameCountryProfiles = paymentProfiles.filter((item) => item.country_code === profile.country_code);
                      const sorted = sameCountryProfiles.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
                      const index = sorted.findIndex((item) => item.id === profile.id);
                      return (
                        <div key={profile.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50/40">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{profile.method_name}</p>
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5">{profile.country_code}</span>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${profile.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                  {profile.is_active ? t('admin.settings.active') : t('admin.settings.inactive')}
                                </span>
                                {profile.is_default && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">
                                    {t('admin.settings.defaultForCountry')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {sameCountryProfiles.length > 1 && (
                                <>
                                  <Button
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-slate-200"
                                    onClick={() => movePaymentProfile(profile, 'up')}
                                    disabled={index <= 0 || reorderPaymentProfiles.isPending}
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-slate-200"
                                    onClick={() => movePaymentProfile(profile, 'down')}
                                    disabled={index >= sameCountryProfiles.length - 1 || reorderPaymentProfiles.isPending}
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="outline"
                                className="h-8 w-8 p-0 border-slate-200"
                                onClick={() => startEditingPaymentProfile(profile)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                className="h-8 w-8 p-0 border-slate-200 text-amber-700 hover:text-amber-700"
                                onClick={() => deactivatePaymentProfile.mutate(profile.id)}
                                disabled={!profile.is_active || deactivatePaymentProfile.isPending}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">{t('admin.settings.paymentPriorityHelp')}</p>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {paymentForm.id ? t('admin.settings.editPaymentProfile') : t('admin.settings.addPaymentProfile')}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {paymentForm.id ? t('admin.settings.editMode') : t('admin.settings.createMode')}
                    </span>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('common.country')}</Label>
                    <select
                      value={countryPreset}
                      onChange={(e) => {
                        const selected = e.target.value as 'GLOBAL' | 'SE' | 'NO' | 'DK' | 'FI' | 'OTHER';
                        setCountryPreset(selected);
                        if (selected !== 'OTHER') setPaymentForm({ ...paymentForm, country_code: selected });
                      }}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-400"
                    >
                      {COMMON_COUNTRIES.map((country) => (
                        <option key={country.value} value={country.value}>{t(country.labelKey)}</option>
                      ))}
                      <option value="OTHER">{t('admin.settings.otherCountryCode')}</option>
                    </select>
                    <p className="text-xs text-slate-500">{t('admin.settings.countryHelp')}</p>
                    {countryPreset === 'OTHER' && (
                      <Input
                        placeholder={t('admin.settings.countryCodePlaceholder')}
                        value={paymentForm.country_code}
                        onChange={e => setPaymentForm({ ...paymentForm, country_code: e.target.value.toUpperCase() })}
                        className={fieldClass}
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentMethodName')}</Label>
                    <Input
                      placeholder="Swish"
                      value={paymentForm.payment_method_name}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_method_name: e.target.value })}
                      className={fieldClass}
                    />
                    <p className="text-xs text-slate-500">{t('admin.settings.paymentMethodNameHelp')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentRecipientLabel')}</Label>
                    <Input
                      placeholder={t('admin.settings.paymentRecipientLabelPlaceholder')}
                      value={paymentForm.payment_recipient_label}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_recipient_label: e.target.value })}
                      className={fieldClass}
                    />
                    <p className="text-xs text-slate-500">{t('admin.settings.paymentRecipientLabelHelp')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentRecipientValue')}</Label>
                    <Input
                      placeholder={t('admin.settings.paymentRecipientValuePlaceholder')}
                      value={paymentForm.payment_recipient_value}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_recipient_value: e.target.value })}
                      className={fieldClass}
                    />
                    <p className="text-xs text-slate-500">{t('admin.settings.paymentRecipientValueHelp')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentHolderLabel')}</Label>
                    <Input
                      placeholder="Recipient"
                      value={paymentForm.payment_holder_label}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_holder_label: e.target.value })}
                      className={fieldClass}
                    />
                    <p className="text-xs text-slate-500">{t('admin.settings.paymentHolderLabelHelp')}</p>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentHolderName')}</Label>
                    <Input
                      placeholder={t('admin.settings.paymentHolderNamePlaceholder')}
                      value={paymentForm.payment_holder_name}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_holder_name: e.target.value })}
                      className={fieldClass}
                    />
                    <p className="text-xs text-slate-500">{t('admin.settings.paymentHolderNameHelp')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.defaultForCountry')}</Label>
                    <select
                      value={paymentForm.is_default ? 'yes' : 'no'}
                      onChange={e => setPaymentForm({ ...paymentForm, is_default: e.target.value === 'yes' })}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-400"
                    >
                      <option value="yes">{t('common.yes')}</option>
                      <option value="no">{t('common.no')}</option>
                    </select>
                  </div>
                </div>
                <details className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">{t('admin.settings.paymentQrAdvanced')}</summary>
                  <div className="pt-3 space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentQrTemplate')}</Label>
                    <Input
                      placeholder="swish://payment?version=1&payee={{recipient}}&amount={{amount}}&message={{reference}}&editable=false"
                      value={paymentForm.payment_qr_template}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_qr_template: e.target.value })}
                      className={fieldClass}
                    />
                    <p className="text-xs text-slate-500">{t('admin.settings.paymentQrTemplateHelp')}</p>
                  </div>
                </details>

                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">{t('admin.settings.previewTitle')}</summary>
                  <div className="pt-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{t('admin.settings.previewSubtitle')}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{t('upgrade.paymentMethod')}</span>
                          <span className="font-semibold text-slate-800">{paymentForm.payment_method_name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{paymentForm.payment_recipient_label || t('admin.settings.paymentRecipientLabel')}</span>
                          <span className="font-mono text-slate-800">{paymentForm.payment_recipient_value || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{paymentForm.payment_holder_label || t('admin.settings.paymentHolderLabel')}</span>
                          <span className="text-slate-800">{paymentForm.payment_holder_name || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>

                <Button onClick={savePayment} disabled={savePaymentProfile.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {savePaymentProfile.isPending ? t('admin.settings.saving') : t('admin.settings.savePaymentSettings')}
                </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Free Tier Tab */}
          <TabsContent value="freetier">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <Users className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Free Tier Limits</h2>
                    <p className="text-xs text-slate-500">Configure what unconfirmed (free tier) users can do</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-1.5 max-w-xs">
                  <Label className="text-sm font-medium text-slate-700">Free invitations per event</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={freeTierForm.free_tier_invite_limit}
                      onChange={e => setFreeTierForm({ free_tier_invite_limit: e.target.value })}
                      className={fieldClass + ' w-24 text-center text-lg font-semibold'}
                    />
                    <span className="text-sm text-slate-500">guests per event (0 = none until paid)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Pending users can send up to this many invitations per event before payment is required.
                    Set to <strong>0</strong> to block all invitations until payment is confirmed.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Current behaviour</p>
                  <p>Free tier users can invite up to <strong>{freeTierForm.free_tier_invite_limit || '1'}</strong> guest{freeTierForm.free_tier_invite_limit !== '1' ? 's' : ''} per event. After that, they see an upgrade prompt.</p>
                </div>

                <Button onClick={saveFreeTier} disabled={saveSettings.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {saveSettings.isPending ? t('admin.settings.saving') : 'Save Free Tier Settings'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Lock className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Change Password</h2>
                    <p className="text-xs text-slate-500">Update your admin account password</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Current Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.current_password}
                    onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.confirm_password}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={changePassword.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {changePassword.isPending ? 'Saving...' : 'Change Password'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
