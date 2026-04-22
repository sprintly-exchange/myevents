export interface ThemeSettings {
  primary_color?: string;
  accent_color?: string;
  tagline?: string;
}

export interface Plan {
  id: string;
  name: string;
  event_limit: number;
  guest_limit: number;
  price_sek: number;
  currency: string;
  description?: string;
  is_active: number;
  is_default: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  payment_status: 'pending' | 'paid';
  plan_id?: string;
  plan_name?: string;
  event_limit?: number;
  price_sek?: number;
  is_active: number;
  created_at: string;
}

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string | null;
  location?: string;
  template_id?: string;
  template_name?: string;
  share_token?: string;
  theme_settings?: import('./index').ThemeSettings | null;
  status: string;
  created_at: string;
  invitation_count?: number;
  accepted_count?: number;
  pending_count?: number;
}

export interface Invitation {
  id: string;
  event_id: string;
  sender_id: string;
  recipient_email: string;
  recipient_name?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  token: string;
  sent_at: string;
  responded_at?: string;
  event_title?: string;
  event_date?: string;
  location?: string;
  event_description?: string;
  sender_name?: string;
}

export interface Template {
  id: string;
  name: string;
  html_content: string;
  is_system: number;
  created_at: string;
}

export interface UpgradeRequest {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  resolved_at?: string;
  plan_name?: string;
  price_sek?: number;
  user_name?: string;
  user_email?: string;
}

export interface AppSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  swish_number: string;
  swish_holder_name: string;
  app_name: string;
  [key: string]: string;
}

export interface PendingPaymentData {
  status: 'pending_payment';
  swishNumber: string;
  swishHolder: string;
  price: number;
  planName: string;
}
