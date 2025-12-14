import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import { supabase } from '../../supabase/supabase';
import { createApp } from '../../services/appService';
import SafeIcon from '../../common/SafeIcon';

const { FiExternalLink, FiTrendingUp, FiTrendingDown, FiPlus, FiLoader } = FiIcons;

const AppsList = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      setApps(data || []);
    } catch (error) {
      console.error('Error fetching apps:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Development': return 'bg-yellow-100 text-yellow-800';
      case 'Maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddApp = async () => {
    if (creating) return;
    try {
      setCreating(true);
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
        setApps([data, ...apps.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Error creating app:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <SafeIcon icon={FiLoader} className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">My Apps</h3>
          <p className="text-sm text-gray-600">Overview of your SaaS applications</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddApp}
            disabled={creating}
            className="bg-blue-50 text-blue-600 px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1 disabled:opacity-70"
          >
            {creating ? (
              <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
            ) : (
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
            )}
            <span className="text-sm">Add</span>
          </button>
          <Link
            to="/apps"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
          >
            <span>View all</span>
            <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {apps.map((app) => (
          <Link
            key={app.id}
            to={`/apps/${app.id}`}
            className="block p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-900">{app.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{(app.users_count || 0).toLocaleString()} users</span>
                  <span>${(app.revenue || 0).toLocaleString()}</span>
                  <div className="flex items-center space-x-1">
                    <SafeIcon 
                      icon={app.growth_rate > 0 ? FiTrendingUp : FiTrendingDown} 
                      className={`w-4 h-4 ${app.growth_rate > 0 ? 'text-green-500' : app.growth_rate < 0 ? 'text-red-500' : 'text-gray-400'}`} 
                    />
                    <span className={app.growth_rate > 0 ? 'text-green-600' : app.growth_rate < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {app.growth_rate > 0 ? '+' : ''}{app.growth_rate || 0}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {app.tech_stack && app.tech_stack.slice(0, 3).map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                  {app.tech_stack && app.tech_stack.length > 3 && (
                    <span className="text-xs text-gray-500">+{app.tech_stack.length - 3} more</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {apps.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiPlus} className="w-6 h-6 text-gray-400" />
          </div>
          <h4 className="text-md font-medium text-gray-900 mb-2">No apps yet</h4>
          <p className="text-sm text-gray-600 mb-4">Create your first SaaS application</p>
          <button
            onClick={handleAddApp}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Create App
          </button>
        </div>
      )}
    </div>
  );
};

export default AppsList;