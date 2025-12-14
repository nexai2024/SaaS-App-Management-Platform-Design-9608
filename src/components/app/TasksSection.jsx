import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabase';
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
      const { data, error } = await supabase
        .from('app_tasks')
        .select('*, assignee:profiles(*)')
        .eq('app_id', appId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data } = await supabase
        .from('team_members')
        .select('*');
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleSaveTask = async () => {
    try {
      const taskData = {
        ...newTask,
        app_id: appId,
        user_id: (await supabase.auth.getUser()).data.user.id,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null
      };

      let result;
      if (editingTask) {
        result = await supabase
          .from('app_tasks')
          .update(taskData)
          .eq('id', editingTask.id)
          .select();
      } else {
        result = await supabase
          .from('app_tasks')
          .insert([taskData])
          .select();
      }

      if (result.error) throw result.error;
      
      fetchTasks();
      setShowAddTask(false);
      setEditingTask(null);
      setNewTask({
        title: '',
        description: '',
        task_type: 'manual',
        priority: 'medium',
        status: 'todo',
        tags: [],
        estimated_hours: '',
        due_date: ''
      });
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await supabase.from('app_tasks').delete().eq('id', taskId);
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await supabase
        .from('app_tasks')
        .update({ status: newStatus })
        .eq('id', task.id);
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

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'bug': return FiBug;
      case 'feature': return FiStar;
      case 'testing': return FiCode;
      default: return FiTarget;
    }
  };

  const getTaskTypeColor = (type) => {
    switch (type) {
      case 'bug': return 'bg-red-100 text-red-800';
      case 'feature': return 'bg-green-100 text-green-800';
      case 'testing': return 'bg-blue-100 text-blue-800';
      case 'automated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return FiCheckCircle;
      case 'in_progress': return FiPlay;
      case 'review': return FiPause;
      default: return FiCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'review': return 'text-yellow-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
          <p className="text-sm text-gray-600">Manage development tasks and track progress</p>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
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
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3 flex-1">
                <button 
                  onClick={() => {
                    const statusFlow = {
                      'todo': 'in_progress',
                      'in_progress': 'review',
                      'review': 'completed',
                      'completed': 'todo'
                    };
                    handleStatusChange(task, statusFlow[task.status] || 'todo');
                  }}
                  className={`mt-1 ${getStatusColor(task.status)} hover:opacity-70 transition-opacity`}
                >
                  <SafeIcon icon={getStatusIcon(task.status)} className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(task.task_type)}`}>
                      {task.task_type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                  
                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {task.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {task.assignee && (
                        <div className="flex items-center space-x-1">
                          <SafeIcon icon={FiUser} className="w-3 h-3" />
                          <span>{task.assignee.full_name}</span>
                        </div>
                      )}
                      {task.estimated_hours && (
                        <div className="flex items-center space-x-1">
                          <SafeIcon icon={FiClock} className="w-3 h-3" />
                          <span>{task.estimated_hours}h</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center space-x-1">
                          <SafeIcon icon={FiCalendar} className="w-3 h-3" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setEditingTask(task);
                          setNewTask({
                            title: task.title,
                            description: task.description,
                            task_type: task.task_type,
                            priority: task.priority,
                            status: task.status,
                            tags: task.tags || [],
                            estimated_hours: task.estimated_hours || '',
                            due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
                          });
                          setShowAddTask(true);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiTarget} className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-4">Create tasks to track development progress</p>
          <button
            onClick={() => setShowAddTask(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Task
          </button>
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h3>
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setEditingTask(null);
                  setNewTask({
                    title: '',
                    description: '',
                    task_type: 'manual',
                    priority: 'medium',
                    status: 'todo',
                    tags: [],
                    estimated_hours: '',
                    due_date: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Task title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newTask.task_type}
                    onChange={(e) => setNewTask(prev => ({ ...prev, task_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="manual">Manual</option>
                    <option value="automated">Automated</option>
                    <option value="bug">Bug Fix</option>
                    <option value="feature">Feature</option>
                    <option value="testing">Testing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Task description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                  <select
                    value={newTask.assignee_id || ''}
                    onChange={(e) => setNewTask(prev => ({ ...prev, assignee_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <input
                  type="number"
                  value={newTask.estimated_hours}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: e.target.value }))}
                  placeholder="e.g., 4"
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add tags..."
                  />
                  <button
                    onClick={() => addTag(tagInput)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {newTask.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newTask.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm flex items-center space-x-1">
                        <span>{tag}</span>
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <SafeIcon icon={FiX} className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setEditingTask(null);
                  setNewTask({
                    title: '',
                    description: '',
                    task_type: 'manual',
                    priority: 'medium',
                    status: 'todo',
                    tags: [],
                    estimated_hours: '',
                    due_date: ''
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                disabled={!newTask.title}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4 inline mr-2" />
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TasksSection;