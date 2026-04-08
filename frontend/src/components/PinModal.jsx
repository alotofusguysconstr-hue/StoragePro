import { useState, useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import { Button } from './ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { getAdminPin, setAdminUnlocked } from '../lib/storage';

export const PinModal = ({ isOpen, onSuccess, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  const handlePinChange = (value) => {
    setPin(value);
    setError('');
    
    // Auto-submit when 4 digits entered
    if (value.length === 4) {
      const correctPin = getAdminPin();
      if (value === correctPin) {
        setAdminUnlocked(true);
        onSuccess();
      } else {
        setError('Incorrect PIN');
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin('');
        }, 500);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1121]/90 backdrop-blur-sm"
      data-testid="pin-modal"
    >
      <div 
        className={`bg-[#131B2F] border border-[#1E293B] rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl ${shake ? 'animate-shake' : ''}`}
        style={{
          animation: shake ? 'shake 0.5s ease-in-out' : 'none'
        }}
      >
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
        `}</style>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 font-['Outfit']">Admin Access</h2>
              <p className="text-sm text-slate-400">Enter PIN to continue</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-[#1E293B] transition-colors"
            data-testid="pin-modal-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* PIN Input */}
        <div className="flex flex-col items-center gap-6">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={handlePinChange}
            data-testid="pin-input"
          >
            <InputOTPGroup className="gap-3">
              <InputOTPSlot 
                index={0} 
                className="w-14 h-14 text-2xl bg-[#0B1121] border-[#1E293B] text-slate-100 rounded-lg focus:border-emerald-500 focus:ring-emerald-500/20"
              />
              <InputOTPSlot 
                index={1} 
                className="w-14 h-14 text-2xl bg-[#0B1121] border-[#1E293B] text-slate-100 rounded-lg focus:border-emerald-500 focus:ring-emerald-500/20"
              />
              <InputOTPSlot 
                index={2} 
                className="w-14 h-14 text-2xl bg-[#0B1121] border-[#1E293B] text-slate-100 rounded-lg focus:border-emerald-500 focus:ring-emerald-500/20"
              />
              <InputOTPSlot 
                index={3} 
                className="w-14 h-14 text-2xl bg-[#0B1121] border-[#1E293B] text-slate-100 rounded-lg focus:border-emerald-500 focus:ring-emerald-500/20"
              />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-rose-500 text-sm font-medium" data-testid="pin-error">
              {error}
            </p>
          )}

          <p className="text-xs text-slate-500 text-center">
            Default PIN: 1234
          </p>
        </div>
      </div>
    </div>
  );
};

export default PinModal;
