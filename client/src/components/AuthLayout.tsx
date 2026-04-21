import { Calendar, Users, Mail, Star } from 'lucide-react';

const features = [
  { icon: <Calendar className="h-5 w-5" />, text: 'Create & manage events effortlessly' },
  { icon: <Mail className="h-5 w-5" />, text: 'Send beautiful email invitations' },
  { icon: <Users className="h-5 w-5" />, text: 'Track RSVPs in real time' },
  { icon: <Star className="h-5 w-5" />, text: 'Professional templates included' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex-col justify-between p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-white/3" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">MyEvents</span>
        </div>

        {/* Hero text */}
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage your events<br />
            <span className="text-blue-200">like a professional</span>
          </h2>
          <p className="text-blue-100 text-lg mb-10 leading-relaxed">
            Create events, send stunning invitations, and track your guests — all in one place.
          </p>
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-blue-100">
                  {f.icon}
                </div>
                <span className="text-blue-100 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative border-t border-white/20 pt-6">
          <p className="text-blue-200 text-sm italic">"The easiest way to plan events and keep guests informed."</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-gray-50 p-8">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">MyEvents</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
