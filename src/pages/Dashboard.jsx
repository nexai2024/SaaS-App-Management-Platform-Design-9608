import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import StatsCard from '../components/dashboard/StatsCard';
import RevenueChart from '../components/dashboard/RevenueChart';
import AppsList from '../components/dashboard/AppsList';
import RecentActivity from '../components/dashboard/RecentActivity';
import TasksWidget from '../components/dashboard/TasksWidget';

const { FiDollarSign, FiUsers, FiTrendingUp, FiLayers } = FiIcons;

const Dashboard = () => {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$24,580',
      change: '+12.5%',
      changeType: 'positive',
      icon: FiDollarSign
    },
    {
      title: 'Active Users',
      value: '1,429',
      change: '+8.2%',
      changeType: 'positive',
      icon: FiUsers
    },
    {
      title: 'Growth Rate',
      value: '23.1%',
      change: '+2.4%',
      changeType: 'positive',
      icon: FiTrendingUp
    },
    {
      title: 'Active Apps',
      value: '12',
      change: '+2',
      changeType: 'positive',
      icon: FiLayers
    }
  ];

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
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
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