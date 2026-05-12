import prisma from '../db';

const PAYMENT_SETTING_KEYS = [
  'payment_method_name',
  'payment_recipient_label',
  'payment_recipient_value',
  'payment_holder_label',
  'payment_holder_name',
  'payment_qr_template',
  'swish_number',
  'swish_holder_name',
] as const;

export interface PaymentSettings {
  id?: string;
  country_code?: string;
  method_name: string;
  recipient_label: string;
  recipient_value: string;
  holder_label: string;
  holder_value: string;
  qr_template: string;
  is_default?: boolean;
  priority?: number;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [...PAYMENT_SETTING_KEYS] } },
  }) as Array<{ key: string; value: string | null }>;

  const valueOf = (key: (typeof PAYMENT_SETTING_KEYS)[number]) =>
    rows.find(row => row.key === key)?.value?.trim() || '';

  const methodName = valueOf('payment_method_name') || 'Swish';
  const recipientValue = valueOf('payment_recipient_value') || valueOf('swish_number');
  const holderValue = valueOf('payment_holder_name') || valueOf('swish_holder_name');

  return {
    method_name: methodName,
    recipient_label: valueOf('payment_recipient_label') || (methodName === 'Swish' ? 'Swish number' : 'Payment details'),
    recipient_value: recipientValue,
    holder_label: valueOf('payment_holder_label') || 'Recipient',
    holder_value: holderValue,
    qr_template: valueOf('payment_qr_template'),
  };
}

export function normalizeCountryCode(country?: string | null): string {
  const normalized = (country || '').trim().toUpperCase();
  return normalized || 'GLOBAL';
}

function mapPaymentProfile(profile: any): PaymentSettings {
  return {
    id: profile.id,
    country_code: profile.countryCode,
    method_name: profile.methodName,
    recipient_label: profile.recipientLabel,
    recipient_value: profile.recipientValue,
    holder_label: profile.holderLabel,
    holder_value: profile.holderValue,
    qr_template: profile.qrTemplate || '',
    is_default: !!profile.isDefault,
    priority: profile.priority ?? 100,
  };
}

function sortProfilesForCountry<T extends { countryCode: string; isDefault: boolean; priority: number }>(
  profiles: T[],
  countryCode: string
): T[] {
  return [...profiles].sort((a, b) => {
    const aLocal = a.countryCode === countryCode ? 0 : 1;
    const bLocal = b.countryCode === countryCode ? 0 : 1;
    if (aLocal !== bLocal) return aLocal - bLocal;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return 0;
  });
}

export async function getPaymentSettingsForCountry(country?: string | null): Promise<{
  selected: PaymentSettings;
  methods: PaymentSettings[];
}> {
  const countryCode = normalizeCountryCode(country);
  const profiles = await prisma.paymentProfile.findMany({
    where: {
      isActive: true,
      OR: [{ countryCode }, { countryCode: 'GLOBAL' }],
    },
  });

  if (profiles.length === 0) {
    const legacy = await getPaymentSettings();
    return {
      selected: { ...legacy, country_code: 'GLOBAL' },
      methods: [{ ...legacy, country_code: 'GLOBAL' }],
    };
  }

  const sorted = sortProfilesForCountry(profiles, countryCode);
  const methods = sorted.map(mapPaymentProfile);
  return { selected: methods[0], methods };
}

export async function getPaymentProfileById(id: string) {
  if (!id) return null;
  return prisma.paymentProfile.findUnique({ where: { id } });
}
