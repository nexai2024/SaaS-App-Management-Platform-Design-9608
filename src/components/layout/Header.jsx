import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabase';
import { createApp } from '../../services/appService';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiMenu, FiBell, FiSearch, FiChevronDown, FiUser, FiLogOut, FiSettings, FiPlus, FiLoader } = FiIcons;

const Header = ({ onMenuClick, user }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingApp, setCreatingApp] = useState(false);
  const navigate = useNavigate();

  const notifications = [
    { id: 1, title: 'New sale for TaskFlow Pro', time: '2 min ago', type: 'sale' },
    { id: 2, title: 'Repository updated: ProjectX', time: '1 hour ago', type: 'update' },
    { id: 3, title: 'Team member invitation sent', time: '3 hours ago', type: 'team' }
  ];

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreateApp = async () => {
    if (creatingApp) return;
    try {
      setCreatingApp(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      const newApp = {
        user_id: user.id,
        name: `New App ${new Date().getTime()}`,
        description: 'A new SaaS application',
        status: 'Development',
        tech_stack: ['React', 'Supabase'],
        users_count: 0,
        revenue: 0,
        growth_rate: 0,
        specifications: {}
      };

      const { data, error } = await createApp(newApp, user.id);

      if (error) {
        console.error('Error creating app:', error);
        return;
      }

      if (data) {
        navigate(`/apps/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating app:', error);
    } finally {
      setCreatingApp(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <SafeIcon icon={FiMenu} className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* Search */}
          <div className="relative hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SafeIcon icon={FiSearch} className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps, deals, tasks..."
              className="w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Quick Add App Button */}
          <button
            onClick={handleCreateApp}
            disabled={creatingApp}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingApp ? (
              <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
            ) : (
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
            )}
            <span>Add App</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            >
              <SafeIcon icon={FiBell} className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                >
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      >
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-gray-100">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <SafeIcon icon={FiChevronDown} className="w-4 h-4 text-gray-400" />
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                >
                  <div className="py-2">
                    <button className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <SafeIcon icon={FiUser} className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button 
                      onClick={() => navigate('/settings')}
                      className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <SafeIcon icon={FiSettings} className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <SafeIcon icon={FiLogOut} className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;