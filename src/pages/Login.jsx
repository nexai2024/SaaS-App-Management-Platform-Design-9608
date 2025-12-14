import React, { useState } from 'react';
import { supabase } from '../supabase/supabase';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiMail, FiLock, FiZap, FiLoader } = FiIcons;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
            // Create initial profile
            await supabase.from('profiles').insert([
                { id: data.user.id, full_name: 'New User', role: 'Developer' }
            ]);
            alert('Check your email for the confirmation link!');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiZap} className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isSignUp ? 'Start managing your apps today' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SafeIcon icon={FiMail} className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SafeIcon icon={FiLock} className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
          >
            {loading ? (
              <SafeIcon icon={FiLoader} className="w-5 h-5 animate-spin" />
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;