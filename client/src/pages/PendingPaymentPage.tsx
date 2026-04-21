import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PaymentData {
  swishNumber?: string;
  swishHolder?: string;
  price?: number;
  planName?: string;
}

export default function PendingPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = (location.state as PaymentData) || {};
  const [checking, setChecking] = useState(false);

  const { swishNumber = '', swishHolder = '', price = 0, planName = 'Basic' } = data;

  const swishQrData = swishNumber
    ? `swish://payment?data={"version":1,"payee":{"value":"${swishNumber}","editable":false},"amount":{"value":${price},"editable":false},"message":{"value":"MyEvents Registration","editable":false}}`
    : '';

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get('/auth/me');
      const user = res.data.user;
      if (user.payment_status === 'paid') {
        toast.success('Payment confirmed! Welcome to MyEvents.');
        navigate('/dashboard');
      } else {
        toast.info('Payment not yet confirmed. Please try again after completing payment.');
      }
    } catch {
      toast.error('Please log in again.');
      navigate('/login');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthLayout>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 mb-4">
          <span className="text-3xl">💳</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete Your Payment</h2>
        <p className="text-slate-500 text-sm">
          Complete your registration by paying for the{' '}
          <span className="font-semibold text-slate-700">{planName}</span> plan.
        </p>
      </div>

      {/* Payment details card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-3">Payment Details</h3>
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Plan</span>
            <span className="font-semibold text-blue-900">{planName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Amount</span>
            <span className="font-bold text-xl text-blue-700">{price} SEK</span>
          </div>
          {swishNumber && (
            <>
              <div className="border-t border-blue-200 pt-2.5 mt-2.5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-blue-700">Swish Number</span>
                  <span className="font-mono font-semibold text-blue-900">{swishNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Recipient</span>
                  <span className="font-semibold text-blue-900">{swishHolder}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* QR code */}
      {swishQrData && (
        <div className="flex flex-col items-center mb-5">
          <p className="text-sm text-slate-500 mb-3">Scan to pay with Swish</p>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <QRCodeSVG value={swishQrData} size={160} />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
        <p className="text-sm font-semibold text-amber-800 mb-2">Instructions</p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-amber-700">
          <li>Open Swish on your phone</li>
          <li>Scan the QR code or enter number manually</li>
          <li>Send <strong>{price} SEK</strong> with message "MyEvents Registration"</li>
          <li>Click "Check Payment Status" below</li>
        </ol>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-11 shadow-md shadow-blue-500/20"
        onClick={handleCheckStatus}
        disabled={checking}
      >
        {checking ? 'Checking...' : 'Check Payment Status'}
      </Button>
    </AuthLayout>
  );
}
