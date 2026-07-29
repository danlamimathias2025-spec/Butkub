import { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';

const HomeScreen = lazy(() => import('./components/screens/HomeScreen'));
const MarketScreen = lazy(() => import('./components/screens/MarketScreen'));
const TradeScreen = lazy(() => import('./components/screens/TradeScreen'));
const WalletScreen = lazy(() => import('./components/screens/WalletScreen'));
const AccountScreen = lazy(() => import('./components/screens/AccountScreen'));
const LoginScreen = lazy(() => import('./components/auth/LoginScreen'));
const SignUpScreen = lazy(() => import('./components/auth/SignUpScreen'));
const KYCScreen = lazy(() => import('./components/auth/KYCScreen'));

export type TabType = 'Home' | 'Market' | 'Trade' | 'Wallet' | 'Account';

const LoadingSpinner = () => (
  <div className="flex-1 flex items-center justify-center bg-[#0D1117]">
    <div className="w-12 h-12 border-4 border-[#00D632]/20 border-t-[#00D632] rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('Home');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'kyc'>('login');
  const [showKYC, setShowKYC] = useState(false);

  useEffect(() => {
    // Initial loading timer for splash screen
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const fetchProfile = async (retries = 3) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
              // Only create profile if it doesn't exist (should be handled by signup)
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                role: 'USER',
                kycStatus: 'NOT_STARTED',
                createdAt: new Date().toISOString()
              });
            }
          } catch (error: any) {
            if (retries > 0 && (error.code === 'permission-denied' || error.message?.includes('offline'))) {
              console.log(`Retrying profile fetch... (${retries} left)`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              return fetchProfile(retries - 1);
            }
            console.error("Error fetching user profile:", error);
          }
        };
        
        await fetchProfile();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(splashTimer);
    };
  }, []);

  const handleKYCSuccess = async () => {
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          kycStatus: 'VERIFIED',
          createdAt: new Date().toISOString()
        });
        setShowKYC(false);
      } catch (error) {
        console.error("Error updating KYC status:", error);
        setShowKYC(false);
      }
    } else {
      setShowKYC(false);
    }
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home': return <HomeScreen />;
      case 'Market': return <MarketScreen />;
      case 'Trade': return <TradeScreen />;
      case 'Wallet': return <WalletScreen />;
      case 'Account': return <AccountScreen />;
      default: return <HomeScreen />;
    }
  };

  if (showSplash || loading) {
    return (
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
        {!showSplash && loading && <LoadingSpinner key="loader" />}
      </AnimatePresence>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex justify-center items-center font-sans overflow-hidden">
        <div className="flex flex-col w-full max-w-[400px] h-screen max-h-[768px] bg-[#0D1117] relative shadow-2xl border-x border-gray-800/50">
          <Suspense fallback={<LoadingSpinner />}>
            {authView === 'login' ? (
              <LoginScreen 
                onClose={() => {}} 
                onSignUp={() => setAuthView('signup')}
                onSuccess={() => {}} 
              />
            ) : (
              <SignUpScreen 
                onBack={() => setAuthView('login')}
                onSuccess={() => {
                  setShowKYC(true);
                }}
              />
            )}
          </Suspense>
        </div>
      </div>
    );
  }

  if (showKYC) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex justify-center items-center font-sans overflow-hidden">
        <div className="flex flex-col w-full max-w-[400px] h-screen max-h-[768px] bg-[#0D1117] relative shadow-2xl border-x border-gray-800/50">
          <Suspense fallback={<LoadingSpinner />}>
            <KYCScreen onSuccess={handleKYCSuccess} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex justify-center items-center font-sans overflow-hidden">
      <div className="flex flex-col w-full max-w-[400px] h-screen max-h-[768px] bg-[#0D1117] relative shadow-2xl border-x border-gray-800/50">
        <Suspense fallback={<LoadingSpinner />}>
          {renderScreen()}
        </Suspense>
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

