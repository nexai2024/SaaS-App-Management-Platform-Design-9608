import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch, dataFetch } from './api';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Apps from './pages/Apps';
import AppDetails from './pages/AppDetails';
import Analytics from './pages/Analytics';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import SharedNote from './pages/SharedNote';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from './common/SafeIcon';

const { FiLoader } = FiIcons;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    email: '',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await authFetch('get-session');
      if (res?.status === 'success' && res.data?.user) {
        localStorage.setItem('user_id', res.data.user.id);
        setIsAuthenticated(true);
        fetchProfile(res.data.user.id);
      } else {
        localStorage.removeItem('user_id');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const res = await dataFetch(`read/profiles_1739884512?owner_id=${userId}`);
      if (res?.status === 'success' && res.data?.[0]) {
        const profile = res.data[0];
        setUserProfile({
          name: profile.full_name || 'User',
          email: profile.email || '',
          avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Shared Link Route */}
        <Route path="/shared/note/:token" element={<SharedNote />} />
        
        {!isAuthenticated ? (
          <Route path="*" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
        ) : (
          <Route
            path="*"
            element={
              <div className="flex h-screen bg-gray-50">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header onMenuClick={() => setSidebarOpen(true)} user={userProfile} />
                  <main className="flex-1 overflow-auto">
                    <AnimatePresence mode="wait">
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/apps" element={<Apps />} />
                        <Route path="/apps/:id" element={<AppDetails />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/team" element={<Team />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </AnimatePresence>
                  </main>
                </div>
              </div>
            }
          />
        )}
      </Routes>
    </Router>
  );
}

export default App;