import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiTrendingUp, FiUsers, FiDollarSign, FiCalendar, FiDownload } = FiIcons;

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30d');

  const revenueData = [
    { month: 'Jan', revenue: 4000, users: 240, conversions: 12 },
    { month: 'Feb', revenue: 3000, users: 139, conversions: 8 },
    { month: 'Mar', revenue: 2000, users: 980, conversions: 15 },
    { month: 'Apr', revenue: 2780, users: 390, conversions: 18 },
    { month: 'May', revenue: 1890, users: 480, conversions: 22 },
    { month: 'Jun', revenue: 2390, users: 380, conversions: 19 },
    { month: 'Jul', revenue: 3490, users: 430, conversions: 25 }
  ];

  const appPerformanceData = [
    { app: 'TaskFlow Pro', revenue: 8420, users: 1240, growth: 12.5 },
    { app: 'InvoiceGen', revenue: 5680, users: 892, growth: 8.2 },
    { app: 'Analytics Dashboard', revenue: 3240, users: 456, growth: -2.1 },
    { app: 'ChatBot Builder', revenue: 0, users: 0, growth: 0 }
  ];

  const userAcquisitionData = [
    { source: 'Organic Search', users: 1245, percentage: 35 },
    { source: 'Social Media', users: 892, percentage: 25 },
    { source: 'Direct Traffic', users: 623, percentage: 18 },
    { source: 'Referrals', users: 445, percentage: 12 },
    { source: 'Paid Ads', users: 356, percentage: 10 }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
      value: '2,588',
      change: '+8.2%',
      changeType: 'positive',
      icon: FiUsers
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      change: '+0.8%',
      changeType: 'positive',
      icon: FiTrendingUp
    },
    {
      title: 'Avg. Revenue per User',
      value: '$9.50',
      change: '+2.1%',
      changeType: 'positive',
      icon: FiDollarSign
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights across all your apps</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
            <SafeIcon icon={FiCalendar} className="w-4 h-4 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent border-none outline-none text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 3 months</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <SafeIcon icon={FiDownload} className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            whileHover={{ y: -2 }}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <SafeIcon icon={stat.icon} className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
              <p className="text-sm text-gray-600">Monthly revenue over time</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Acquisition */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">User Acquisition</h3>
              <p className="text-sm text-gray-600">Traffic sources breakdown</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userAcquisitionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="users"
                >
                  {userAcquisitionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* App Performance */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">App Performance</h3>
            <p className="text-sm text-gray-600">Revenue and user metrics by app</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={appPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="app" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Conversion Funnel</h3>
            <p className="text-sm text-gray-600">User journey from visit to purchase</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">10,240</div>
            <div className="text-sm text-gray-600">Visitors</div>
            <div className="text-xs text-gray-500 mt-1">100%</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">2,588</div>
            <div className="text-sm text-gray-600">Sign-ups</div>
            <div className="text-xs text-gray-500 mt-1">25.3%</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">892</div>
            <div className="text-sm text-gray-600">Trials</div>
            <div className="text-xs text-gray-500 mt-1">8.7%</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">332</div>
            <div className="text-sm text-gray-600">Conversions</div>
            <div className="text-xs text-gray-500 mt-1">3.2%</div>
          </div>
        </div>
      </div>

      {/* Top Performing Apps Table */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Apps</h3>
            <p className="text-sm text-gray-600">Ranked by revenue growth</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">App Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Revenue</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Users</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Growth</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Trend</th>
              </tr>
            </thead>
            <tbody>
              {appPerformanceData
                .sort((a, b) => b.growth - a.growth)
                .map((app, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{app.app}</td>
                  <td className="py-3 px-4 text-gray-900">${app.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-600">{app.users.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${
                      app.growth > 0 ? 'text-green-600' : 
                      app.growth < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {app.growth > 0 ? '+' : ''}{app.growth}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-16 h-8 bg-gray-100 rounded"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default Analytics;