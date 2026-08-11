import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { createApp, importAppFromJSON } from '../services/appService';
import AppCardMonitor from '../components/app/AppCardMonitor';
import { getUptimeConfig, syncUptimeFromProvider } from '../services/uptimeIntegrations';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiPlus, FiSearch, FiFilter, FiMoreVertical, FiExternalLink, 
  FiGithub, FiGlobe, FiDollarSign, FiUsers, FiTrendingUp, FiEdit3, FiLoader, FiUpload
} = FiIcons;

const Apps = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    if (userId) {
      fetchApps();
    } else {
      setLoading(false);
    }
  }, [userId]);

  // Background provider sync (UptimeRobot / Better Stack cron results)
  useEffect(() => {
    if (!userId || apps.length === 0) return undefined;
    const cfg = getUptimeConfig();
    if (cfg.provider === 'none') return undefined;
    if (!cfg.uptimeRobotApiKey && !cfg.betterStackToken) return undefined;

    let cancelled = false;
    const run = async () => {
      try {
        await syncUptimeFromProvider(apps);
        if (!cancelled) {
          // Force remount-friendly refresh by touching state lightly
          setApps((prev) => [...prev]);
        }
      } catch {
        /* settings will show lastSyncError */
      }
    };

    run();
    const minutes = Math.max(1, Number(cfg.autoSyncMinutes) || 5);
    const timer = window.setInterval(run, minutes * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [userId, apps.length]);

  const fetchApps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}&sort=created_at&order=desc`);
      
      if (res?.status === 'error') throw new Error(res.error);
      setApps(res?.data ?? []);
    } catch (error) {
      console.error('Error fetching apps:', error);
      setError('Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  };

  const handleAddApp = async () => {
    if (creating || !userId) return;
    try {
      setCreating(true);
      setError(null);

      const newAppData = {
        name: `New App ${new Date().getTime()}`,
        description: 'A new SaaS application',
        status: 'Development',
        tech_stack: JSON.stringify(['React', 'Node.js']), // NCB stores arrays as strings in some cases or jsonb
        users_count: 0,
        revenue: 0,
        growth_rate: 0,
        specifications: JSON.stringify({})
      };

      const { data, error: createError } = await createApp(newAppData);
      
      if (createError) throw new Error(createError);

      if (data) {
        setApps(prev => [data, ...prev]);
      }
    } catch (error) {
      console.error('Error creating app:', error);
      setError('Failed to create app: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !userId) return;

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target.result);
          const { data, error } = await importAppFromJSON(json);
          
          if (error) throw new Error(error);
          
          if (data) {
            setApps(prev => [data, ...prev]);
            alert('Project imported successfully!');
          }
        } catch (err) {
          console.error('Import failed:', err);
          alert('Failed to import project: ' + err.message);
        } finally {
          setImporting(false);
          event.target.value = '';
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('File reading failed:', err);
      setImporting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'development': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'maintenance': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredApps = (apps ?? []).filter(app => {
    const name = app?.name ?? '';
    const desc = app?.description ?? '';
    const status = app?.status ?? '';
    
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-shell"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">My Apps</h1>
          <p className="page-subtitle">Manage and monitor your SaaS applications</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <label className={`cursor-pointer bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2 ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {importing ? (
              <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
            ) : (
              <SafeIcon icon={FiUpload} className="w-4 h-4" />
            )}
            <span>Import JSON</span>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={importing}
            />
          </label>
          <button 
            onClick={handleAddApp}
            disabled={creating}
            className="btn-primary font-medium flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {creating ? (
              <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
            ) : (
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
            )}
            <span>{creating ? 'Creating...' : 'Add New App'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchApps} className="text-sm font-medium hover:underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 max-w-md">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiFilter} className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Development">Development</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredApps.map((app) => (
          <motion.div
            key={app.id}
            whileHover={{ y: -2 }}
            className="panel p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{app.description}</p>
                {/* Tech Stack */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(() => {
                    let techStack = [];
                    try {
                      techStack = typeof app.tech_stack === 'string' ? JSON.parse(app.tech_stack) : (app.tech_stack || []);
                    } catch (e) {
                      techStack = [];
                    }
                    return (Array.isArray(techStack) ? techStack : []).map((tech, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-brand-50 text-brand-700 text-xs rounded-md font-medium"
                      >
                        {tech}
                      </span>
                    ));
                  })()}
                </div>
              </div>
              <div className="relative">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <SafeIcon icon={FiMoreVertical} className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <AppCardMonitor app={app} />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <SafeIcon icon={FiUsers} className="w-4 h-4" />
                  <span>Users</span>
                </div>
                <p className="font-semibold text-gray-900">{(app.users_count || 0).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <SafeIcon icon={FiDollarSign} className="w-4 h-4" />
                  <span>Revenue</span>
                </div>
                <p className="font-semibold text-gray-900">${(app.revenue || 0).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <SafeIcon icon={FiTrendingUp} className="w-4 h-4" />
                  <span>Growth</span>
                </div>
                <p className={`font-semibold ${(app.growth_rate || 0) > 0 ? 'text-green-600' : (app.growth_rate || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {(app.growth_rate || 0) > 0 ? '+' : ''}{app.growth_rate || 0}%
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex items-center space-x-3 mb-4">
              {app.repository && (
                <a 
                  href={app.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <SafeIcon icon={FiGithub} className="w-4 h-4" />
                  <span>Repository</span>
                </a>
              )}
              {app.domain && (
                <a 
                  href={`https://${app.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <SafeIcon icon={FiGlobe} className="w-4 h-4" />
                  <span>Live Site</span>
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Updated {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : 'Unknown'}
              </p>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                </button>
                <Link
                  to={`/apps/${app.id}`}
                  className="flex items-center space-x-1 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors text-sm font-medium"
                >
                  <span>View Details</span>
                  <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredApps.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiSearch} className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No apps found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
          <button 
            onClick={handleAddApp}
            className="btn-primary font-medium"
          >
            Create your first app
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Apps;