import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createApp } from '../../services/appService';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const {
  FiMenu,
  FiBell,
  FiSearch,
  FiChevronDown,
  FiUser,
  FiLogOut,
  FiSettings,
  FiPlus,
  FiLoader,
} = FiIcons;

function displayName(user) {
  const name = String(user?.name || '').trim();
  if (name && name.toLowerCase() !== 'user') return name;
  const email = String(user?.email || '').trim();
  if (email.includes('@')) return email.split('@')[0];
  return email || 'Account';
}

function avatarSrc(user) {
  if (user?.avatar && !String(user.avatar).includes('unsplash.com/photo-1472099645785')) {
    return user.avatar;
  }
  const label = encodeURIComponent(displayName(user) || user?.email || 'User');
  return `https://ui-avatars.com/api/?name=${label}&background=0891b2&color=fff&size=128`;
}

const Header = ({ onMenuClick, user, onSignOut }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingApp, setCreatingApp] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();

  const name = useMemo(() => displayName(user), [user]);
  const email = String(user?.email || '').trim();
  const avatar = useMemo(() => avatarSrc(user), [user]);

  const notifications = [
    { id: 1, title: 'New sale for TaskFlow Pro', time: '2 min ago', type: 'sale' },
    { id: 2, title: 'Repository updated: ProjectX', time: '1 hour ago', type: 'update' },
    { id: 3, title: 'Team member invitation sent', time: '3 hours ago', type: 'team' },
  ];

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      if (onSignOut) {
        await onSignOut();
      }
    } finally {
      setSigningOut(false);
      setShowUserMenu(false);
    }
  };

  const handleCreateApp = async () => {
    if (creatingApp) return;
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      setCreatingApp(true);
      const newApp = {
        name: `New App ${new Date().getTime()}`,
        description: 'A new SaaS application',
        status: 'Development',
        tech_stack: JSON.stringify(['React', 'NCB']),
        users_count: 0,
        revenue: 0,
        growth_rate: 0,
        specifications: JSON.stringify({}),
      };

      const { data, error } = await createApp(newApp);
      if (error) {
        console.error('Error creating app:', error);
        return;
      }
      if (data?.id) navigate(`/apps/${data.id}`);
    } catch (error) {
      console.error('Error creating app:', error);
    } finally {
      setCreatingApp(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 px-4 sm:px-6 pt-3 pb-2">
      <div className="panel flex items-center justify-between px-3 sm:px-4 py-2.5 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl hover:bg-ink-100 transition-colors"
          >
            <SafeIcon icon={FiMenu} className="w-5 h-5 text-ink-600" />
          </button>

          <div className="relative hidden sm:block flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <SafeIcon icon={FiSearch} className="w-4 h-4 text-ink-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps, deals, tasks…"
              className="input-field pl-10 py-2 bg-ink-50/60 border-ink-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleCreateApp}
            disabled={creatingApp}
            className="btn-primary py-2"
          >
            {creatingApp ? (
              <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
            ) : (
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Add App</span>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2.5 rounded-xl hover:bg-ink-100 transition-colors"
            >
              <SafeIcon icon={FiBell} className="w-5 h-5 text-ink-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white" />
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-80 panel-solid z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-ink-100">
                    <h3 className="font-display font-semibold text-ink-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="px-4 py-3 border-b border-ink-50 hover:bg-ink-50/70 cursor-pointer"
                      >
                        <p className="text-sm font-medium text-ink-900">{notification.title}</p>
                        <p className="text-xs text-ink-400 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center">
                    <button className="text-sm text-brand-700 hover:text-brand-800 font-medium">
                      View all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-ink-100 transition-colors max-w-[220px]"
            >
              <img
                src={avatar}
                alt={name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-soft shrink-0 bg-brand-100"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0891b2&color=fff&size=128`;
                }}
              />
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-medium text-ink-900 leading-none truncate">{name}</p>
                <p className="text-[11px] text-ink-400 mt-1 truncate">
                  {email || 'No email on profile'}
                </p>
              </div>
              <SafeIcon icon={FiChevronDown} className="w-4 h-4 text-ink-400 hidden sm:block shrink-0" />
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-64 panel-solid z-50 overflow-hidden py-1.5"
                >
                  <div className="px-4 py-3 border-b border-ink-100">
                    <p className="text-sm font-semibold text-ink-900 truncate">{name}</p>
                    <p className="text-xs text-ink-500 mt-0.5 truncate">{email || 'Add email in Settings'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <SafeIcon icon={FiUser} className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <SafeIcon icon={FiSettings} className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <div className="my-1.5 border-t border-ink-100" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <SafeIcon icon={signingOut ? FiLoader : FiLogOut} className={`w-4 h-4 ${signingOut ? 'animate-spin' : ''}`} />
                    <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                  </button>
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
