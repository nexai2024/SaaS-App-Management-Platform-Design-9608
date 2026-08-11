import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  listCachedStrategies,
  clearCachedStrategy,
  clearAllCachedStrategies,
  labelForTable,
} from '../lib/ncbSaveCache';
import { toastSuccess, toastError } from '../components/common/Toast';
import {
  getUptimeConfig,
  saveUptimeConfig,
  ensureWebhookSecret,
  listProviderMonitors,
  syncUptimeFromProvider,
  ingestUptimeWebhook,
  sampleWebhookPayloads,
} from '../services/uptimeIntegrations';
import { dataFetch } from '../api';

const { 
  FiUser, FiBell, FiShield, FiCreditCard, FiGlobe, FiDatabase,
  FiSave, FiTrash2, FiEye, FiEyeOff, FiCheck, FiX, FiAlertTriangle, FiRefreshCw, FiActivity, FiCopy
} = FiIcons;

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    marketing: true
  });
  const [ncbCache, setNcbCache] = useState({});
  const [uptimeCfg, setUptimeCfg] = useState(() => getUptimeConfig());
  const [showUrKey, setShowUrKey] = useState(false);
  const [showBsKey, setShowBsKey] = useState(false);
  const [uptimeBusy, setUptimeBusy] = useState(false);
  const [webhookPaste, setWebhookPaste] = useState('');
  const [remoteMonitors, setRemoteMonitors] = useState([]);

  const refreshNcbCache = () => {
    setNcbCache(listCachedStrategies() || {});
  };

  useEffect(() => {
    if (activeTab === 'data') refreshNcbCache();
    if (activeTab === 'integrations') {
      const cfg = getUptimeConfig();
      if (!cfg.webhookSecret) {
        ensureWebhookSecret();
        setUptimeCfg(getUptimeConfig());
      } else {
        setUptimeCfg(cfg);
      }
    }
  }, [activeTab]);

  const persistUptime = (patch) => {
    const next = saveUptimeConfig(patch);
    setUptimeCfg(next);
    return next;
  };

  const handleTestProvider = async () => {
    try {
      setUptimeBusy(true);
      const monitors = await listProviderMonitors(uptimeCfg);
      setRemoteMonitors(monitors);
      toastSuccess(`Connected — ${monitors.length} monitor(s) found`);
    } catch (e) {
      toastError(e.message || 'Provider connection failed (CORS or invalid key)');
    } finally {
      setUptimeBusy(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setUptimeBusy(true);
      const userId = localStorage.getItem('user_id');
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`);
      const apps = res?.data ?? [];
      const result = await syncUptimeFromProvider(apps);
      setUptimeCfg(getUptimeConfig());
      toastSuccess(`Synced ${result.updated} app(s) from ${result.totalMonitors} monitors`);
    } catch (e) {
      setUptimeCfg(getUptimeConfig());
      toastError(e.message || 'Sync failed');
    } finally {
      setUptimeBusy(false);
    }
  };

  const handleIngestWebhook = () => {
    try {
      const result = ingestUptimeWebhook(webhookPaste, { secret: uptimeCfg.webhookSecret });
      toastSuccess(`Webhook applied → app ${result.appId} is ${result.status}`);
      setWebhookPaste('');
    } catch (e) {
      toastError(e.message || 'Invalid webhook payload');
    }
  };

  const copyWebhookHint = async () => {
    const secret = ensureWebhookSecret();
    setUptimeCfg(getUptimeConfig());
    const text = `Webhook secret: ${secret}\nPaste JSON alerts in Settings → Integrations, or sync via API.\nMap monitors on each app card so webhook monitor IDs resolve.`;
    await navigator.clipboard.writeText(text);
    toastSuccess('Webhook instructions copied');
  };

  const handleClearTableCache = (tableKey) => {
    clearCachedStrategy(tableKey);
    refreshNcbCache();
    toastSuccess(`Cleared cache for ${labelForTable(tableKey)}`);
  };

  const handleClearAllNcbCache = () => {
    if (!confirm('Clear all NCB save caches? The next save for each table will probe payload shapes again.')) {
      return;
    }
    clearAllCachedStrategies();
    refreshNcbCache();
    toastSuccess('NCB save cache cleared');
  };

  const formatCacheDate = (value) => {
    if (!value) return '—';
    try {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
    } catch {
      return String(value);
    }
  };

  const cacheEntries = Object.entries(ncbCache);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'security', label: 'Security', icon: FiShield },
    { id: 'billing', label: 'Billing', icon: FiCreditCard },
    { id: 'integrations', label: 'Integrations', icon: FiGlobe },
    { id: 'data', label: 'Data & Privacy', icon: FiDatabase }
  ];

  const integrations = [
    {
      name: 'GitHub',
      description: 'Connect your repositories for automatic deployments',
      connected: true,
      icon: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
    },
    {
      name: 'Slack',
      description: 'Get notifications in your Slack workspace',
      connected: true,
      icon: 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png'
    },
    {
      name: 'Stripe',
      description: 'Process payments and manage subscriptions',
      connected: false,
      icon: 'https://images.ctfassets.net/fzn2n1nzq965/3AGidihOJl4nH9D1vDjM84/9540155d584be52fc54c443b6efa4ae6/stripe.png'
    },
    {
      name: 'Google Analytics',
      description: 'Track user behavior and app performance',
      connected: false,
      icon: 'https://developers.google.com/analytics/images/terms/logo_lockup_analytics_icon_vertical_black_2x.png'
    }
  ];

  const TabButton = ({ tab, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-brand-100 text-brand-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <SafeIcon icon={tab.icon} className="w-5 h-5" />
      <span>{tab.label}</span>
    </button>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
            <div className="flex items-center space-x-4">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <button className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors text-sm">
                  Change Photo
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                defaultValue="Alex Johnson"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                defaultValue="alex@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                defaultValue="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            rows={4}
            defaultValue="Independent SaaS developer passionate about creating useful tools and applications."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        
        <div className="mt-6 flex items-center space-x-3">
          <button className="btn-primary flex items-center space-x-2">
            <SafeIcon icon={FiSave} className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">App Notifications</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">New Sales</p>
                  <p className="text-sm text-gray-600">Get notified when you receive new orders</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">Team Updates</p>
                  <p className="text-sm text-gray-600">Notifications about team member activities</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">System Updates</p>
                  <p className="text-sm text-gray-600">Important system maintenance and updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Marketing Communications</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">Product Updates</p>
                  <p className="text-sm text-gray-600">News about new features and improvements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">Tips & Tutorials</p>
                  <p className="text-sm text-gray-600">Helpful content to grow your business</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex items-center space-x-3">
          <button className="btn-primary">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Password & Authentication</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <SafeIcon 
                  icon={showPassword ? FiEyeOff : FiEye} 
                  className="w-4 h-4 text-gray-400" 
                />
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <button className="btn-primary">
            Update Password
          </button>
        </div>
      </div>
      
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">SMS Authentication</p>
            <p className="text-sm text-gray-600">Receive verification codes via SMS</p>
          </div>
          <button className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors text-sm">
            Enable
          </button>
        </div>
      </div>
      
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Current Session</p>
              <p className="text-sm text-gray-600">Chrome on macOS • San Francisco, CA</p>
              <p className="text-xs text-gray-500">Active now</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
              Current
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Mobile Device</p>
              <p className="text-sm text-gray-600">Safari on iOS • Last seen 2 hours ago</p>
            </div>
            <button className="text-red-600 hover:text-red-700 text-sm">Revoke</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h3>
        
        <div className="border border-brand-200 bg-brand-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">Pro Plan</h4>
              <p className="text-brand-700">$29/month • Unlimited apps and advanced analytics</p>
              <p className="text-sm text-brand-700 mt-1">Next billing: January 15, 2024</p>
            </div>
            <button className="btn-primary">
              Manage Plan
            </button>
          </div>
        </div>
      </div>
      
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-accent rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">VISA</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
              <p className="text-sm text-gray-600">Expires 12/2025</p>
            </div>
          </div>
          <button className="text-brand-700 hover:text-brand-800 text-sm">Update</button>
        </div>
      </div>
      
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Pro Plan - January 2024</p>
              <p className="text-sm text-gray-600">Jan 15, 2024</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">$29.00</p>
              <button className="text-brand-700 hover:text-brand-800 text-sm">Download</button>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Pro Plan - December 2023</p>
              <p className="text-sm text-gray-600">Dec 15, 2023</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">$29.00</p>
              <button className="text-brand-700 hover:text-brand-800 text-sm">Download</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">
      <div className="panel p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SafeIcon icon={FiActivity} className="w-5 h-5 text-brand-700" />
              <h3 className="text-lg font-semibold text-gray-900">Uptime providers</h3>
            </div>
            <p className="text-sm text-gray-600 max-w-2xl">
              Connect UptimeRobot or Better Stack so their cron checks your sites while you&apos;re
              offline. Studio syncs status into app cards on a schedule (and on demand).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uptimeBusy}
              onClick={handleTestProvider}
              className="btn-secondary text-sm"
            >
              <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${uptimeBusy ? 'animate-spin' : ''}`} />
              Test connection
            </button>
            <button
              type="button"
              disabled={uptimeBusy}
              onClick={handleSyncAll}
              className="btn-primary text-sm"
            >
              Sync now
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Provider</label>
            <select
              value={uptimeCfg.provider}
              onChange={(e) => persistUptime({ provider: e.target.value })}
              className="input-field"
            >
              <option value="uptimerobot">UptimeRobot</option>
              <option value="betterstack">Better Stack (Better Uptime)</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="label">Auto-sync interval (minutes)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={uptimeCfg.autoSyncMinutes ?? 5}
              onChange={(e) => persistUptime({ autoSyncMinutes: Number(e.target.value) || 5 })}
              className="input-field"
            />
          </div>
        </div>

        {uptimeCfg.provider === 'uptimerobot' && (
          <div>
            <label className="label">UptimeRobot API key (read-only OK)</label>
            <div className="relative">
              <input
                type={showUrKey ? 'text' : 'password'}
                value={uptimeCfg.uptimeRobotApiKey || ''}
                onChange={(e) => persistUptime({ uptimeRobotApiKey: e.target.value })}
                className="input-field pr-10"
                placeholder="uXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX"
                autoComplete="off"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-400"
                onClick={() => setShowUrKey((v) => !v)}
              >
                <SafeIcon icon={showUrKey ? FiEyeOff : FiEye} className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-500 mt-1.5">
              My Settings → API → Create read-only API key. Monitors must use the same URLs as your
              app domain / landing page for auto-match.
            </p>
          </div>
        )}

        {uptimeCfg.provider === 'betterstack' && (
          <div>
            <label className="label">Better Stack API token</label>
            <div className="relative">
              <input
                type={showBsKey ? 'text' : 'password'}
                value={uptimeCfg.betterStackToken || ''}
                onChange={(e) => persistUptime({ betterStackToken: e.target.value })}
                className="input-field pr-10"
                placeholder="Bearer token from Better Stack"
                autoComplete="off"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-400"
                onClick={() => setShowBsKey((v) => !v)}
              >
                <SafeIcon icon={showBsKey ? FiEyeOff : FiEye} className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-500 mt-1.5">
              Better Stack → API tokens. Browser CORS may block this API; use webhooks below if sync
              fails.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-3 text-sm">
          <p className="font-medium text-ink-800">Last sync</p>
          <p className="text-ink-500 text-xs mt-1">
            {uptimeCfg.lastSyncAt
              ? `${new Date(uptimeCfg.lastSyncAt).toLocaleString()} · ${
                  uptimeCfg.lastSyncOk ? 'OK' : `Error: ${uptimeCfg.lastSyncError || 'failed'}`
                }`
              : 'Not synced yet'}
          </p>
          {Object.keys(uptimeCfg.mappings || {}).length > 0 && (
            <p className="text-xs text-ink-500 mt-1">
              {Object.keys(uptimeCfg.mappings).length} app↔monitor mapping(s) saved
            </p>
          )}
        </div>

        {remoteMonitors.length > 0 && (
          <div className="border border-ink-100 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Provider monitors
            </div>
            <div className="divide-y divide-ink-50 max-h-48 overflow-y-auto">
              {remoteMonitors.map((m) => (
                <div key={`${m.provider}-${m.id}`} className="px-4 py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900 truncate">{m.name}</p>
                    <p className="text-xs text-ink-500 truncate">{m.url}</p>
                  </div>
                  <span className={m.status === 'up' ? 'badge-success' : m.status === 'down' ? 'badge-danger' : 'badge-neutral'}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Webhook ingest</h3>
            <p className="text-sm text-gray-600 mt-1">
              Point UptimeRobot / Better Stack alert webhooks at Zapier/Make, or paste JSON here.
              Events update the mapped app card even when you weren&apos;t online during the outage.
            </p>
          </div>
          <button type="button" onClick={copyWebhookHint} className="btn-secondary text-sm shrink-0">
            <SafeIcon icon={FiCopy} className="w-4 h-4" /> Copy setup
          </button>
        </div>
        <div>
          <label className="label">Webhook secret</label>
          <input
            className="input-field font-mono text-xs"
            value={uptimeCfg.webhookSecret || ''}
            readOnly
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div>
          <label className="label">Paste webhook JSON</label>
          <textarea
            rows={6}
            value={webhookPaste}
            onChange={(e) => setWebhookPaste(e.target.value)}
            className="input-field font-mono text-xs"
            placeholder={JSON.stringify(sampleWebhookPayloads().uptimerobot, null, 2)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleIngestWebhook} className="btn-primary text-sm">
            Apply webhook payload
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => setWebhookPaste(JSON.stringify(sampleWebhookPayloads().uptimerobot, null, 2))}
          >
            Sample UptimeRobot
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => setWebhookPaste(JSON.stringify(sampleWebhookPayloads().betterstack, null, 2))}
          >
            Sample Better Stack
          </button>
        </div>
      </div>

      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Other services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <img
                  src={integration.icon}
                  alt={integration.name}
                  className="w-8 h-8 rounded"
                />
                <div>
                  <h4 className="font-medium text-gray-900">{integration.name}</h4>
                  <p className="text-sm text-gray-600">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  integration.connected 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {integration.connected ? 'Connected' : 'Not Connected'}
                </span>
                <button className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  integration.connected
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                }`}>
                  {integration.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDataPrivacy = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">NCB Save Cache</h3>
            <p className="text-sm page-subtitle">
              Remembers which columns and write mode worked for each table so pricing, sales, and
              marketing saves don’t retry failing payloads. Clear after a schema change to re-learn.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshNcbCache}
            className="shrink-0 text-gray-500 hover:text-brand-700 p-2 rounded-lg hover:bg-brand-50"
            title="Refresh"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
          </button>
        </div>

        {cacheEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
            <p className="text-sm text-gray-600">No cached strategies yet.</p>
            <p className="text-xs text-gray-500 mt-1">
              Save a pricing plan, sale, or marketing asset to populate this list.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {cacheEntries.map(([tableKey, entry]) => (
              <div
                key={tableKey}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <p className="font-medium text-gray-900">{labelForTable(tableKey)}</p>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-blue-100">
                      {entry.mode || 'create'}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ${
                      entry.useOwner
                        ? 'bg-amber-50 text-amber-800 border-amber-100'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {entry.useOwner ? 'owner_id' : 'no owner'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate" title={tableKey}>{tableKey}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    <span className="font-medium text-gray-700">Strategy:</span>{' '}
                    <span className="font-mono">{entry.strategyId || '—'}</span>
                  </p>
                  <p className="text-xs page-subtitle">
                    <span className="font-medium text-gray-700">Columns:</span>{' '}
                    {(entry.columns || []).length
                      ? entry.columns.join(', ')
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Updated {formatCacheDate(entry.updatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleClearTableCache(tableKey)}
                  className="shrink-0 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100"
                >
                  Clear
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleClearAllNcbCache}
          disabled={cacheEntries.length === 0}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <SafeIcon icon={FiTrash2} className="w-4 h-4" />
          <span>Clear NCB Save Cache</span>
        </button>
      </div>

      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h3>
        
        <p className="text-gray-600 mb-4">
          Download a copy of all your data including apps, analytics, and settings.
        </p>
        
        <button className="btn-primary">
          Request Data Export
        </button>
      </div>
      
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Analytics Tracking</p>
              <p className="text-sm text-gray-600">Allow us to collect anonymous usage data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Third-party Cookies</p>
              <p className="text-sm text-gray-600">Allow third-party services to set cookies</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
      
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <div className="flex items-center space-x-3 mb-4">
          <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
            <p className="text-sm text-red-700 mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2">
              <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfile();
      case 'notifications': return renderNotifications();
      case 'security': return renderSecurity();
      case 'billing': return renderBilling();
      case 'integrations': return renderIntegrations();
      case 'data': return renderDataPrivacy();
      default: return renderProfile();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;