import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabase';
import { formatDistanceToNow } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiDollarSign, FiGitBranch, FiUsers, FiFileText, FiClock, FiActivity, FiLoader } = FiIcons;

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      
      // Fetch latest data from multiple sources
      const [
        { data: sales }, 
        { data: versions }, 
        { data: materials }, 
        { data: team },
        { data: tasks }
      ] = await Promise.all([
        supabase.from('sales').select('*, apps(name)').order('date', { ascending: false }).limit(5),
        supabase.from('app_versions').select('*, apps(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('marketing_materials').select('*, apps(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('team_members').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('app_tasks').select('*, apps(name)').eq('status', 'completed').order('updated_at', { ascending: false }).limit(5)
      ]);

      // Normalize and merge data
      const allActivities = [
        ...(sales || []).map(item => ({
          id: `sale-${item.id}`,
          type: 'sale',
          title: `New sale for ${item.apps?.name || 'Unknown App'}`,
          description: `${item.plan_name} - $${item.amount}`,
          timestamp: new Date(item.date),
          icon: FiDollarSign,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100'
        })),
        ...(versions || []).map(item => ({
          id: `ver-${item.id}`,
          type: 'update',
          title: `Version ${item.version_number} released`,
          description: `${item.apps?.name || 'Unknown App'} - ${item.version_type}`,
          timestamp: new Date(item.created_at),
          icon: FiGitBranch,
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100'
        })),
        ...(materials || []).map(item => ({
          id: `mat-${item.id}`,
          type: 'document',
          title: 'Marketing asset updated',
          description: `${item.apps?.name || 'App'}: ${item.name}`,
          timestamp: new Date(item.created_at),
          icon: FiFileText,
          iconColor: 'text-orange-600',
          iconBg: 'bg-orange-100'
        })),
        ...(team || []).map(item => ({
          id: `team-${item.id}`,
          type: 'team',
          title: 'New team member',
          description: `${item.name} joined as ${item.role}`,
          timestamp: new Date(item.created_at),
          icon: FiUsers,
          iconColor: 'text-purple-600',
          iconBg: 'bg-purple-100'
        })),
        ...(tasks || []).map(item => ({
          id: `task-${item.id}`,
          type: 'task',
          title: 'Task completed',
          description: `${item.apps?.name || 'App'}: ${item.title}`,
          timestamp: new Date(item.updated_at),
          icon: FiClock,
          iconColor: 'text-gray-600',
          iconBg: 'bg-gray-100'
        }))
      ];

      // Sort by date descending and take top 5
      const sorted = allActivities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6);

      setActivities(sorted);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-full flex items-center justify-center">
        <SafeIcon icon={FiLoader} className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-600">Latest updates across your workspace</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${activity.iconBg}`}>
              <SafeIcon icon={activity.icon} className={`w-4 h-4 ${activity.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
              <p className="text-sm text-gray-600 truncate">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
        
        {activities.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <SafeIcon icon={FiActivity} className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No recent activity found</p>
          </div>
        )}
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