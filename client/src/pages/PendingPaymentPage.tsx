import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
          <span className="text-2xl">💳</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Required</h2>
        <p className="text-gray-500 mb-6">
          Complete your registration by paying for the <strong>{planName}</strong> plan.
        </p>
      </div>

      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Plan</span>
            <span className="font-semibold">{planName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount</span>
            <span className="font-bold text-lg text-blue-700">{price} SEK</span>
          </div>
          {swishNumber && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Swish Number</span>
                <span className="font-mono font-semibold">{swishNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Recipient</span>
                <span className="font-semibold">{swishHolder}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {swishQrData && (
        <div className="flex flex-col items-center mb-6">
          <p className="text-sm text-gray-500 mb-3">Scan QR code to pay with Swish</p>
          <div className="p-3 bg-white rounded-lg border">
            <QRCodeSVG value={swishQrData} size={180} />
          </div>
        </div>
      )}

      <div className="bg-amber-50 rounded-lg p-4 mb-6 text-sm text-amber-800">
        <p className="font-medium mb-1">Instructions:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Open Swish on your phone</li>
          <li>Scan the QR code or enter number manually</li>
          <li>Send <strong>{price} SEK</strong> with message "MyEvents Registration"</li>
          <li>Click "Check Payment Status" below</li>
        </ol>
      </div>

      <Button className="w-full" onClick={handleCheckStatus} disabled={checking}>
        {checking ? 'Checking...' : 'Check Payment Status'}
      </Button>
    </AuthLayout>
  );
}
