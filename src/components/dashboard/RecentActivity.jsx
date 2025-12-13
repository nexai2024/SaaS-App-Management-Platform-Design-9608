import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiDollarSign, FiGitBranch, FiUsers, FiFileText, FiClock } = FiIcons;

const RecentActivity = () => {
  const activities = [
    {
      id: 1,
      type: 'sale',
      title: 'New subscription for TaskFlow Pro',
      description: 'Premium plan - $29/month',
      time: '2 minutes ago',
      icon: FiDollarSign,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100'
    },
    {
      id: 2,
      type: 'update',
      title: 'Repository updated',
      description: 'InvoiceGen - Feature/payment-integration',
      time: '1 hour ago',
      icon: FiGitBranch,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    {
      id: 3,
      type: 'team',
      title: 'Team member added',
      description: 'Sarah joined as Frontend Developer',
      time: '3 hours ago',
      icon: FiUsers,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100'
    },
    {
      id: 4,
      type: 'document',
      title: 'Marketing materials updated',
      description: 'New product screenshots uploaded',
      time: '5 hours ago',
      icon: FiFileText,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100'
    },
    {
      id: 5,
      type: 'task',
      title: 'Task completed',
      description: 'Fix login authentication bug',
      time: '1 day ago',
      icon: FiClock,
      iconColor: 'text-gray-600',
      iconBg: 'bg-gray-100'
    }
  ];

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-600">Latest updates across your apps</p>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.iconBg}`}>
              <SafeIcon icon={activity.icon} className={`w-4 h-4 ${activity.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-sm text-gray-600">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activity
        </button>
      </div>
    </div>
  );
};

export default RecentActivity;