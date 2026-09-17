import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from '@capacitor/splash-screen';

import { useSupabaseAuth } from './hooks/useSupabaseAuth.js';
import { useVersionCheck } from './hooks/useVersionCheck.js';
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
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const { user, loading, signOut } = useSupabaseAuth();
  
  // Start the background polling for Vercel updates
  useVersionCheck();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hide().catch(() => {});
    }
  }, [loading]);

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

  return (
    <BrowserRouter>
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
