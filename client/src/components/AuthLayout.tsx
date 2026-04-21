import { Calendar } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MyEvents</h1>
          <p className="text-gray-500 mt-1">Professional event management</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
