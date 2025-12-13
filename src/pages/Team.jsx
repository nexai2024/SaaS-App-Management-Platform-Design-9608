import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { 
  FiPlus, FiSearch, FiMoreVertical, FiMail, FiPhone, FiCalendar,
  FiEdit3, FiTrash2, FiUserPlus, FiUsers, FiClock, FiCheck, FiX
} = FiIcons;

const Team = () => {
  const [activeTab, setActiveTab] = useState('members');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const teamMembers = [
    {
      id: 1,
      name: 'Alex Johnson',
      email: 'alex@example.com',
      role: 'Owner',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      status: 'Active',
      joinDate: '2023-01-15',
      lastActive: '2 minutes ago',
      projects: ['TaskFlow Pro', 'InvoiceGen'],
      permissions: ['Admin', 'All Apps']
    },
    {
      id: 2,
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      role: 'Frontend Developer',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      status: 'Active',
      joinDate: '2023-03-20',
      lastActive: '1 hour ago',
      projects: ['TaskFlow Pro', 'ChatBot Builder'],
      permissions: ['Developer', 'Selected Apps']
    },
    {
      id: 3,
      name: 'Mike Rodriguez',
      email: 'mike@example.com',
      role: 'Backend Developer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      status: 'Active',
      joinDate: '2023-02-10',
      lastActive: '3 hours ago',
      projects: ['InvoiceGen', 'Analytics Dashboard'],
      permissions: ['Developer', 'Selected Apps']
    },
    {
      id: 4,
      name: 'Emma Wilson',
      email: 'emma@example.com',
      role: 'Designer',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      status: 'Invited',
      joinDate: '2024-01-10',
      lastActive: 'Pending',
      projects: ['ChatBot Builder'],
      permissions: ['Designer', 'Selected Apps']
    }
  ];

  const tasks = [
    {
      id: 1,
      title: 'Fix authentication bug',
      assignee: 'Mike Rodriguez',
      app: 'TaskFlow Pro',
      priority: 'high',
      status: 'in-progress',
      dueDate: '2024-01-18'
    },
    {
      id: 2,
      title: 'Design new dashboard layout',
      assignee: 'Emma Wilson',
      app: 'Analytics Dashboard',
      priority: 'medium',
      status: 'pending',
      dueDate: '2024-01-20'
    },
    {
      id: 3,
      title: 'Implement payment integration',
      assignee: 'Sarah Chen',
      app: 'InvoiceGen',
      priority: 'high',
      status: 'completed',
      dueDate: '2024-01-15'
    },
    {
      id: 4,
      title: 'Update API documentation',
      assignee: 'Alex Johnson',
      app: 'TaskFlow Pro',
      priority: 'low',
      status: 'in-progress',
      dueDate: '2024-01-25'
    }
  ];

  const getRoleColor = (role) => {
    switch (role) {
      case 'Owner': return 'bg-purple-100 text-purple-800';
      case 'Frontend Developer': return 'bg-blue-100 text-blue-800';
      case 'Backend Developer': return 'bg-green-100 text-green-800';
      case 'Designer': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Invited': return 'bg-yellow-100 text-yellow-800';
      case 'Inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const InviteModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
          <button
            onClick={() => setShowInviteModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <SafeIcon icon={FiX} className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="colleague@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>Frontend Developer</option>
              <option>Backend Developer</option>
              <option>Designer</option>
              <option>Product Manager</option>
              <option>Marketing</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Access</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="ml-2 text-sm text-gray-700">TaskFlow Pro</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="ml-2 text-sm text-gray-700">InvoiceGen</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="ml-2 text-sm text-gray-700">ChatBot Builder</span>
              </label>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 pt-4">
            <button
              onClick={() => setShowInviteModal(false)}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send Invitation
            </button>
            <button
              onClick={() => setShowInviteModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderMembers = () => (
    <div className="space-y-6">
      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiUsers} className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
              <p className="text-sm text-gray-600">Team Members</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiCheck} className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {teamMembers.filter(m => m.status === 'Active').length}
              </p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiClock} className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {teamMembers.filter(m => m.status === 'Invited').length}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiUserPlus} className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">12</p>
              <p className="text-sm text-gray-600">Tasks Assigned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-6 font-medium text-gray-700">Member</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Role</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Projects</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Last Active</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {member.projects.slice(0, 2).map((project, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                          {project}
                        </span>
                      ))}
                      {member.projects.length > 2 && (
                        <span className="text-xs text-gray-500">+{member.projects.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">{member.lastActive}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                      <button className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Team Tasks</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Assign Task</span>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Assigned to: {task.assignee}</span>
                      <span>App: {task.app}</span>
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                    <button className="text-gray-600 hover:text-gray-700 text-sm">Complete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600 mt-1">Manage your team members and collaborate on projects</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Team Members
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tasks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tasks & Assignments
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' ? renderMembers() : renderTasks()}

      {/* Invite Modal */}
      {showInviteModal && <InviteModal />}
    </motion.div>
  );
};

export default Team;