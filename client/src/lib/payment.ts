export interface PaymentSettings {
  id?: string;
  country_code?: string;
  method_name: string;
  recipient_label: string;
  recipient_value: string;
  holder_label: string;
  holder_value: string;
  qr_template?: string;
  is_default?: boolean;
  priority?: number;
}

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => values[key] ?? '');
}

export function buildPaymentQrValue(
  payment: PaymentSettings | null | undefined,
  options: { amount: number; currency: string; reference: string; appName: string }
) {
  if (!payment) return '';

  if (payment.qr_template?.trim()) {
    return fillTemplate(payment.qr_template, {
      amount: String(options.amount),
      currency: options.currency,
      reference: options.reference,
      recipient: payment.recipient_value,
      holder: payment.holder_value,
      app_name: options.appName,
    });
  }

  if (payment.method_name.trim().toLowerCase() === 'swish' && payment.recipient_value) {
    return `swish://payment?version=1&payee=${payment.recipient_value}&amount=${options.amount}&message=${encodeURIComponent(options.reference || options.appName)}&editable=false`;
  }

  return '';
}
