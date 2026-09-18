import { useState } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth.js';
import { Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { signIn } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err.message);
      setShakeKey((k) => k + 1);
    } else {
      // Show success animation — redirect will happen automatically
      // once Supabase updates the auth state (≈1-2s)
      setSuccess(true);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '24px',
      overflow: 'hidden',
    }}>
      {/* Breathing background blob */}
      <motion.div
        style={{
          position: 'fixed', top: '10%', left: '20%',
          width: 500, height: 500, borderRadius: '50%',
          background: success
            ? 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(237,237,237,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="wait">
        {success ? (
          /* ─── SUCCESS STATE ─── */
          <motion.div
            key="success"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '100%', maxWidth: 420,
              background: 'var(--color-surface)',
              border: '1px solid rgba(52,211,153,0.35)',
              borderRadius: 20,
              padding: '56px 40px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.1)',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Pulsing green ring behind the icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, position: 'relative' }}>
              {/* Outer pulse rings */}
              <motion.div
                style={{
                  position: 'absolute',
                  width: 72, height: 72, borderRadius: '50%',
                  border: '2px solid rgba(52,211,153,0.4)',
                  top: '50%', left: '50%',
                  x: '-50%', y: '-50%',
                }}
                animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                style={{
                  position: 'absolute',
                  width: 72, height: 72, borderRadius: '50%',
                  border: '2px solid rgba(52,211,153,0.3)',
                  top: '50%', left: '50%',
                  x: '-50%', y: '-50%',
                }}
                animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
              />

              {/* Icon circle */}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, duration: 0.55, ease: [0.34, 1.7, 0.64, 1] }}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'rgba(52,211,153,0.15)',
                  border: '1.5px solid rgba(52,211,153,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', zIndex: 1,
                }}
              >
                <CheckCircle size={34} color="#34d399" />
              </motion.div>
            </div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: 'easeOut' }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#34d399' }}>
                Signed in!
              </h2>
              <p style={{ color: 'var(--color-text-2)', fontSize: 14, lineHeight: 1.6 }}>
                Welcome back. Taking you to your dashboard…
              </p>
            </motion.div>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 28 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399' }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                />
              ))}
            </motion.div>
          </motion.div>
        ) : (
          /* ─── LOGIN FORM ─── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88, y: -24 }}
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
                Welcome back
              </h1>
              <p style={{ color: 'var(--color-text-2)', fontSize: 14 }}>
                Sign in to your SmartBudget account
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Error banner */}
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
                <label className="label" htmlFor="login-email">Email</label>
                <input
                  id="login-email" type="email" className="input"
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
                <label className="label" htmlFor="login-password">Password</label>
                <input
                  id="login-password" type="password" className="input"
                  placeholder="••••••••" value={password}
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
                  id="login-submit"
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
                      style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%' }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                    />
                  ) : 'Sign In'}
                </motion.button>
              </motion.div>
            </form>

            <motion.p
              style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--color-text-2)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Sign up
              </Link>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
