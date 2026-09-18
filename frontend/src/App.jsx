import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Lock } from 'lucide-react';

import { useSupabaseAuth } from './hooks/useSupabaseAuth.js';
import { useVersionCheck } from './hooks/useVersionCheck.js';
import apiClient from './lib/apiClient.js';
import Navbar from './components/Navbar.jsx';
import AuthGuard from './components/AuthGuard.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/** Wraps each route so it fades + slides in/out */
function PageWrapper({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ minHeight: '100%' }}
    >
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
          <motion.div
            animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)' }}
          />
        </div>
      }>
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
    StatusBar.setBackgroundColor({ color: '#13141c' }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    
    // Back button handling
    const sub = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // For simple routing we can just go back, if we're on the root path, exit.
      if (window.location.pathname === '/' || window.location.pathname === '/login') {
        CapacitorApp.exitApp();
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
        <Route
          path="/*"
          element={
            <AuthGuard user={user}>
              <div className="app-shell">
                <Navbar user={user} onSignOut={signOut} />
                <main className="main-content">
                  <ErrorBoundary>
                    <AnimatedRoutes />
                  </ErrorBoundary>
                </main>
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
