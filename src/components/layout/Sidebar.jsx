import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const {
  FiHome,
  FiLayers,
  FiBarChart3,
  FiUsers,
  FiSettings,
  FiX,
  FiZap,
  FiDollarSign,
  FiColumns,
  FiGitBranch,
  FiLightbulb,
  FiPieChart,
  FiFileText,
  FiActivity,
  FiInbox,
  FiGift,
  FiCalendar,
  FiTarget,
  FiHeart,
  FiGlobe,
  FiShield,
  FiMessageCircle,
  FiFlag,
} = FiIcons;

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  // Desktop: always show. Mobile drawer only slides when isOpen.
  // (Framer x:-100% was hiding the sidebar while it still reserved layout space.)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const showSidebar = isDesktop || isOpen;

  const primaryNav = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/copilot', icon: FiMessageCircle, label: 'Co-pilot' },
    { path: '/portfolio', icon: FiDollarSign, label: 'Revenue' },
    { path: '/board', icon: FiColumns, label: 'Task Board' },
    { path: '/apps', icon: FiLayers, label: 'My Apps' },
  ];

  const studioNav = [
    { path: '/ideas', icon: FiLightbulb, label: 'Ideas' },
    { path: '/roadmap', icon: FiGitBranch, label: 'Roadmap' },
    { path: '/costs', icon: FiPieChart, label: 'Costs' },
    { path: '/updates', icon: FiFileText, label: 'Weekly Update' },
  ];

  const growthNav = [
    { path: '/status-manage', icon: FiActivity, label: 'Status' },
    { path: '/waitlists', icon: FiFlag, label: 'Waitlists' },
    { path: '/support', icon: FiInbox, label: 'Support' },
    { path: '/affiliates', icon: FiGift, label: 'Affiliates' },
    { path: '/content', icon: FiCalendar, label: 'Content' },
    { path: '/experiments', icon: FiTarget, label: 'Experiments' },
    { path: '/health', icon: FiHeart, label: 'Health' },
  ];

  const opsNav = [
    { path: '/domains', icon: FiGlobe, label: 'Domains' },
    { path: '/legal', icon: FiShield, label: 'Legal' },
  ];

  const systemNav = [
    { path: '/analytics', icon: FiBarChart3, label: 'Analytics' },
    { path: '/team', icon: FiUsers, label: 'Team' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(path));

  const renderGroup = (label, items) => (
    <div className="space-y-1">
      <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}
      </p>
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={active ? 'nav-item-active' : 'nav-item-idle'}
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                active ? 'bg-white/70 text-brand-700' : 'bg-transparent text-ink-400'
              }`}
            >
              <SafeIcon icon={item.icon} className="w-4 h-4" />
            </span>
            <span>{item.label}</span>
            {active && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
            )}
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <motion.aside
        variants={{ open: { x: 0 }, closed: { x: '-100%' } }}
        animate={showSidebar ? 'open' : 'closed'}
        initial={false}
        transition={{ type: 'tween', duration: 0.28 }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-[272px] shrink-0"
      >
        <div className="flex flex-col h-full m-0 lg:m-3 lg:rounded-2xl border border-white/40 bg-white/70 backdrop-blur-2xl shadow-panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5 border-b border-ink-100/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center shadow-soft">
                <SafeIcon icon={FiZap} className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-display font-semibold text-ink-950 leading-none">Studio</p>
                <p className="text-[11px] text-ink-400 mt-1">SaaS Portfolio OS</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl hover:bg-ink-100 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-5 h-5 text-ink-500" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
            {renderGroup('Overview', primaryNav)}
            {renderGroup('Build', studioNav)}
            {renderGroup('Growth', growthNav)}
            {renderGroup('Ops', opsNav)}
            {renderGroup('System', systemNav)}
          </nav>

          <div className="p-4 border-t border-ink-100/80">
            <div className="rounded-xl bg-gradient-to-br from-brand-50 to-teal-50/80 border border-brand-100/60 p-3.5">
              <p className="text-xs font-semibold text-ink-800">Indie portfolio HQ</p>
              <p className="text-[11px] text-ink-500 mt-1 leading-relaxed">
                Revenue, runway, shipping, and updates in one place.
              </p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
