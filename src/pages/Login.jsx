import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { authFetch } from '../api';
import { profiles } from '../services/dataLayer';
import { toastError, toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiMail, FiLock, FiZap, FiLoader, FiUser } = FiIcons;

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const res = await authFetch('sign-up/email', {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
        });

        if (res?.status === 'error') throw new Error(res.error || 'Signup failed');

        if (res?.status === 'success' && res.data?.user) {
          localStorage.setItem('user_id', res.data.user.id);
          await profiles.createForUser(res.data.user, {
            fullName: name || 'New User',
            email,
          });
          toastSuccess('Account created');
          onLoginSuccess();
        }
      } else {
        const res = await authFetch('sign-in/email', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        if (res?.status === 'error') throw new Error(res.error || 'Invalid credentials');

        if (res?.status === 'success' && res.data?.user) {
          localStorage.setItem('user_id', res.data.user.id);
          onLoginSuccess();
        }
      }
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-login-mesh flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-accent flex items-center justify-center mx-auto mb-5 shadow-lift">
            <SafeIcon icon={FiZap} className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white tracking-tight">Studio</h1>
          <p className="text-white/60 mt-2 text-sm">SaaS portfolio OS for indie founders</p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/95 backdrop-blur-xl shadow-lift p-7 sm:p-8">
          <div className="mb-6">
            <h2 className="font-display text-xl font-semibold text-ink-950">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-ink-500 text-sm mt-1">
              {isSignUp ? 'Start managing your apps today' : 'Sign in to your founder dashboard'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <SafeIcon icon={FiUser} className="w-4 h-4 text-ink-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Jane Founder"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <SafeIcon icon={FiMail} className="w-4 h-4 text-ink-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <SafeIcon icon={FiLock} className="w-4 h-4 text-ink-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? (
                <SafeIcon icon={FiLoader} className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-ink-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="ml-2 text-brand-700 hover:text-brand-800 font-semibold"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
