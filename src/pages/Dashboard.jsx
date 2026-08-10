import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { dataFetch } from '../api';
import { createApp } from '../services/appService';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

import StatsCard from '../components/dashboard/StatsCard';
import RevenueChart from '../components/dashboard/RevenueChart';
import AppsList from '../components/dashboard/AppsList';
import RecentActivity from '../components/dashboard/RecentActivity';
import TasksWidget from '../components/dashboard/TasksWidget';

const { FiDollarSign, FiUsers, FiTrendingUp, FiLayers, FiLoader } = FiIcons;

const Dashboard = () => {
  const [stats, setStats] = useState([
    { title: 'Total Revenue', value: '$0', change: '0%', changeType: 'neutral', icon: FiDollarSign },
    { title: 'Active Users', value: '0', change: '0%', changeType: 'neutral', icon: FiUsers },
    { title: 'Growth Rate', value: '0%', change: '0%', changeType: 'neutral', icon: FiTrendingUp },
    { title: 'Active Apps', value: '0', change: '0', changeType: 'neutral', icon: FiLayers }
  ]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`);

      if (res?.status === 'error') throw new Error(res.error);

      const apps = res?.data ?? [];
      if (apps) {
        const totalRevenue = apps.reduce((acc, app) => acc + (app.revenue || 0), 0);
        const totalUsers = apps.reduce((acc, app) => acc + (app.users_count || 0), 0);
        const avgGrowth = apps.length > 0 ? apps.reduce((acc, app) => acc + (app.growth_rate || 0), 0) / apps.length : 0;
        const activeAppsCount = apps.filter(app => app.status === 'Active').length;

        setStats([
          { title: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, change: '+12.5%', changeType: 'positive', icon: FiDollarSign },
          { title: 'Active Users', value: totalUsers.toLocaleString(), change: '+8.2%', changeType: 'positive', icon: FiUsers },
          { title: 'Growth Rate', value: `${avgGrowth.toFixed(1)}%`, change: '+2.4%', changeType: 'positive', icon: FiTrendingUp },
          { title: 'Active Apps', value: activeAppsCount.toString(), change: '+2', changeType: 'positive', icon: FiLayers }
        ]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewApp = async () => {
    if (!userId) return;
    try {
      const newAppData = {
        name: `New App ${new Date().getTime()}`,
        description: 'A new SaaS application',
        status: 'Development',
        tech_stack: JSON.stringify(['React', 'Node.js']),
        users_count: 0,
        revenue: 0,
        growth_rate: 0,
        specifications: JSON.stringify({})
      };

      const { data, error } = await createApp(newAppData);

      if (error) {
        console.error('Error creating app:', error);
        alert('Failed to create app: ' + error);
        return;
      }

      if (data?.id) {
        navigate(`/apps/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating app:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your app portfolio overview.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleAddNewApp}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add New App
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        
        {/* Tasks Widget */}
        <div>
          <TasksWidget />
        </div>
      </div>

      {/* Apps and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AppsList />
        <RecentActivity />
      </div>
    </motion.div>
  );
};

export default Dashboard;