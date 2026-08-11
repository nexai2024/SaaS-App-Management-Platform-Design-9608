import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { team as teamApi } from '../services/dataLayer';
import { invitesStore } from '../services/portfolioStore';
import { toastSuccess, toastError } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiPlus,
  FiUsers,
  FiClock,
  FiCheck,
  FiX,
  FiLoader,
  FiUserPlus,
  FiTrash2,
} = FiIcons;

const ROLES = [
  'Owner',
  'Admin',
  'Product Manager',
  'Frontend Developer',
  'Backend Developer',
  'Designer',
  'Marketing',
  'Member',
];

const Team = () => {
  const [activeTab, setActiveTab] = useState('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Member' });
  const [inviting, setInviting] = useState(false);

  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [members, tasksRes] = await Promise.all([
        teamApi.listMembers(),
        dataFetch(`read/app_tasks_1739884512?owner_id=${userId}`),
      ]);
      const localInvites = invitesStore.list();
      setInvites(localInvites);

      const byEmail = new Set(
        (members || []).map((m) => String(m.email || '').toLowerCase()).filter(Boolean)
      );
      const merged = [
        ...(members || []),
        ...localInvites
          .filter((inv) => inv.email && !byEmail.has(String(inv.email).toLowerCase()))
          .map((inv) => ({
            id: inv.id,
            name: inv.email.split('@')[0],
            email: inv.email,
            role: inv.role,
            status: inv.status || 'Invited',
            projects: [],
            last_active: inv.invited_at ? new Date(inv.invited_at).toLocaleDateString() : '—',
            _from_invite_store: true,
          })),
      ];
      setTeamMembers(merged);
      setTasks(tasksRes?.data ?? []);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    const email = inviteForm.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toastError('Enter a valid email');
      return;
    }
    try {
      setInviting(true);
      const remote = await teamApi.inviteMember({ email, role: inviteForm.role });
      invitesStore.save({
        email,
        role: inviteForm.role,
        remote_id: remote?.id,
        status: 'Invited',
      });
      toastSuccess(
        remote?._local_only
          ? 'Invite saved locally (DB invite unavailable)'
          : `Invitation sent to ${email}`
      );
      setInviteForm({ email: '', role: 'Member' });
      setShowInviteModal(false);
      fetchTeamData();
    } catch (e) {
      console.error(e);
      // Always persist locally so collaboration can proceed
      invitesStore.save({ email, role: inviteForm.role, status: 'Invited' });
      toastSuccess('Invite saved locally');
      setShowInviteModal(false);
      fetchTeamData();
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member) => {
    if (!confirm(`Remove ${member.email || member.name}?`)) return;
    try {
      if (member._from_invite_store) {
        invitesStore.remove(member.id);
      } else {
        await teamApi.removeMember(member.id);
        const local = invitesStore.list().find(
          (i) => String(i.email).toLowerCase() === String(member.email || '').toLowerCase()
        );
        if (local) invitesStore.remove(local.id);
      }
      toastSuccess('Member removed');
      fetchTeamData();
    } catch (e) {
      toastError(e.message || 'Failed to remove');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Owner':
      case 'Admin':
        return 'bg-purple-100 text-purple-800';
      case 'Frontend Developer':
        return 'bg-brand-100 text-brand-800';
      case 'Backend Developer':
        return 'bg-green-100 text-green-800';
      case 'Designer':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Invited':
        return 'bg-yellow-100 text-yellow-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-brand-700 bg-brand-100';
      case 'pending':
      case 'todo':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center h-64 items-center">
        <SafeIcon icon={FiLoader} className="w-8 h-8 animate-spin text-brand-700" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Team</h1>
        <p className="page-subtitle">
          Roles and invites that persist — shared ownership for multi-app collaboration
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'members'
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Team Members
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tasks'
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tasks & Assignments
          </button>
        </nav>
      </div>

      {activeTab === 'members' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="panel p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiUsers} className="w-5 h-5 text-brand-700" />
                </div>
                <div>
                  <p className="page-title">{teamMembers.length}</p>
                  <p className="text-sm text-gray-600">Team Members</p>
                </div>
              </div>
            </div>
            <div className="panel p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiCheck} className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="page-title">
                    {teamMembers.filter((m) => m.status === 'Active').length}
                  </p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
              </div>
            </div>
            <div className="panel p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiClock} className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="page-title">
                    {teamMembers.filter((m) => m.status === 'Invited').length}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </div>
            <div className="panel p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiUserPlus} className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="page-title">{invites.length}</p>
                  <p className="text-sm text-gray-600">Saved invites</p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
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
                      projects =
                        typeof member.projects === 'string'
                          ? JSON.parse(member.projects)
                          : member.projects || [];
                    } catch {
                      projects = [];
                    }
                    return (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <img
                              src={
                                member.avatar_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.email || 'U')}`
                              }
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium text-gray-900">{member.name || 'Invited'}</p>
                              <p className="text-sm text-gray-600">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(projects) ? projects : []).slice(0, 2).map((project, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-brand-50 text-brand-700 text-xs rounded-md"
                              >
                                {project}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {member.last_active || '—'}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => handleRemove(member)}
                            className="text-red-600 hover:text-red-700 text-sm inline-flex items-center gap-1"
                          >
                            <SafeIcon icon={FiTrash2} className="w-3.5 h-3.5" /> Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {teamMembers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500">
                        No team members yet. Invite a collaborator to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Team Tasks</h3>
          </div>
          <div className="p-6 space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}
                  >
                    {String(task.status || '').replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Assigned to: {task.assignee_name || 'Unassigned'}</span>
                  <span>App ID: {task.app_id}</span>
                  <span>
                    Due:{' '}
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                  </span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center text-gray-500">No tasks assigned yet.</div>
            )}
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button type="button" onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  disabled={inviting}
                  onClick={handleInvite}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {inviting ? 'Sending…' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Team;
