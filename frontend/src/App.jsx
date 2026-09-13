import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { useSupabaseAuth } from './hooks/useSupabaseAuth.js';
import Navbar from './components/Navbar.jsx';
import AuthGuard from './components/AuthGuard.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Items from './pages/Items.jsx';
import Debts from './pages/Debts.jsx';
import Goals from './pages/Goals.jsx';
import BudgetPlanner from './pages/BudgetPlanner.jsx';
import Analytics from './pages/Analytics.jsx';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AppShell() {
  const { user, loading, signOut } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
        <Route
          path="/*"
          element={
            <AuthGuard user={user}>
              <div className="app-shell">
                <Navbar user={user} onSignOut={signOut} />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/items" element={<Items />} />
                    <Route path="/debts" element={<Debts />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/budget" element={<BudgetPlanner />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
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
            background: '#1c2033',
            color: '#e8eaf6',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#1c2033' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1c2033' } },
        }}
      />
    </QueryClientProvider>
  );
}
