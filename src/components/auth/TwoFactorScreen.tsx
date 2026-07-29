import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface TwoFactorScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function TwoFactorScreen({ onBack, onSuccess }: TwoFactorScreenProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);

  const handleChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[130] flex flex-col p-5 overflow-y-auto no-scrollbar">
      <header className="mb-8">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black text-white text-center -mt-8">2-Step Verification</h1>
      </header>

      <div className="flex-1 flex flex-col">
        <p className="text-sm text-gray-400 text-center mb-8 px-4">
          Enter the 6-digit code from your <span className="text-white font-bold">Google Authenticator</span> app or SMS OTP.
        </p>

        <div className="flex justify-between gap-2 mb-8">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              className="w-12 h-14 bg-gray-800/20 border border-gray-800 rounded-xl text-center text-xl font-black text-[#00D632] focus:outline-none focus:border-[#00D632]/50 transition-colors"
              maxLength={1}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 mb-8">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            Resend SMS Code (00:59)
          </p>
          <button className="text-xs font-bold text-[#00D632]">Switch to Authenticator Code</button>
        </div>
      </div>

      <div className="pb-8">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSuccess}
          className="w-full py-4 rounded-2xl bg-[#00D632] text-black font-black text-lg shadow-[0_10px_30px_rgba(0,214,50,0.2)]"
        >
          VERIFY & PROCEED
        </motion.button>
      </div>
    </div>
  );
}
