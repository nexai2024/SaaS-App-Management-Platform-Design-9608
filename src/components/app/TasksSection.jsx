import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { tasks as tasksApi, team } from '../../services/dataLayer';
import { toastSuccess } from '../common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { 
  FiPlus, FiSearch, FiEdit3, FiTrash2, FiClock, FiUser, FiCalendar, 
  FiFilter, FiX, FiSave, FiCheckCircle, FiCircle, FiAlertTriangle,
  FiTarget, FiCode, FiBug, FiStar, FiPlay, FiPause, FiSquare, FiPaperclip
} = FiIcons;

const TasksSection = ({ appId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'manual',
    priority: 'medium',
    status: 'todo',
    tags: [],
    estimated_hours: '',
    due_date: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (appId) {
      fetchTasks();
      fetchTeamMembers();
    }
  }, [appId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.list(appId);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const members = await team.listMembers();
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleSaveTask = async () => {
    try {
      setError(null);
      const selectedMember = teamMembers.find((m) => String(m.id) === String(newTask.assignee_id));
      // Only send assignee_id when it maps to a profiles id — team_members.id breaks the FK.
      const assigneeId = selectedMember?.user_id || selectedMember?.profile_id || undefined;

      await tasksApi.save(
        appId,
        {
          title: newTask.title,
          description: newTask.description,
          task_type: newTask.task_type,
          priority: newTask.priority,
          status: newTask.status,
          tags: newTask.tags || [],
          estimated_hours: newTask.estimated_hours,
          due_date: newTask.due_date,
          assignee_id: assigneeId,
        },
        editingTask?.id || null
      );

      toastSuccess(editingTask ? 'Task updated' : 'Task created');
      fetchTasks();
      setShowAddTask(false);
      setEditingTask(null);
      setNewTask({ title: '', description: '', task_type: 'manual', priority: 'medium', status: 'todo', tags: [], estimated_hours: '', due_date: '' });
    } catch (error) {
      console.error('Error saving task:', error);
      setError(error.message || 'Failed to save task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksApi.remove(taskId);
        toastSuccess('Task deleted');
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await tasksApi.updateStatus(task.id, newStatus);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const addTag = (tag) => {
    if (tag && !newTask.tags.includes(tag)) {
      setNewTask(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setNewTask(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const filteredTasks = tasks.filter(task => {
    const title = String(task.title || '').toLowerCase();
    const description = String(task.description || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = title.includes(query) || description.includes(query);
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatDueDate = (value) => {
    try {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString();
    } catch {
      return String(value);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <SafeIcon icon={FiAlertTriangle} className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <SafeIcon icon={FiX} className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
          <p className="text-sm text-gray-600">Manage development tasks and track progress</p>
        </div>
        <button onClick={() => setShowAddTask(true)} className="btn-primary flex items-center space-x-2">
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
        </div>
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiFilter} className="w-4 h-4 text-gray-400" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => (
          <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3 flex-1">
                <button onClick={() => {
                  const statusFlow = { 'todo': 'in_progress', 'in_progress': 'review', 'review': 'completed', 'completed': 'todo' };
                  handleStatusChange(task, statusFlow[task.status] || 'todo');
                }} className={`mt-1 ${getStatusColor(task.status)} hover:opacity-70 transition-opacity`}>
                  <SafeIcon icon={getStatusIcon(task.status)} className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(task.task_type)}`}>{task.task_type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                  {Array.isArray(task.tags) && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {task.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">{String(tag)}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {task.assignee_id && <div className="flex items-center space-x-1"><SafeIcon icon={FiUser} className="w-3 h-3" /><span>Assigned</span></div>}
                      {task.estimated_hours && <div className="flex items-center space-x-1"><SafeIcon icon={FiClock} className="w-3 h-3" /><span>{task.estimated_hours}h</span></div>}
                      {task.due_date && <div className="flex items-center space-x-1"><SafeIcon icon={FiCalendar} className="w-3 h-3" /><span>{formatDueDate(task.due_date)}</span></div>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => { setEditingTask(task); setNewTask({ ...task, tags: task.tags || [], estimated_hours: task.estimated_hours || '', due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '' }); setShowAddTask(true); }} className="text-gray-400 hover:text-brand-700 transition-colors"><SafeIcon icon={FiEdit3} className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-600 transition-colors"><SafeIcon icon={FiTrash2} className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filteredTasks.length === 0 && !error && (
        <div className="text-center py-12 panel">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiTarget} className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-4">Create tasks to track development progress</p>
          <button onClick={() => setShowAddTask(true)} className="btn-primary">Create Your First Task</button>
        </div>
      )}
      
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
              <button onClick={() => { setShowAddTask(false); setEditingTask(null); setError(null); }} className="text-gray-400 hover:text-gray-600"><SafeIcon icon={FiX} className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="Task title..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={newTask.task_type} onChange={(e) => setNewTask(prev => ({ ...prev, task_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                    <option value="manual">Manual</option>
                    <option value="automated">Automated</option>
                    <option value="bug">Bug Fix</option>
                    <option value="feature">Feature</option>
                    <option value="testing">Testing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={newTask.priority} onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="Task description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                  <select value={newTask.assignee_id || ''} onChange={(e) => setNewTask(prev => ({ ...prev, assignee_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={newTask.due_date} onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex items-center space-x-2 mb-2">
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add tags..." />
                  <button onClick={() => addTag(tagInput)} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg">Add</button>
                </div>
                {newTask.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newTask.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-brand-100 text-brand-700 rounded-md text-sm flex items-center space-x-1">
                        <span>{tag}</span>
                        <button onClick={() => removeTag(tag)}>
                          <SafeIcon icon={FiX} className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button onClick={() => setShowAddTask(false)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={handleSaveTask} disabled={!newTask.title} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                <SafeIcon icon={FiSave} className="w-4 h-4 inline mr-2" />
                {editingTask ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const getTaskTypeIcon = (type) => { switch (type) { case 'bug': return FiBug; case 'feature': return FiStar; case 'testing': return FiCode; default: return FiTarget; } };
const getTaskTypeColor = (type) => { switch (type) { case 'bug': return 'bg-red-100 text-red-800'; case 'feature': return 'bg-green-100 text-green-800'; case 'testing': return 'bg-brand-100 text-brand-800'; default: return 'bg-gray-100 text-gray-800'; } };
const getPriorityColor = (priority) => { switch (priority) { case 'critical': return 'text-red-600 bg-red-100'; case 'high': return 'text-orange-600 bg-orange-100'; case 'medium': return 'text-yellow-600 bg-yellow-100'; case 'low': return 'text-green-600 bg-green-100'; default: return 'text-gray-600 bg-gray-100'; } };
const getStatusIcon = (status) => { switch (status) { case 'completed': return FiCheckCircle; case 'in_progress': return FiPlay; case 'review': return FiPause; default: return FiCircle; } };
const getStatusColor = (status) => { switch (status) { case 'completed': return 'text-green-600'; case 'in_progress': return 'text-brand-700'; case 'review': return 'text-yellow-600'; default: return 'text-gray-400'; } };

export default TasksSection;