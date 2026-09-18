import { impactLight } from '../lib/haptics.js';
import { tapFeedback } from '../lib/motion.js';
import { useState } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth.js';
import { Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const sharedPageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--color-bg)',
  padding: '24px',
};

export default function Signup() {
  const { signUp } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signUp(email, password);
    setLoading(false);
    if (err) {
      setError(err.message);
      setShakeKey((k) => k + 1);
    } else {
      setDone(true);
    }
  }

  return (
    <div style={sharedPageStyle}>
      {/* Animated background blobs */}
      <motion.div
        style={{
          position: 'fixed', top: '10%', right: '20%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(237,237,237,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="wait">
        {done ? (
          /* ── Success card ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '100%', maxWidth: 420,
              background: 'var(--color-surface)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: 20,
              padding: '56px 40px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
              textAlign: 'center',
              position: 'relative', zIndex: 1,
            }}
          >
            {/* Checkmark */}
            <motion.div
              style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.34, 1.6, 0.64, 1] }}
            >
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={34} color="var(--color-success)" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: 'var(--color-text)' }}>
                Check your email
              </h2>
              <p style={{ color: 'var(--color-text-2)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                We sent a confirmation link to{' '}
                <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
                <br />Click it to activate your account.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.35 }}
              >
                <Link
                  to="/login"
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', height: 44 }}
                >
                  Back to sign in
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          /* ── Sign up form ── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '100%', maxWidth: 420,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
              padding: '48px 40px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
              position: 'relative', zIndex: 1,
            }}
          >
            {/* Logo */}
            <motion.div
              style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}
              initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.34, 1.5, 0.64, 1] }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wallet size={26} color="#000" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              style={{ textAlign: 'center', marginBottom: 32 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
            >
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, color: 'var(--color-text)' }}>
                Create account
              </h1>
              <p style={{ color: 'var(--color-text-2)', fontSize: 14 }}>
                Start managing your finances smarter
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Error */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key={shakeKey + '_err'}
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 10, padding: '10px 14px',
                      color: 'var(--color-danger)', fontSize: 13,
                    }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <motion.div
                className="form-group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.3, ease: 'easeOut' }}
              >
                <label className="label" htmlFor="signup-email">Email</label>
                <input
                  id="signup-email" type="email" className="input"
                  placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus
                />
              </motion.div>

              {/* Password */}
              <motion.div
                className="form-group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.38, ease: 'easeOut' }}
              >
                <label className="label" htmlFor="signup-password">Password</label>
                <input
                  id="signup-password" type="password" className="input"
                  placeholder="Min 6 characters" minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                />
              </motion.div>

              {/* Submit */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.46, ease: 'easeOut' }}
              >
                <motion.button
                  key={shakeKey}
                  id="signup-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  animate={shakeKey > 0 ? {
                    x: [0, -10, 10, -8, 8, -4, 4, 0],
                    transition: { duration: 0.55, ease: 'easeInOut' }
                  } : { x: 0 }}
                  whileHover={!loading ? { scale: 1.02, transition: { duration: 0.15 } } : {}}
                  whileTap={!loading ? tapFeedback : {}} onTapStart={!loading ? impactLight : undefined}
                  style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: 15 }}
                >
                  {loading ? (
                    <motion.div
                      style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%' }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                    />
                  ) : 'Create Account'}
                </motion.button>
              </motion.div>
            </form>

            <motion.p
              style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--color-text-2)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Sign in
              </Link>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
