import React from 'react';
import { Link } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiExternalLink, FiTrendingUp, FiTrendingDown } = FiIcons;

const AppsList = () => {
  const apps = [
    {
      id: 1,
      name: 'TaskFlow Pro',
      status: 'Active',
      users: 1240,
      revenue: '$8,420',
      growth: '+12.5%',
      growthType: 'positive',
      techStack: ['React', 'Node.js', 'PostgreSQL']
    },
    {
      id: 2,
      name: 'InvoiceGen',
      status: 'Active',
      users: 892,
      revenue: '$5,680',
      growth: '+8.2%',
      growthType: 'positive',
      techStack: ['Vue.js', 'Express', 'MongoDB']
    },
    {
      id: 3,
      name: 'ChatBot Builder',
      status: 'Development',
      users: 0,
      revenue: '$0',
      growth: 'New',
      growthType: 'neutral',
      techStack: ['React', 'Python', 'Redis']
    },
    {
      id: 4,
      name: 'Analytics Dashboard',
      status: 'Active',
      users: 456,
      revenue: '$3,240',
      growth: '-2.1%',
      growthType: 'negative',
      techStack: ['Angular', 'Django', 'MySQL']
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Development': return 'bg-yellow-100 text-yellow-800';
      case 'Maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">My Apps</h3>
          <p className="text-sm text-gray-600">Overview of your SaaS applications</p>
        </div>
        <Link
          to="/apps"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
        >
          <span>View all</span>
          <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
        </Link>
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
                  <span>{app.users.toLocaleString()} users</span>
                  <span>{app.revenue}</span>
                  <div className="flex items-center space-x-1">
                    <SafeIcon 
                      icon={app.growthType === 'positive' ? FiTrendingUp : FiTrendingDown} 
                      className={`w-4 h-4 ${
                        app.growthType === 'positive' ? 'text-green-500' : 
                        app.growthType === 'negative' ? 'text-red-500' : 'text-gray-400'
                      }`} 
                    />
                    <span className={
                      app.growthType === 'positive' ? 'text-green-600' : 
                      app.growthType === 'negative' ? 'text-red-600' : 'text-gray-500'
                    }>
                      {app.growth}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {app.techStack.slice(0, 3).map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                  {app.techStack.length > 3 && (
                    <span className="text-xs text-gray-500">+{app.techStack.length - 3} more</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AppsList;