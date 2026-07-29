import React, { useState } from 'react';
import { ArrowLeft, Camera, Upload, ShieldCheck, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

import { auth, db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface KYCScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function KYCScreen({ onBack, onSuccess }: KYCScreenProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [nationality, setNationality] = useState<'Thai' | 'Non-Thai'>('Thai');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      // Update user document with PENDING status
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        kycStatus: 'PENDING',
        nationality,
        updatedAt: new Date().toISOString()
      });
      
      onSuccess();
    } catch (error) {
      console.error("KYC submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[120] flex flex-col p-5 overflow-y-auto no-scrollbar">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">{t('kyc_title')}</h1>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                s <= step ? "bg-[#00D632]" : "bg-gray-800"
              )}
            />
          ))}
        </div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">{t('step_of', { n: step })}</p>
      </header>

      <div className="flex-1 space-y-8">
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('nationality')}</p>
          <div className="flex bg-gray-800/30 rounded-2xl p-1 border border-gray-800">
            <button 
              onClick={() => setNationality('Thai')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                nationality === 'Thai' ? "bg-gray-700 text-white shadow-lg" : "text-gray-500"
              )}
            >
              {t('thai_national')}
            </button>
            <button 
              onClick={() => setNationality('Non-Thai')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                nationality === 'Non-Thai' ? "bg-gray-700 text-white shadow-lg" : "text-gray-500"
              )}
            >
              {t('non_thai')}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('upload_doc')}</p>
          <div className="border-2 border-dashed border-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-gray-800/10 group hover:border-[#00D632]/50 transition-colors cursor-pointer relative overflow-hidden">
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#00D632]/10 flex items-center justify-center text-[#00D632]">
                  <Check className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-white">{file.name}</p>
                <button onClick={() => setFile(null)} className="text-xs text-red-500 font-bold">Remove</button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4 text-gray-500 group-hover:text-[#00D632] transition-colors">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-white mb-2">{t('doc_instruction')}</p>
                <p className="text-xs text-gray-500 mb-6 px-4">{t('doc_sub_instruction')}</p>
                <label className="cursor-pointer bg-gray-800 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 border border-gray-700 hover:border-[#00D632] transition-all">
                  <Upload className="w-4 h-4 text-[#00D632]" />
                  {t('upload_button')}
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept="image/*"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('linked_bank_label')}</p>
          <input 
            type="text"
            placeholder="PromptPay ID / Kasikornbank account"
            className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/50 transition-colors"
          />
        </div>
      </div>

      <div className="pt-8">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full py-4 rounded-2xl bg-[#00D632] text-black font-black text-lg shadow-[0_10px_30px_rgba(0,214,50,0.2)] disabled:opacity-50"
        >
          {loading ? t('verifying') : t('submit_verification')}
        </motion.button>
      </div>
    </div>
  );
}
