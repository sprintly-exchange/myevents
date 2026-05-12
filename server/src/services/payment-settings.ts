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
  method_name: string;
  recipient_label: string;
  recipient_value: string;
  holder_label: string;
  holder_value: string;
  qr_template: string;
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
