import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Apps from './pages/Apps';
import AppDetails from './pages/AppDetails';
import Analytics from './pages/Analytics';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser] = useState({
    name: 'Alex Johnson',
    email: 'alex@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  });
  const [isOnboarded, setIsOnboarded] = useState(true); // Set to false for onboarding flow

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

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
            user={currentUser}
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