import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { 
  FiPlus, FiSearch, FiFilter, FiMoreVertical, FiExternalLink,
  FiGithub, FiGlobe, FiDollarSign, FiUsers, FiTrendingUp, FiEdit3
} = FiIcons;

const Apps = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const apps = [
    {
      id: 1,
      name: 'TaskFlow Pro',
      description: 'Advanced task management and productivity suite',
      status: 'Active',
      techStack: ['React', 'Node.js', 'PostgreSQL', 'Redis'],
      repository: 'https://github.com/username/taskflow-pro',
      domain: 'taskflow.pro',
      landingPage: 'https://taskflow.pro',
      users: 1240,
      revenue: 8420,
      growth: 12.5,
      pricing: [
        { name: 'Starter', price: 9 },
        { name: 'Pro', price: 29 },
        { name: 'Enterprise', price: 99 }
      ],
      lastUpdated: '2024-01-14'
    },
    {
      id: 2,
      name: 'InvoiceGen',
      description: 'Automated invoice generation and billing system',
      status: 'Active',
      techStack: ['Vue.js', 'Express', 'MongoDB', 'Stripe'],
      repository: 'https://github.com/username/invoicegen',
      domain: 'invoicegen.app',
      landingPage: 'https://invoicegen.app',
      users: 892,
      revenue: 5680,
      growth: 8.2,
      pricing: [
        { name: 'Basic', price: 15 },
        { name: 'Professional', price: 45 }
      ],
      lastUpdated: '2024-01-12'
    },
    {
      id: 3,
      name: 'ChatBot Builder',
      description: 'No-code chatbot creation platform',
      status: 'Development',
      techStack: ['React', 'Python', 'Redis', 'OpenAI'],
      repository: 'https://github.com/username/chatbot-builder',
      domain: 'chatbotbuilder.io',
      landingPage: 'https://chatbotbuilder.io',
      users: 0,
      revenue: 0,
      growth: 0,
      pricing: [
        { name: 'Starter', price: 19 },
        { name: 'Growth', price: 49 },
        { name: 'Scale', price: 149 }
      ],
      lastUpdated: '2024-01-15'
    },
    {
      id: 4,
      name: 'Analytics Dashboard',
      description: 'Business intelligence and analytics platform',
      status: 'Active',
      techStack: ['Angular', 'Django', 'MySQL', 'D3.js'],
      repository: 'https://github.com/username/analytics-dashboard',
      domain: 'analyticsplus.co',
      landingPage: 'https://analyticsplus.co',
      users: 456,
      revenue: 3240,
      growth: -2.1,
      pricing: [
        { name: 'Solo', price: 25 },
        { name: 'Team', price: 75 },
        { name: 'Enterprise', price: 199 }
      ],
      lastUpdated: '2024-01-10'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-200';
      case 'Development': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Maintenance': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || app.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Apps</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your SaaS applications</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2">
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add New App</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 max-w-md">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiFilter} className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="development">Development</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredApps.map((app) => (
          <motion.div
            key={app.id}
            whileHover={{ y: -2 }}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
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
                  {app.techStack.map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <SafeIcon icon={FiMoreVertical} className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <SafeIcon icon={FiUsers} className="w-4 h-4" />
                  <span>Users</span>
                </div>
                <p className="font-semibold text-gray-900">{app.users.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <SafeIcon icon={FiDollarSign} className="w-4 h-4" />
                  <span>Revenue</span>
                </div>
                <p className="font-semibold text-gray-900">${app.revenue.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
                  <SafeIcon icon={FiTrendingUp} className="w-4 h-4" />
                  <span>Growth</span>
                </div>
                <p className={`font-semibold ${
                  app.growth > 0 ? 'text-green-600' : app.growth < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {app.growth > 0 ? '+' : ''}{app.growth}%
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex items-center space-x-3 mb-4">
              <a
                href={app.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <SafeIcon icon={FiGithub} className="w-4 h-4" />
                <span>Repository</span>
              </a>
              <a
                href={app.landingPage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <SafeIcon icon={FiGlobe} className="w-4 h-4" />
                <span>Live Site</span>
              </a>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Updated {new Date(app.lastUpdated).toLocaleDateString()}
              </p>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                </button>
                <Link
                  to={`/apps/${app.id}`}
                  className="flex items-center space-x-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <span>View Details</span>
                  <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiSearch} className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No apps found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Create your first app
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Apps;