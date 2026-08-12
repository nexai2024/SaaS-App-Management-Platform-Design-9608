import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { authFetch, dataFetch } from './api';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Apps from './pages/Apps';
import AppDetails from './pages/AppDetails';
import Analytics from './pages/Analytics';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SharedNote from './pages/SharedNote';
import Portfolio from './pages/Portfolio';
import TaskBoard from './pages/TaskBoard';
import Ideas from './pages/Ideas';
import Costs from './pages/Costs';
import Roadmap from './pages/Roadmap';
import WeeklyUpdate from './pages/WeeklyUpdate';
import PublicRoadmap from './pages/PublicRoadmap';
import PublicStatus from './pages/PublicStatus';
import PublicWaitlist from './pages/PublicWaitlist';
import StatusManage from './pages/StatusManage';
import Waitlists from './pages/Waitlists';
import Support from './pages/Support';
import Affiliates from './pages/Affiliates';
import ContentCalendar from './pages/ContentCalendar';
import Experiments from './pages/Experiments';
import CustomerHealth from './pages/CustomerHealth';
import Domains from './pages/Domains';
import LegalVault from './pages/LegalVault';
import Copilot from './pages/Copilot';
import { hydrateStudioFromCloud } from './services/studioFeatures';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from './common/SafeIcon';

const { FiLoader } = FiIcons;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar: '',
  });

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    hydrateStudioFromCloud().catch((e) => console.warn('Studio hydrate skipped', e));
    const id = setInterval(() => {
      hydrateStudioFromCloud().catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  const avatarFor = (name, email, avatarUrl) => {
    if (avatarUrl && !avatarUrl.includes('unsplash.com/photo-1472099645785')) {
      return avatarUrl;
    }
    const label = encodeURIComponent(name || email || 'User');
    return `https://ui-avatars.com/api/?name=${label}&background=0891b2&color=fff&size=128`;
  };

  const checkSession = async () => {
    try {
      const res = await authFetch('get-session');
      if (res?.status === 'success' && res.data?.user) {
        const authUser = res.data.user;
        localStorage.setItem('user_id', authUser.id);

        const sessionName =
          authUser.name ||
          authUser.full_name ||
          [authUser.firstName, authUser.lastName].filter(Boolean).join(' ') ||
          (authUser.email ? authUser.email.split('@')[0] : 'User');
        const sessionEmail = authUser.email || '';

        setUserProfile({
          name: sessionName,
          email: sessionEmail,
          avatar: avatarFor(sessionName, sessionEmail, authUser.image || authUser.avatar_url),
        });
        setIsAuthenticated(true);
        fetchProfile(authUser.id, { name: sessionName, email: sessionEmail, image: authUser.image });
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

  const fetchProfile = async (userId, sessionFallback = {}) => {
    try {
      const res = await dataFetch(`read/profiles_1739884512?id=${userId}`);
      if (res?.status === 'success' && res.data?.[0]) {
        const profile = res.data[0];
        const name = profile.full_name || sessionFallback.name || 'User';
        const email = profile.email || sessionFallback.email || '';
        setUserProfile({
          name,
          email,
          avatar: avatarFor(name, email, profile.avatar_url || sessionFallback.image),
        });
        return;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    // Keep session fallback already set
    if (sessionFallback.name || sessionFallback.email) {
      setUserProfile((prev) => ({
        name: prev.name || sessionFallback.name || 'User',
        email: prev.email || sessionFallback.email || '',
        avatar: prev.avatar || avatarFor(sessionFallback.name, sessionFallback.email, sessionFallback.image),
      }));
    }
  };

  const handleSignOut = async () => {
    try {
      await authFetch('sign-out', { method: 'POST' });
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      localStorage.removeItem('user_id');
      setIsAuthenticated(false);
      setUserProfile({ name: '', email: '', avatar: '' });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-app-mesh bg-[#f3f6f8]">
        <div className="panel px-6 py-5 flex items-center gap-3">
          <SafeIcon icon={FiLoader} className="w-5 h-5 text-brand-600 animate-spin" />
          <span className="text-sm font-medium text-ink-600">Loading studio…</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/shared/note/:token" element={<SharedNote />} />
        <Route path="/public/roadmap" element={<PublicRoadmap />} />
        <Route path="/public/roadmap/:appId" element={<PublicRoadmap />} />
        <Route path="/status" element={<PublicStatus />} />
        <Route path="/launch/:slug" element={<PublicWaitlist />} />

        {!isAuthenticated ? (
          <Route
            path="*"
            element={
              <Login
                onLoginSuccess={() => {
                  setIsAuthenticated(true);
                  checkSession();
                }}
              />
            }
          />
        ) : (
          <Route
            path="*"
            element={
              <div className="app-shell">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  <Header
                    onMenuClick={() => setSidebarOpen(true)}
                    user={userProfile}
                    onSignOut={handleSignOut}
                  />
                  <main className="flex-1 overflow-auto pb-6">
                    <AnimatePresence mode="wait">
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/portfolio" element={<Portfolio />} />
                        <Route path="/board" element={<TaskBoard />} />
                        <Route path="/ideas" element={<Ideas />} />
                        <Route path="/costs" element={<Costs />} />
                        <Route path="/roadmap" element={<Roadmap />} />
                        <Route path="/updates" element={<WeeklyUpdate />} />
                        <Route path="/status-manage" element={<StatusManage />} />
                        <Route path="/waitlists" element={<Waitlists />} />
                        <Route path="/support" element={<Support />} />
                        <Route path="/affiliates" element={<Affiliates />} />
                        <Route path="/content" element={<ContentCalendar />} />
                        <Route path="/experiments" element={<Experiments />} />
                        <Route path="/health" element={<CustomerHealth />} />
                        <Route path="/domains" element={<Domains />} />
                        <Route path="/legal" element={<LegalVault />} />
                        <Route path="/copilot" element={<Copilot />} />
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
