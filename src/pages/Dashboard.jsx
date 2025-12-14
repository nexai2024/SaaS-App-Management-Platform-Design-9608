import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/supabase';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: apps, error } = await supabase
        .from('apps')
        .select('revenue, users_count, growth_rate, status');

      if (error) throw error;

      if (apps) {
        const totalRevenue = apps.reduce((acc, app) => acc + (app.revenue || 0), 0);
        const totalUsers = apps.reduce((acc, app) => acc + (app.users_count || 0), 0);
        const avgGrowth = apps.length > 0 ? apps.reduce((acc, app) => acc + (app.growth_rate || 0), 0) / apps.length : 0;
        const activeApps = apps.filter(app => app.status === 'Active').length;

        setStats([
          { title: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, change: '+12.5%', changeType: 'positive', icon: FiDollarSign },
          { title: 'Active Users', value: totalUsers.toLocaleString(), change: '+8.2%', changeType: 'positive', icon: FiUsers },
          { title: 'Growth Rate', value: `${avgGrowth.toFixed(1)}%`, change: '+2.4%', changeType: 'positive', icon: FiTrendingUp },
          { title: 'Active Apps', value: activeApps.toString(), change: '+2', changeType: 'positive', icon: FiLayers }
        ]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewApp = async () => {
    try {
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