import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabase/supabase';
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
import * as FiIcons from 'react-icons/fi';
import SafeIcon from './common/SafeIcon';

const { FiLoader } = FiIcons;

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    email: '',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  });
  const [isOnboarded, setIsOnboarded] = useState(true); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUserProfile({
          name: data.full_name || 'User',
          email: session?.user?.email || '',
          avatar: data.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        });
      } else {
        // If no profile exists yet, use defaults
        setUserProfile(prev => ({ ...prev, email: session?.user?.email }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!isOnboarded) {
    return (
      <Router>
        <Onboarding onComplete={() => setIsOnboarded(true)} />
      </Router>
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            onMenuClick={toggleSidebar} 
            user={userProfile}
          />
          
          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/apps" element={<Apps />} />
                <Route path="/apps/:id" element={<AppDetails />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/team" element={<Team />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>

        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </Router>
  );
}

export default App;