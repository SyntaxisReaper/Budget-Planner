import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Lock } from 'lucide-react';

import { useSupabaseAuth } from './hooks/useSupabaseAuth.js';
import { useVersionCheck } from './hooks/useVersionCheck.js';
import { useSubscriptions, useAccounts, useDebts } from './hooks/useBudget.js';
import { useTrips } from './hooks/useTrips.js';
import { requestNotificationPermissions, scheduleUpcomingReminders, checkLowBalance, notifyDebtPaid } from './lib/notifications.js';
import toast, { triggerCelebration } from './lib/haptics.js';
import apiClient from './lib/apiClient.js';
import Navbar from './components/Navbar.jsx';
import AuthGuard from './components/AuthGuard.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ChatOverlay from './components/ChatOverlay.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import { pageVariants } from './lib/motion.js';

// Lazy loaded routes
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Accounts = lazy(() => import('./pages/Accounts.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Items = lazy(() => import('./pages/Items.jsx'));
const Debts = lazy(() => import('./pages/Debts.jsx'));
const Goals = lazy(() => import('./pages/Goals.jsx'));
const BudgetPlanner = lazy(() => import('./pages/BudgetPlanner.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Subscriptions = lazy(() => import('./pages/Subscriptions.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const PeopleLedger = lazy(() => import('./pages/PeopleLedger.jsx'));
const Tasks = lazy(() => import('./pages/Tasks.jsx'));
const Notes = lazy(() => import('./pages/Notes.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));
const Contacts = lazy(() => import('./pages/Contacts.jsx'));
const Trips = lazy(() => import('./pages/Trips.jsx'));
const TripDetail = lazy(() => import('./pages/TripDetail.jsx'));
const PayLink = lazy(() => import('./pages/PayLink.jsx'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function SkeletonLoader() {
  return (
    <div className="page" style={{ padding: 'var(--space-6)', opacity: 0.6, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <div style={{ height: 28, width: 150, background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', marginBottom: 8 }} />
          <div style={{ height: 16, width: 220, background: 'var(--color-surface-2)', borderRadius: 'var(--radius)' }} />
        </div>
        <div style={{ height: 36, width: 90, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }} />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 110, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: 72, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    </div>
  );
}

/** Wraps each route so it fades + slides in/out */
function PageWrapper({ children }) {
  const navType = useNavigationType();
  const isBack = navType === 'POP';
  return (
    <motion.div
      custom={isBack}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ minHeight: '100%', width: '100%' }}
    >
      <Suspense fallback={<SkeletonLoader />}>
        {children}
      </Suspense>
    </motion.div>
  );
}

/** Inner routes uses useLocation so AnimatePresence can key on pathname */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/"             element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/accounts"     element={<PageWrapper><Accounts /></PageWrapper>} />
        <Route path="/transactions" element={<PageWrapper><Transactions /></PageWrapper>} />
        <Route path="/items"        element={<PageWrapper><Items /></PageWrapper>} />
        <Route path="/debts"        element={<PageWrapper><Debts /></PageWrapper>} />
        <Route path="/goals"        element={<PageWrapper><Goals /></PageWrapper>} />
        <Route path="/budget"       element={<PageWrapper><BudgetPlanner /></PageWrapper>} />
        <Route path="/analytics"    element={<PageWrapper><Analytics /></PageWrapper>} />
        <Route path="/settings"     element={<PageWrapper><Settings /></PageWrapper>} />
        <Route path="/subscriptions" element={<PageWrapper><Subscriptions /></PageWrapper>} />
        <Route path="/contacts"     element={<PageWrapper><Contacts /></PageWrapper>} />
        <Route path="/people-ledger" element={<PageWrapper><PeopleLedger /></PageWrapper>} />
        <Route path="/tasks"        element={<PageWrapper><Tasks /></PageWrapper>} />
        <Route path="/notes"        element={<PageWrapper><Notes /></PageWrapper>} />
        <Route path="/calendar"     element={<PageWrapper><Calendar /></PageWrapper>} />
        <Route path="/trips"        element={<PageWrapper><Trips /></PageWrapper>} />
        <Route path="/trips/:id"    element={<PageWrapper><TripDetail /></PageWrapper>} />
        <Route path="/profile"      element={<PageWrapper><Profile /></PageWrapper>} />
        <Route path="/notifications" element={<PageWrapper><Notifications /></PageWrapper>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

function NativeIntegration() {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    // Status Bar styling
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#13141c' }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    
    let lastBackPress = 0;
    
    // Back button handling
    const sub = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Close open modal first
      const modalOverlay = document.querySelector('.modal-overlay');
      if (modalOverlay) {
        modalOverlay.click();
        return;
      }
      
      // 2. Navigate back a route, or require double-tap to exit on root
      const isRoot = window.location.pathname === '/' || window.location.pathname === '/login';
      if (isRoot) {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastBackPress = now;
          toast.success('Press back again to exit', { duration: 2000, position: 'bottom-center' });
        }
      } else {
        navigate(-1);
      }
    });
    
    return () => {
      sub.then(listener => listener.remove());
    };
  }, [navigate]);

  return null;
}

function NotificationManager() {
  const { query: subQuery } = useSubscriptions();
  const { query: accQuery } = useAccounts();
  const { query: debtQuery } = useDebts();
  const { query: tripQuery } = useTrips();
  
  const subscriptions = subQuery.data;
  const accounts = accQuery.data;
  const debts = debtQuery.data;
  const trips = tripQuery.data;

  // Track notified states to prevent spam
  const [notifiedLowAccounts, setNotifiedLowAccounts] = useState(new Set());
  const [notifiedPaidDebts, setNotifiedPaidDebts] = useState(new Set());

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      requestNotificationPermissions();
    }
  }, []);

  useEffect(() => {
    if (subscriptions && debts && trips) {
      scheduleUpcomingReminders(subscriptions, debts, trips);
    }
  }, [subscriptions, debts, trips]);

  useEffect(() => {
    if (accounts) {
      const thresholdStr = localStorage.getItem('low_balance_threshold');
      if (thresholdStr) {
        const threshold = parseFloat(thresholdStr);
        if (!isNaN(threshold)) {
          accounts.forEach(acc => {
            if (acc.current_balance < threshold) {
              if (!notifiedLowAccounts.has(acc.id)) {
                // Fire notification
                checkLowBalance([{ ...acc, balance: acc.current_balance }]);
                setNotifiedLowAccounts(prev => new Set(prev).add(acc.id));
              }
            } else {
              // Reset if it goes back up
              if (notifiedLowAccounts.has(acc.id)) {
                setNotifiedLowAccounts(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(acc.id);
                  return newSet;
                });
              }
            }
          });
        }
      }
    }
  }, [accounts, notifiedLowAccounts]);

  useEffect(() => {
    if (debts) {
      debts.forEach(debt => {
        if (debt.remaining_balance <= 0 && debt.total_amount > 0) {
          if (!notifiedPaidDebts.has(debt.id)) {
            triggerCelebration();
            notifyDebtPaid(debt.name);
            setNotifiedPaidDebts(prev => new Set(prev).add(debt.id));
          }
        } else {
          if (notifiedPaidDebts.has(debt.id)) {
            setNotifiedPaidDebts(prev => {
              const newSet = new Set(prev);
              newSet.delete(debt.id);
              return newSet;
            });
          }
        }
      });
    }
  }, [debts, notifiedPaidDebts]);

  return null;
}

function AppShell() {
  const { user, loading, signOut } = useSupabaseAuth();
  const [unlocked, setUnlocked] = useState(
    !Capacitor.isNativePlatform() || localStorage.getItem('biometricEnabled') !== 'true'
  );
  
  // Start the background polling for Vercel updates
  useVersionCheck();

  useEffect(() => {
    if (!loading && Capacitor.isNativePlatform() && localStorage.getItem('biometricEnabled') === 'true' && !unlocked) {
      NativeBiometric.isAvailable().then(result => {
        if (result.isAvailable) {
          NativeBiometric.verifyIdentity({
            reason: "Authenticate to view Budget",
            title: "Unlock Budget Planner",
          }).then(() => {
            setUnlocked(true);
            SplashScreen.hide().catch(() => {});
          }).catch(() => {
            // failed, leave locked
            SplashScreen.hide().catch(() => {});
          });
        } else {
          setUnlocked(true);
          SplashScreen.hide().catch(() => {});
        }
      });
    } else if (!loading) {
      SplashScreen.hide().catch(() => {});
    }
  }, [loading, unlocked]);

  useEffect(() => {
    // Silently process overdue subscriptions when app loads
    if (user && unlocked) {
      apiClient.post('/subscriptions/process').catch(() => {});
    }
  }, [user, unlocked]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <motion.div
          animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)' }}
        />
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}
        >
          Loading…
        </motion.p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 24, background: 'var(--color-bg)' }}>
        <div style={{ padding: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.05)' }}>
          <Lock size={48} color="var(--color-text)" />
        </div>
        <h2 style={{ fontWeight: 600 }}>App Locked</h2>
        <button className="btn btn-primary" onClick={() => {
          NativeBiometric.verifyIdentity({ reason: "Authenticate to view Budget", title: "Unlock Budget Planner" })
            .then(() => setUnlocked(true)).catch(() => {});
        }}>Unlock with Biometrics</button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <NativeIntegration />
      <Routes>
        <Route path="/login"  element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="/pay/:id" element={<PayLink />} />
        <Route
          path="/*"
          element={
            <AuthGuard user={user}>
              <div className="app-shell">
                <OfflineBanner />
                <NotificationManager />
                <Navbar user={user} onSignOut={signOut} />
                <main className="main-content">
                  <ErrorBoundary>
                    <AnimatedRoutes />
                  </ErrorBoundary>
                </main>
                <ChatOverlay />
              </div>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontSize: '14px',
            boxShadow: 'var(--shadow-lg)',
          },
          success: { iconTheme: { primary: '#34d399', secondary: 'var(--color-surface)' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: 'var(--color-surface)' } },
        }}
      />
    </QueryClientProvider>
  );
}
