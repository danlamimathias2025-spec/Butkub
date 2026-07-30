import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'EN' | 'TH';

interface Translations {
  [key: string]: {
    EN: string;
    TH: string;
  };
}

const translations: Translations = {
  // Nav
  home: { EN: 'Home', TH: 'หน้าแรก' },
  market: { EN: 'Market', TH: 'ตลาด' },
  trade: { EN: 'Trade', TH: 'เทรด' },
  wallet: { EN: 'Wallet', TH: 'วอลเล็ท' },
  account: { EN: 'Account', TH: 'บัญชี' },
  
  // Home/Portfolio
  portfolio_value: { EN: 'Total Portfolio Value', TH: 'มูลค่าพอร์ตทั้งหมด' },
  buy_sell: { EN: 'Buy/Sell', TH: 'ซื้อ/ขาย' },
  promptpay: { EN: 'PromptPay', TH: 'พร้อมเพย์' },
  quick_transfer: { EN: 'Quick Send', TH: 'โอนเงินด่วน' },
  recent_activity: { EN: 'Recent Activity', TH: 'กิจกรรมล่าสุด' },

  // Market
  market_title: { EN: 'MARKET', TH: 'ตลาด' },
  favorites: { EN: 'Favorites', TH: 'รายการโปรด' },
  thb_pairs: { EN: 'THB Pairs', TH: 'คู่เหรียญ THB' },
  usdt_pairs: { EN: 'USDT Pairs', TH: 'คู่เหรียญ USDT' },
  kub_pairs: { EN: 'KUB Pairs', TH: 'คู่เหรียญ KUB' },
  top_gainers: { EN: 'Top Gainers', TH: 'เหรียญพุ่งแรง' },
  spot: { EN: 'SPOT', TH: 'สปอต' },

  // Market Ticker
  search_placeholder: { EN: 'Search coin', TH: 'ค้นหาเหรียญ' },
  all: { EN: 'All', TH: 'ทั้งหมด' },
  no_results: { EN: 'No results found', TH: 'ไม่พบข้อมูล' },

  // Trade
  buy: { EN: 'BUY', TH: 'ซื้อ' },
  sell: { EN: 'SELL', TH: 'ขาย' },
  market_order: { EN: 'Market Order', TH: 'ราคาตลาด' },
  price: { EN: 'Price', TH: 'ราคา' },
  amount: { EN: 'Amount', TH: 'จำนวน' },
  total: { EN: 'Total', TH: 'รวมทั้งหมด' },
  order_book: { EN: 'Order Book', TH: 'สมุดคำสั่งซื้อขาย' },
  spread: { EN: 'Spread', TH: 'ส่วนต่าง' },
  convert: { EN: 'Convert Asset', TH: 'แปลงสินทรัพย์' },

  // Wallet
  estimated_value: { EN: 'Estimated Asset Value', TH: 'มูลค่าสินทรัพย์โดยประมาณ' },
  available_balance: { EN: 'Available Balance', TH: 'ยอดเงินที่ใช้ได้' },
  deposit: { EN: 'Deposit', TH: 'ฝากเงิน' },
  withdraw: { EN: 'Withdraw', TH: 'ถอนเงิน' },
  send: { EN: 'Send Money', TH: 'โอนเงิน' },
  assets: { EN: 'Assets', TH: 'สินทรัพย์' },

  // Account
  logout: { EN: 'Logout', TH: 'ออกจากระบบ' },
  kyc_verified: { EN: 'KYC Verified - Level 2', TH: 'ยืนยันตัวตนแล้ว - ระดับ 2' },
  security: { EN: 'Security Settings', TH: 'การตั้งค่าความปลอดภัย' },
  identity: { EN: 'Identity Verification (KYC)', TH: 'การยืนยันตัวตน (KYC)' },
  linked_bank: { EN: 'Linked Bank Accounts', TH: 'บัญชีธนาคารที่ผูกไว้' },
  api_management: { EN: 'API Management', TH: 'จัดการ API' },
  history: { EN: 'Transaction History', TH: 'ประวัติการทำรายการ' },
  help: { EN: 'Help Center / Support', TH: 'ศูนย์ช่วยเหลือ / สนับสนุน' },
  language: { EN: 'Language Settings', TH: 'การตั้งค่าภาษา' },
  admin_dashboard: { EN: 'Admin Dashboard', TH: 'แผงควบคุมผู้ดูแลระบบ' },

  // Transaction History
  loading_history: { EN: 'Loading History...', TH: 'กำลังโหลดประวัติ...' },
  no_transactions: { EN: 'No Transactions Yet', TH: 'ยังไม่มีประวัติการทำรายการ' },
  no_transactions_desc: { EN: 'Your trade and transfer history will appear here once you start trading.', TH: 'ประวัติการเทรดและการโอนของคุณจะปรากฏที่นี่เมื่อคุณเริ่มทำรายการ' },

  // Auth
  welcome_back: { EN: 'Welcome Back', TH: 'ยินดีต้อนรับกลับมา' },
  login_subtitle: { EN: 'Log in to your Bitkub account to continue.', TH: 'เข้าสู่ระบบบัญชี Bitkub ของคุณเพื่อดำเนินการต่อ' },
  password_login: { EN: 'Password Login', TH: 'เข้าสู่ระบบด้วยรหัสผ่าน' },
  passkey: { EN: 'Passkey', TH: 'พาสคีย์' },
  email_label: { EN: 'Email Address', TH: 'อีเมล' },
  email_placeholder: { EN: 'Enter your registered email', TH: 'กรอกอีเมลที่ลงทะเบียนไว้' },
  password_label: { EN: 'Password', TH: 'รหัสผ่าน' },
  forgot_password: { EN: 'Forgot Password?', TH: 'ลืมรหัสผ่าน?' },
  login_button: { EN: 'LOG IN', TH: 'เข้าสู่ระบบ' },
  logging_in: { EN: 'LOGGING IN...', TH: 'กำลังเข้าสู่ระบบ...' },
  or_divider: { EN: 'OR', TH: 'หรือ' },
  login_with_passkey: { EN: 'Log in with Passkey', TH: 'เข้าสู่ระบบด้วยพาสคีย์' },
  no_account: { EN: "Don't have an account?", TH: 'ยังไม่มีบัญชีใช่ไหม?' },
  sign_up_link: { EN: 'Sign Up', TH: 'สมัครสมาชิก' },
  reset_success: { EN: 'Password reset email sent! Please check your inbox.', TH: 'ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว! โปรดตรวจสอบกล่องจดหมายของคุณ' },
  reset_error: { EN: 'Failed to send reset email. Please ensure the email is correct.', TH: 'ไม่สามารถส่งอีเมลรีเซ็ตได้ โปรดตรวจสอบว่าอีเมลถูกต้อง' },
  sending: { EN: 'Sending...', TH: 'กำลังส่ง...' },
  login_success_title: { EN: 'Login Successful', TH: 'เข้าสู่ระบบสำเร็จ' },
  login_success_msg: { EN: 'Welcome back to Bitkub!', TH: 'ยินดีต้อนรับกลับสู่ Bitkub!' },

  // SignUp
  create_account: { EN: 'Create Account', TH: 'สร้างบัญชี' },
  signup_subtitle: { EN: 'Trade crypto with local Thai Baht (THB) support.', TH: 'เทรดคริปโตด้วยเงินบาท (THB) อย่างง่ายดาย' },
  account_created_title: { EN: 'Account Created!', TH: 'สร้างบัญชีสำเร็จ!' },
  account_created_msg: { EN: 'Your account has been created successfully. Welcome to Bitkub!', TH: 'สร้างบัญชีของคุณเรียบร้อยแล้ว ยินดีต้อนรับสู่ Bitkub!' },
  confirmPassword_label: { EN: 'Confirm Password', TH: 'ยืนยันรหัสผ่าน' },
  password_req: { EN: 'Password Requirements', TH: 'ข้อกำหนดของรหัสผ่าน' },
  req_len: { EN: 'Minimum 12 characters', TH: 'อย่างน้อย 12 ตัวอักษร' },
  req_case: { EN: 'At least 1 uppercase & 1 lowercase letter', TH: 'มีตัวพิมพ์ใหญ่และตัวพิมพ์เล็กอย่างน้อย 1 ตัว' },
  req_num: { EN: 'At least 1 number & 1 special character (!@#$%)', TH: 'มีตัวเลขและตัวอักษรพิเศษอย่างน้อย 1 ตัว' },
  agree_terms: { EN: 'I agree to the User Agreement and AML Policy.', TH: 'ฉันยอมรับข้อตกลงผู้ใช้และนโยบาย AML' },
  consent_data: { EN: 'I consent to Personal Data Protection policies.', TH: 'ฉันยินยอมตามนโยบายคุ้มครองข้อมูลส่วนบุคคล' },
  signup_button: { EN: 'SIGN UP FOR FREE', TH: 'สมัครสมาชิกฟรี' },
  creating_account: { EN: 'CREATING ACCOUNT...', TH: 'กำลังสร้างบัญชี...' },

  // KYC
  kyc_title: { EN: 'Identity Verification (KYC)', TH: 'การยืนยันตัวตน (KYC)' },
  step_of: { EN: 'Step {n} of 3: Document Upload', TH: 'ขั้นตอนที่ {n} จาก 3: อัปโหลดเอกสาร' },
  nationality: { EN: 'Nationality Selection', TH: 'เลือกสัญชาติ' },
  thai_national: { EN: 'Thai National', TH: 'สัญชาติไทย' },
  non_thai: { EN: 'Non-Thai National (Passport)', TH: 'ชาวต่างชาติ (พาสปอร์ต)' },
  upload_doc: { EN: 'Upload Document', TH: 'อัปโหลดเอกสาร' },
  doc_instruction: { EN: 'Position your document inside the box.', TH: 'วางเอกสารของคุณให้อยู่ในกรอบ' },
  doc_sub_instruction: { EN: 'Ensure clear lighting and all edges are visible.', TH: 'ตรวจสอบให้แน่ใจว่าแสงสว่างเพียงพอและเห็นขอบเอกสารชัดเจน' },
  upload_button: { EN: 'Take Photo / Upload Document', TH: 'ถ่ายภาพ / อัปโหลดเอกสาร' },
  linked_bank_label: { EN: 'Linked Bank Account Info', TH: 'ข้อมูลบัญชีธนาคารที่ผูกไว้' },
  submit_verification: { EN: 'SUBMIT FOR VERIFICATION', TH: 'ส่งข้อมูลเพื่อยืนยันตัวตน' },
  verifying: { EN: 'VERIFYING...', TH: 'กำลังตรวจสอบ...' },

  // 2FA
  two_step_title: { EN: '2-Step Verification', TH: 'การยืนยันตัวตน 2 ขั้นตอน' },
  two_step_desc: { EN: 'Enter the 6-digit code from your Google Authenticator app or SMS OTP.', TH: 'กรอกรหัส 6 หลักจากแอป Google Authenticator หรือ SMS OTP' },
  resend_sms: { EN: 'Resend SMS Code (00:59)', TH: 'ส่งรหัส SMS อีกครั้ง (00:59)' },
  switch_auth: { EN: 'Switch to Authenticator Code', TH: 'เปลี่ยนไปใช้รหัสจากแอปยืนยันตัวตน' },
  verify_proceed: { EN: 'VERIFY & PROCEED', TH: 'ยืนยันและดำเนินการต่อ' },

  // Deposit/Withdraw THB
  deposit_thb: { EN: 'Deposit THB', TH: 'ฝากเงินบาท' },
  withdraw_thb: { EN: 'Withdraw THB', TH: 'ถอนเงินบาท' },
  mobile_banking: { EN: 'Mobile Banking (PromptPay QR Code)', TH: 'โมบายแบงก์กิ้ง (PromptPay QR Code)' },
  instant_24: { EN: 'Instant to 24 hrs', TH: 'ทันที - 24 ชม.' },
  bank_transfer: { EN: 'Bank Transfer / Upload Slip', TH: 'โอนเงินธนาคาร / อัปโหลดสลิป' },
  time_30m_3d: { EN: '30 mins - 3 days', TH: '30 นาที - 3 วัน' },
  giftcard_deposit: { EN: 'Gift Card / Voucher Deposit', TH: 'ฝากเงินด้วยบัตรของขวัญ / วอเชอร์' },
  deposit_amount: { EN: 'Deposit Amount (THB)', TH: 'จำนวนเงินที่ฝาก (THB)' },
  deposit_rules: { EN: 'I understand that each QR code is single-use only and must be scanned from my registered bank account.', TH: 'ฉันเข้าใจว่า QR code แต่ละรหัสใช้ได้เพียงครั้งเดียวและต้องสแกนจากบัญชีธนาคารที่ลงทะเบียนไว้ของฉัน' },
  generate_qr: { EN: 'GENERATE QR CODE', TH: 'สร้าง QR CODE' },
  scan_to_deposit: { EN: 'Scan QR Code to Deposit', TH: 'สแกน QR Code เพื่อฝากเงิน' },
  expires_in: { EN: 'Expires in', TH: 'หมดอายุใน' },
  save_qr: { EN: 'Save QR Image', TH: 'บันทึกรูป QR' },
  cancel_request: { EN: 'Cancel Request', TH: 'ยกเลิกรายการ' },
  available_fiat: { EN: 'Available Fiat Balance', TH: 'ยอดเงินบาทที่ใช้ได้' },
  daily_limit: { EN: 'Daily Withdrawal Limit', TH: 'วงเงินถอนต่อวัน' },
  limit_remaining: { EN: 'Remaining', TH: 'คงเหลือ' },
  select_bank: { EN: 'Select Bank Account', TH: 'เลือกบัญชีธนาคาร' },
  link_new_bank: { EN: 'Link New Bank Account', TH: 'ผูกบัญชีธนาคารใหม่' },
  withdraw_amount: { EN: 'Withdrawal Amount', TH: 'จำนวนเงินที่ถอน' },
  withdraw_fee: { EN: 'Withdrawal Fee', TH: 'ค่าธรรมเนียมการถอน' },
  net_received: { EN: 'Net Received Amount', TH: 'ยอดเงินสุทธิที่จะได้รับ' },
  processing_time: { EN: 'Estimated Processing Time: 1 - 3 Business Days', TH: 'ระยะเวลาดำเนินการโดยประมาณ: 1 - 3 วันทำการ' },
  confirm_withdraw: { EN: 'CONFIRM WITHDRAWAL', TH: 'ยืนยันการถอนเงิน' },
  enter_2fa: { EN: 'Enter 2FA Code to authorize this withdrawal', TH: 'กรอกรหัส 2FA เพื่ออนุมัติการถอนเงินนี้' },

  // Notifications
  notifications: { EN: 'Notifications', TH: 'การแจ้งเตือน' },
  mark_all_read: { EN: 'Mark all as read', TH: 'ทำเครื่องหมายอ่านแล้วทั้งหมด' },
  no_notifications: { EN: 'No Notifications', TH: 'ไม่มีการแจ้งเตือน' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: { [key: string]: any }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'bitkub_app_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'EN' || saved === 'TH') {
        return saved;
      }
    } catch {
      // Fallback if localStorage unavailable
    }
    return 'TH';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  };

  const t = (key: string, params?: { [key: string]: any }) => {
    let text = translations[key]?.[language] || translations[key]?.['EN'] || key;
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, String(params[param]));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
