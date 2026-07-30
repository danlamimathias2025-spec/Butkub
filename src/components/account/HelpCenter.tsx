import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, ChevronDown, MessageSquare, Send, X, HelpCircle, Shield, CreditCard, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { triggerHaptic } from '@/src/lib/haptics';

interface HelpCenterProps {
  onBack: () => void;
}

interface FAQItem {
  id: string;
  category: 'general' | 'account' | 'transactions';
  question: {
    EN: string;
    TH: string;
  };
  answer: {
    EN: string;
    TH: string;
  };
}

export default function HelpCenter({ onBack }: HelpCenterProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => [
    { id: 'all', label: { EN: 'All Topics', TH: 'หัวข้อทั้งหมด' }, icon: HelpCircle },
    { id: 'general', label: { EN: 'General & Platform', TH: 'ทั่วไปและแพลตฟอร์ม' }, icon: Sparkles },
    { id: 'account', label: { EN: 'Account & Security', TH: 'บัญชีและความปลอดภัย' }, icon: Shield },
    { id: 'transactions', label: { EN: 'Payments & Transfers', TH: 'การฝากและถอนเงิน' }, icon: CreditCard },
  ], []);

  const faqData: FAQItem[] = useMemo(() => [
    {
      id: 'general-1',
      category: 'general',
      question: {
        EN: 'What is Bitkub?',
        TH: 'Bitkub คืออะไร?'
      },
      answer: {
        EN: 'Bitkub is Thailand\'s leading digital asset and cryptocurrency exchange platform. We provide a sleek, secure, and professional trading environment in a premium dark mode interface with real-time price tracking and immediate asset deposits/withdrawals.',
        TH: 'Bitkub คือแพลตฟอร์มการซื้อขายสินทรัพย์ดิจิทัลและคริปโทเคอร์เรนซีชั้นนำของประเทศไทย เรามอบสภาพแวดล้อมการซื้อขายที่ราบรื่น ปลอดภัย และเป็นมืออาชีพในอินเทอร์เฟซโหมดมืดระดับพรีเมียม พร้อมการติดตามราคาแบบเรียลไทม์และการฝาก/ถอนสินทรัพย์ทันที'
      }
    },
    {
      id: 'general-2',
      category: 'general',
      question: {
        EN: 'How do I contact Bitkub support?',
        TH: 'ฉันจะติดต่อฝ่ายสนับสนุนของ Bitkub ได้อย่างไร?'
      },
      answer: {
        EN: 'You can contact our support team directly via Telegram at @kt_johnson or by emailing us. Our support officers and engineers are available around the clock to assist you with any platform-related questions.',
        TH: 'คุณสามารถติดต่อทีมสนับสนุนของเราได้โดยตรงผ่าน Telegram ที่ @kt_johnson หรือผ่านทางอีเมล ทีมงานและวิศวกรฝ่ายบริการของเราพร้อมช่วยเหลือคุณตลอด 24 ชั่วโมงเกี่ยวกับทุกคำถามเกี่ยวกับแพลตฟอร์ม'
      }
    },
    {
      id: 'general-3',
      category: 'general',
      question: {
        EN: 'What features are available on Bitkub?',
        TH: 'มีฟีเจอร์อะไรบ้างที่สามารถใช้งานได้บน Bitkub?'
      },
      answer: {
        EN: 'Our platform offers real-time digital asset trading, instant Thai Baht deposits and withdrawals, secure biometric logins, two-factor authentication, historical transaction receipt generation, and automated KYC status checking.',
        TH: 'แพลตฟอร์มของเราให้บริการการซื้อขายสินทรัพย์ดิจิทัลแบบเรียลไทม์, การฝากและถอนเงินบาททันที, การเข้าสู่ระบบที่ปลอดภัย, การยืนยันตัวตนแบบสองปัจจัย, การออกใบเสร็จธุรกรรมย้อนหลัง และระบบตรวจสอบสถานะ KYC อัตโนมัติ'
      }
    },
    {
      id: 'account-1',
      category: 'account',
      question: {
        EN: 'How do I secure my account?',
        TH: 'ฉันจะรักษาความปลอดภัยให้บัญชีของฉันได้อย่างไร?'
      },
      answer: {
        EN: 'To maximize your account security, set a robust and unique password in the Security settings tab. Ensure that you have verified your email address and enabled two-factor authentication (2FA) wherever possible.',
        TH: 'เพื่อความปลอดภัยสูงสุดของบัญชี ให้ตั้งรหัสผ่านที่รัดกุมและไม่ซ้ำกันในแท็บการตั้งค่าความปลอดภัย ตรวจสอบให้แน่ใจว่าคุณได้ยืนยันที่อยู่อีเมลของคุณแล้วและเปิดใช้งานการตรวจสอบสิทธิ์แบบสองปัจจัย (2FA) เมื่อทำได้'
      }
    },
    {
      id: 'account-2',
      category: 'account',
      question: {
        EN: 'How do I reset my password if I forget it?',
        TH: 'หากลืมรหัสผ่าน ฉันจะรีเซ็ตรหัสผ่านได้อย่างไร?'
      },
      answer: {
        EN: 'If you cannot access your account, go to the Login screen and click the "Forgot Password?" button. Enter your registered email address, and a secure password reset link will be sent to your inbox instantly via Firebase.',
        TH: 'หากคุณไม่สามารถเข้าสู่ระบบบัญชีของคุณได้ ให้ไปที่หน้าจอเข้าสู่ระบบแล้วคลิกปุ่ม "ลืมรหัสผ่าน?" กรอกที่อยู่อีเมลที่คุณลงทะเบียนไว้ ลิงก์สำหรับรีเซ็ตรหัสผ่านที่ปลอดภัยจะถูกส่งไปยังกล่องข้อความของคุณทันทีผ่าน Firebase'
      }
    },
    {
      id: 'account-3',
      category: 'account',
      question: {
        EN: 'What is KYC Verification and why is it needed?',
        TH: 'การยืนยันตัวตน KYC คืออะไร และทำไมต้องทำ?'
      },
      answer: {
        EN: 'Know Your Customer (KYC) is a standard identity verification process. It is required to satisfy anti-money laundering regulations, secure user accounts from fraud, and enable fiat deposits and withdrawals on the platform.',
        TH: 'การรู้จักลูกค้าของคุณ (KYC) คือกระบวนการยืนยันตัวตนที่เป็นมาตรฐาน จำเป็นต้องปฏิบัติตามกฎระเบียบป้องกันการฟอกเงิน ปกป้องบัญชีผู้ใช้จากการทุจริต และเปิดใช้งานการฝากและถอนเงินบาทบนแพลตฟอร์ม'
      }
    },
    {
      id: 'transactions-1',
      category: 'transactions',
      question: {
        EN: 'How do I deposit Thai Baht (THB) into my wallet?',
        TH: 'ฉันจะฝากเงินบาท (THB) เข้ากระเป๋าเงินได้อย่างไร?'
      },
      answer: {
        EN: 'Navigate to the Wallet tab, click "Deposit", and select your preferred method: PromptPay QR, standard bank transfer, or Gift Card deposit. Input your desired amount and follow the prompt instructions to complete the payment.',
        TH: 'ไปที่แท็บกระเป๋าเงิน คลิก "ฝากเงิน" และเลือกวิธีที่คุณต้องการ: คิวอาร์โค้ดพร้อมเพย์, การโอนเงินผ่านธนาคารมาตรฐาน หรือการฝากด้วยบัตรของขวัญ กรอกจำนวนเงินที่คุณต้องการและทำตามคำแนะนำเพื่อดำเนินการชำระเงินให้เสร็จสิ้น'
      }
    },
    {
      id: 'transactions-2',
      category: 'transactions',
      question: {
        EN: 'Why is my withdrawal locked or requiring activation?',
        TH: 'ทำไมการถอนเงินของฉันจึงถูกล็อกหรือต้องเปิดใช้งาน?'
      },
      answer: {
        EN: 'For compliance and security reasons to protect user funds, accounts may require a one-time withdrawal activation verification. If your withdrawal is locked, please complete the verification criteria (such as a verifying Gift Card deposit) or reach out to @kt_johnson for immediate support.',
        TH: 'ด้วยเหตุผลด้านการปฏิบัติตามกฎระเบียบและความปลอดภัยเพื่อปกป้องเงินของผู้ใช้ บัญชีอาจต้องมีการเปิดใช้งานการถอนเงินเป็นครั้งแรก หากการถอนเงินของคุณถูกล็อก โปรดดำเนินการยืนยันให้เสร็จสิ้น (เช่น การตรวจสอบความปลอดภัยผ่านยอดฝากบัตรของขวัญที่กำหนด) หรือติดต่อ @kt_johnson เพื่อรับความช่วยเหลือทันที'
      }
    },
    {
      id: 'transactions-3',
      category: 'transactions',
      question: {
        EN: 'How long do deposits and withdrawals take?',
        TH: 'การฝากและถอนเงินใช้เวลานานเท่าใด?'
      },
      answer: {
        EN: 'PromptPay deposits and Gift Card deposits are processed near-instantly. Standard bank transfers are usually credited within 10-15 minutes once verified by our operations team. Withdrawals typically take 5-30 minutes for automated security audit clearance.',
        TH: 'การฝากเงินผ่านพร้อมเพย์และการฝากผ่านบัตรของขวัญจะได้รับการประมวลผลเกือบจะในทันที การโอนเงินผ่านธนาคารมาตรฐานจะได้รับการอนุมัติภายใน 10-15 นาทีหลังจากทีมปฏิบัติการตรวจสอบ การถอนเงินมักใช้เวลา 5-30 นาทีในการตรวจสอบความปลอดภัยโดยอัตโนมัติ'
      }
    }
  ], []);

  const filteredFaqs = useMemo(() => {
    return faqData.filter(faq => {
      const qText = language === 'TH' ? faq.question.TH : faq.question.EN;
      const aText = language === 'TH' ? faq.answer.TH : faq.answer.EN;
      const matchesSearch = 
        qText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        aText.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [faqData, searchQuery, activeCategory, language]);

  const toggleExpand = (id: string) => {
    triggerHaptic('light');
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[150] bg-[#0D1117] flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <header className="sticky top-2 z-50 mx-4 my-2 px-4 py-2 bg-[#0D1117]/80 backdrop-blur-2xl rounded-2xl border border-gray-800/80 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('medium');
              onBack();
            }}
            className="p-1.5 -ml-1 text-gray-400 hover:text-white hover:bg-gray-800/40 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-black text-white uppercase tracking-tight">
            {language === 'TH' ? 'ศูนย์ช่วยเหลือ & FAQ' : 'Help Center & FAQ'}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 no-scrollbar">
        {/* Welcome Section */}
        <div className="py-6 text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-[#00D632]/10 rounded-2xl flex items-center justify-center text-[#00D632] mb-3 mx-auto border border-[#00D632]/20">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight mb-2">
            {language === 'TH' ? 'เราช่วยอะไรคุณได้บ้างวันนี้?' : 'How can we help you today?'}
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed font-medium px-4">
            {language === 'TH' 
              ? 'ค้นหาคำถามที่พบบ่อยด้านล่างหรือติดต่อทีมสนับสนุนได้ตลอด 24 ชั่วโมง' 
              : 'Search our comprehensive knowledge base or contact the support team directly.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'TH' ? 'ค้นหาคำถาม หรือปัญหาของคุณ...' : 'Search questions, answers, topics...'}
            className="w-full bg-gray-800/25 border border-gray-800 rounded-2xl py-3.5 pl-11 pr-10 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632]/50 transition-colors font-bold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar -mx-5 px-5">
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            const labelText = language === 'TH' ? cat.label.TH : cat.label.EN;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveCategory(cat.id);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                  isSelected 
                    ? 'bg-[#00D632] border-[#00D632] text-black shadow-lg shadow-[#00D632]/10' 
                    : 'bg-gray-800/30 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{labelText}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3 max-w-md mx-auto">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              const qText = language === 'TH' ? faq.question.TH : faq.question.EN;
              const aText = language === 'TH' ? faq.answer.TH : faq.answer.EN;
              return (
                <div 
                  key={faq.id}
                  className="bg-gray-800/10 border border-gray-800/50 rounded-2xl overflow-hidden transition-all hover:border-gray-800"
                >
                  <button
                    onClick={() => toggleExpand(faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left select-none"
                  >
                    <span className="text-white font-bold text-xs tracking-tight pr-4">
                      {qText}
                    </span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                      className="text-gray-500 hover:text-white p-0.5 rounded-lg hover:bg-gray-800/40"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 text-[11px] text-gray-400 leading-relaxed font-medium border-t border-gray-800/40">
                          {aText}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-500">
              <p className="text-xs font-bold uppercase tracking-wider mb-1">
                {language === 'TH' ? 'ไม่พบหัวข้อคำถาม' : 'No results found'}
              </p>
              <p className="text-[11px] text-gray-600 font-medium">
                {language === 'TH' 
                  ? 'ลองป้อนคำค้นหาอื่น หรือดูหัวข้อด้านบน' 
                  : 'Try typing a different keyword or check other categories.'}
              </p>
            </div>
          )}
        </div>

        {/* Contact/Support CTA Card */}
        <div className="mt-8 max-w-md mx-auto bg-gradient-to-br from-[#00D632]/5 to-transparent border border-[#00D632]/10 rounded-[28px] p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D632]/5 rounded-full blur-2xl pointer-events-none" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#00D632]" />
            {language === 'TH' ? 'ยังคงมีข้อสงสัยใช่ไหม?' : 'Still have questions?'}
          </h3>
          <p className="text-[11px] text-gray-400 leading-relaxed mb-4 max-w-xs mx-auto font-medium">
            {language === 'TH'
              ? 'หากไม่พบคำตอบที่คุณต้องการ โปรดส่งข้อความหาทีมสนับสนุนได้ทันที'
              : 'Our support team is available around the clock to support you with any inquiries.'}
          </p>
          <div className="flex gap-2.5 justify-center">
            <button
              onClick={() => {
                triggerHaptic('medium');
                window.open('https://t.me/kt_johnson', '_blank');
              }}
              className="flex items-center gap-1.5 px-4 py-3 bg-[#00D632] text-black font-black text-[10px] rounded-xl uppercase tracking-wider hover:bg-[#00B62A] transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'TH' ? 'ส่งข้อความหาเรา' : 'Contact Support'}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
