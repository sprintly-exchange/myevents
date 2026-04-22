import { useTranslation } from 'react-i18next';
import { Calendar, Users, Mail, Star, Globe } from 'lucide-react';
import { LANG_STORAGE_KEY } from '@/i18n';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const cycle: Record<string, string> = { sv: 'en', en: 'si', si: 'sv' };
    const next = cycle[i18n.language] ?? 'sv';
    i18n.changeLanguage(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  const features = [
    { icon: <Calendar className="h-5 w-5" />, text: t('auth.feature1') },
    { icon: <Mail className="h-5 w-5" />, text: t('auth.feature2') },
    { icon: <Users className="h-5 w-5" />, text: t('auth.feature3') },
    { icon: <Star className="h-5 w-5" />, text: t('auth.feature4') },
  ];

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
            {t('auth.heroTitle')}
          </h2>
          <p className="text-blue-100 text-lg mb-10 leading-relaxed">
            {t('auth.heroSubtitle')}
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
          <p className="text-blue-200 text-sm italic">"{t('auth.quote')}"</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-gray-50 p-8">
        {/* Mobile logo + language toggle */}
        <div className="flex items-center justify-between w-full max-w-sm mb-8 lg:mb-0">
          <div className="flex lg:hidden items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">MyEvents</span>
          </div>
          {/* Language toggle — visible on all screen sizes in right panel */}
          <button
            onClick={toggleLang}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{i18n.language === 'sv' ? '🇸🇪 Svenska' : i18n.language === 'si' ? '🇱🇰 සිංහල' : '🇬🇧 English'}</span>
          </button>
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
