import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { 
  FiHome, FiLayers, FiBarChart3, FiUsers, FiSettings, 
  FiX, FiZap, FiTrendingUp 
} = FiIcons;

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navigationItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/apps', icon: FiLayers, label: 'My Apps' },
    { path: '/analytics', icon: FiBarChart3, label: 'Analytics' },
    { path: '/team', icon: FiUsers, label: 'Team' },
    { path: '/settings', icon: FiSettings, label: 'Settings' }
  ];

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' }
  };

  return (
    <>
      <motion.div
        variants={sidebarVariants}
        animate={isOpen ? 'open' : 'closed'}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 lg:translate-x-0"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SafeIcon icon={FiZap} className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SaaS Manager</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                >
                  <SafeIcon 
                    icon={item.icon} 
                    className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} 
                  />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Upgrade Banner */}
          <div className="p-4">
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center space-x-2 mb-2">
                <SafeIcon icon={FiTrendingUp} className="w-5 h-5" />
                <span className="font-semibold">Pro Plan</span>
              </div>
              <p className="text-sm text-purple-100 mb-3">
                Unlock advanced analytics and unlimited apps
              </p>
              <button className="w-full bg-white text-purple-600 py-2 px-3 rounded-md text-sm font-semibold hover:bg-purple-50 transition-colors">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;