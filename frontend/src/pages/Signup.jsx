import { useState } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth.js';
import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Signup() {
  const { signUp } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signUp(email, password);
    setLoading(false);
    if (err) setError(err.message);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-slide-up" style={{ textAlign: 'center' }}>
          <div className="stat-icon" style={{ margin: '0 auto var(--space-4)', width: 60, height: 60, borderRadius: 16, background: 'rgba(52,211,153,0.1)' }}>
            <span style={{ fontSize: 28 }}>✉️</span>
          </div>
          <h2 className="auth-title">Check your email</h2>
          <p className="auth-subtitle">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          <Link to="/login" className="btn btn-ghost w-full mt-6" style={{ justifyContent: 'center' }}>Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up">
        <div className="auth-logo">
          <div className="sidebar-logo-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
            <Wallet size={22} color="#fff" />
          </div>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start managing your finances smarter</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label className="label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              className="input"
              placeholder="Min 6 characters"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button id="signup-submit" type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
