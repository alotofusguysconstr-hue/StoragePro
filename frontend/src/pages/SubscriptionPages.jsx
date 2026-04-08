import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { captureSubscription, setUserTier } from '../lib/storage';

export const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [tier, setTierState] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const payerId = searchParams.get('PayerID');
    
    if (token) {
      processPayment(token);
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  const processPayment = async (orderId) => {
    try {
      const result = await captureSubscription(orderId);
      if (result.status === 'success' && result.tier) {
        setUserTier(result.tier);
        setTierState(result.tier);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Payment capture error:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1121] flex items-center justify-center p-4">
      <Card className="bg-[#131B2F] border-[#1E293B] max-w-md w-full">
        <CardContent className="p-8 text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-emerald-400 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-slate-100 font-['Outfit']">
                Processing Payment...
              </h2>
              <p className="text-slate-400 mt-2">Please wait while we confirm your subscription.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
              <h2 className="text-xl font-bold text-slate-100 font-['Outfit']">
                Welcome to {tier.charAt(0).toUpperCase() + tier.slice(1)}!
              </h2>
              <p className="text-slate-400 mt-2">
                Your subscription is now active. Enjoy unlimited scans and premium features!
              </p>
              <Button
                onClick={() => navigate('/')}
                className="mt-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              >
                Go to Dashboard
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-rose-400 mb-4" />
              <h2 className="text-xl font-bold text-slate-100 font-['Outfit']">
                Payment Failed
              </h2>
              <p className="text-slate-400 mt-2">
                Something went wrong processing your payment. Please try again.
              </p>
              <Button
                onClick={() => navigate('/pricing')}
                className="mt-6 bg-[#1E293B] hover:bg-[#2E3B4B] text-slate-200"
              >
                Try Again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const SubscriptionCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B1121] flex items-center justify-center p-4">
      <Card className="bg-[#131B2F] border-[#1E293B] max-w-md w-full">
        <CardContent className="p-8 text-center">
          <XCircle className="w-16 h-16 mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-100 font-['Outfit']">
            Payment Cancelled
          </h2>
          <p className="text-slate-400 mt-2">
            Your subscription was not processed. You can try again anytime.
          </p>
          <div className="flex gap-3 mt-6 justify-center">
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            >
              View Plans
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="bg-[#0B1121] border-[#1E293B] text-slate-200"
            >
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
