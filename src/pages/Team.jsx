import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { 
  FiPlus, FiSearch, FiMoreVertical, FiMail, FiPhone, FiCalendar,
  FiEdit3, FiTrash2, FiUserPlus, FiUsers, FiClock, FiCheck, FiX, FiLoader
} = FiIcons;

const Team = () => {
  const [activeTab, setActiveTab] = useState('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const membersRes = await dataFetch(`read/team_members_1739884512?owner_id=${userId}`);
      const tasksRes = await dataFetch(`read/app_tasks_1739884512?owner_id=${userId}`);

      setTeamMembers(membersRes?.data ?? []);
      setTasks(tasksRes?.data ?? []);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      case 'in_progress': return 'text-blue-600 bg-blue-100';
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
              <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
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
              {teamMembers.map((member) => {
                let projects = [];
                try {
                  projects = typeof member.projects === 'string' ? JSON.parse(member.projects) : (member.projects || []);
                } catch (e) {
                  projects = [];
                }
                return (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <img
                          src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.name}`}
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
                        {projects.slice(0, 2).map((project, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                            {project}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">{member.last_active}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                        <button className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {teamMembers.length === 0 && (
                <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">No team members found. Invite someone!</td>
                </tr>
              )}
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
                      <span>Assigned to: {task.assignee_name || 'Unassigned'}</span>
                      <span>App ID: {task.app_id}</span>
                      <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                    <button className="text-gray-600 hover:text-gray-700 text-sm">Complete</button>
                  </div>
                </div>
              </div>
            ))}
             {tasks.length === 0 && (
                <div className="text-center text-gray-500">No tasks assigned yet.</div>
              )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="p-6 flex justify-center h-64 items-center"><SafeIcon icon={FiLoader} className="w-8 h-8 animate-spin text-blue-600"/></div>;

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