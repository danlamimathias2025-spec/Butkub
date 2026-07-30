import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Upload, ShieldCheck, Check, Globe, Clock, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, compressImage } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStatusModal } from '../../contexts/StatusModalContext';

import { auth, db } from '../../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

interface KYCScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function KYCScreen({ onBack, onSuccess }: KYCScreenProps) {
  const { t, language, setLanguage } = useLanguage();
  const { showStatusModal } = useStatusModal();
  const [step, setStep] = useState(1);
  const [nationality, setNationality] = useState<'Thai' | 'Non-Thai'>('Thai');
  const [file, setFile] = useState<File | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentKycStatus, setCurrentKycStatus] = useState<string>('LOADING');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      setCurrentKycStatus('NOT_STARTED');
      return;
    }
    const fetchUserKyc = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCurrentKycStatus(data.kycStatus || 'NOT_STARTED');
          setPhoneNumber(data.phoneNumber || '');
          setNationality(data.nationality || 'Thai');
        } else {
          setCurrentKycStatus('NOT_STARTED');
        }
      } catch (err) {
        console.error("Error fetching user kycStatus:", err);
        setCurrentKycStatus('NOT_STARTED');
      }
    };
    fetchUserKyc();
  }, []);

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      let documentDataUrl = '';
      if (file) {
        documentDataUrl = await compressImage(file);
      }

      // Update user document with PENDING status and uploaded document data
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        kycStatus: 'PENDING',
        nationality,
        kycDocumentUrl: documentDataUrl || null,
        kycDocumentName: file?.name || 'Document',
        phoneNumber: phoneNumber.trim(),
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setCurrentKycStatus('PENDING');

      showStatusModal({
        type: 'success',
        title: 'Verification Submitted',
        message: 'Your documents have been received and are being reviewed.',
        onClose: () => {
          onSuccess();
        }
      });
    } catch (error: any) {
      console.error("KYC submission error:", error);
      showStatusModal({
        type: 'error',
        title: 'Submission Failed',
        message: error.message || 'There was an error submitting your verification.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (currentKycStatus === 'LOADING') {
    return (
      <div className="fixed inset-0 bg-[#0D1117] z-[160] flex flex-col items-center justify-center p-6">
        <RefreshCcw className="w-10 h-10 text-[#00D632] animate-spin mb-4" />
        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Loading KYC Status...</p>
      </div>
    );
  }

  if (currentKycStatus === 'VERIFIED') {
    return (
      <div className="fixed inset-0 bg-[#0D1117] z-[160] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#00D632]/10 border border-[#00D632]/30 flex items-center justify-center text-[#00D632] mb-6 shadow-[0_0_30px_rgba(0,214,50,0.15)]">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
          {language === 'TH' ? 'บัญชีของคุณได้รับการยืนยันแล้ว' : 'Account Already Verified'}
        </h1>
        <p className="text-sm text-gray-400 max-w-sm mb-8 leading-relaxed">
          {language === 'TH' 
            ? 'การยืนยันตัวตนของคุณเสร็จสมบูรณ์แล้ว คุณสามารถใช้งานกระดานเทรด ฝาก ถอนเงินบาทได้อย่างปลอดภัย โดยไม่ต้องส่งเอกสารเพิ่มเติม' 
            : 'Your identity verification (KYC) is fully verified and active. You can now trade, deposit, and withdraw securely. No further action is required.'}
        </p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-8 py-3.5 rounded-xl bg-[#00D632] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[#00B62A] transition-all shadow-[0_6px_20px_rgba(0,214,50,0.2)]"
        >
          {language === 'TH' ? 'ย้อนกลับ' : 'Go Back'}
        </motion.button>
      </div>
    );
  }

  if (currentKycStatus === 'PENDING') {
    return (
      <div className="fixed inset-0 bg-[#0D1117] z-[160] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <Clock className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
          {language === 'TH' ? 'กำลังตรวจสอบข้อมูล' : 'Verification Under Review'}
        </h1>
        <p className="text-sm text-gray-400 max-w-sm mb-8 leading-relaxed">
          {language === 'TH' 
            ? 'เอกสารของคุณอยู่ระหว่างการตรวจสอบโดยผู้ดูแลระบบ เราจะดำเนินการให้เร็วที่สุดและแจ้งเตือนคุณทันทีที่เสร็จสิ้น' 
            : 'Your document is currently under review by our team. We are verifying your details and will update your status as soon as possible.'}
        </p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-8 py-3.5 rounded-xl bg-gray-800 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-gray-700 border border-gray-700 transition-all"
        >
          {language === 'TH' ? 'ย้อนกลับ' : 'Go Back'}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[160] flex flex-col p-5 pb-28 overflow-y-auto no-scrollbar">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">{t('kyc_title')}</h1>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-full p-1 border border-gray-700/80 shadow-inner">
            <Globe className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
            <button 
              onClick={() => setLanguage('TH')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all",
                language === 'TH' ? "bg-[#00D632] text-black shadow-md" : "text-gray-400 hover:text-white"
              )}
            >
              TH
            </button>
            <button 
              onClick={() => setLanguage('EN')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all",
                language === 'EN' ? "bg-[#00D632] text-black shadow-md" : "text-gray-400 hover:text-white"
              )}
            >
              EN
            </button>
          </div>
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
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder={t('phone_number_placeholder')}
            className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/50 transition-colors"
            required
          />
        </div>
      </div>

      <div className="pt-6 pb-6">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!file || !phoneNumber.trim() || loading}
          className="w-full py-2.5 rounded-xl bg-[#00D632] text-black font-bold text-xs uppercase tracking-wider shadow-[0_6px_20px_rgba(0,214,50,0.2)] disabled:opacity-50 hover:bg-[#00B62A] transition-all"
        >
          {loading ? t('verifying') : t('submit_verification')}
        </motion.button>
      </div>
    </div>
  );
}
