import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabase';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { 
  FiPlus, FiPlay, FiPause, FiSettings, FiGitBranch, FiCalendar, 
  FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiEdit3, FiTrash2,
  FiZap, FiFilter, FiActivity, FiCode, FiUpload, FiDatabase, FiGitPullRequest,
  FiSave, FiX
} = FiIcons;

const WorkflowsSection = ({ appId }) => {
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [],
    is_active: true
  });

  useEffect(() => {
    if (appId) {
      fetchWorkflows();
      fetchExecutions();
    }
  }, [appId]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('app_id', appId)
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      const workflowData = {
        ...newWorkflow,
        app_id: appId,
        user_id: (await supabase.auth.getUser()).data.user.id,
        steps: [
          { id: 'step1', name: 'Run Tests', type: 'testing', config: { test_type: 'unit' } },
          { id: 'step2', name: 'Build App', type: 'build', config: { environment: 'production' } },
          { id: 'step3', name: 'Deploy', type: 'deploy', config: { target: 'production' } }
        ]
      };

      const { data, error } = await supabase
        .from('workflows')
        .insert([workflowData])
        .select();
      
      if (error) throw error;
      fetchWorkflows();
      setShowCreateWorkflow(false);
      setNewWorkflow({
        name: '',
        description: '',
        trigger_type: 'manual',
        trigger_config: {},
        steps: [],
        is_active: true
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const handleRunWorkflow = async (workflowId) => {
    try {
      // Create workflow execution
      const executionData = {
        workflow_id: workflowId,
        app_id: appId,
        status: 'running',
        total_steps: 3,
        steps_completed: 0
      };

      const { data: execution } = await supabase
        .from('workflow_executions')
        .insert([executionData])
        .select();

      if (execution && execution[0]) {
        // Simulate workflow execution
        await simulateWorkflowExecution(execution[0].id);
      }

      // Update workflow run stats
      await supabase
        .from('workflows')
        .update({ 
          last_run: new Date().toISOString(),
          run_count: supabase.rpc('increment', { count: 1 }),
          success_count: supabase.rpc('increment', { count: 1 })
        })
        .eq('id', workflowId);

      fetchWorkflows();
      fetchExecutions();
    } catch (error) {
      console.error('Error running workflow:', error);
    }
  };

  const simulateWorkflowExecution = async (executionId) => {
    const steps = [
      { step: 1, delay: 2000 },
      { step: 2, delay: 3000 },
      { step: 3, delay: 1500 }
    ];

    for (const { step, delay } of steps) {
      await new Promise(resolve => setTimeout(resolve, delay));
      await supabase
        .from('workflow_executions')
        .update({ 
          steps_completed: step,
          status: step === 3 ? 'completed' : 'running'
        })
        .eq('id', executionId);
      
      if (step === 3) {
        await supabase
          .from('workflow_executions')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', executionId);
      }
    }
    fetchExecutions();
  };

  const handleToggleWorkflow = async (workflow) => {
    try {
      await supabase
        .from('workflows')
        .update({ is_active: !workflow.is_active })
        .eq('id', workflow.id);
      fetchWorkflows();
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      try {
        await supabase.from('workflows').delete().eq('id', workflowId);
        fetchWorkflows();
      } catch (error) {
        console.error('Error deleting workflow:', error);
      }
    }
  };

  const getTriggerIcon = (type) => {
    switch (type) {
      case 'manual': return FiPlay;
      case 'push': return FiGitBranch;
      case 'schedule': return FiCalendar;
      case 'webhook': return FiZap;
      case 'event': return FiActivity;
      default: return FiSettings;
    }
  };

  const getTriggerColor = (type) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'push': return 'bg-green-100 text-green-800';
      case 'schedule': return 'bg-purple-100 text-purple-800';
      case 'webhook': return 'bg-orange-100 text-orange-800';
      case 'event': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return FiCheckCircle;
      case 'failed': return FiXCircle;
      case 'running': return FiActivity;
      default: return FiAlertCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-400';
    }
  };

  const getStepIcon = (type) => {
    switch (type) {
      case 'testing': return FiCode;
      case 'build': return FiUpload;
      case 'deploy': return FiGitPullRequest;
      case 'backup': return FiDatabase;
      default: return FiSettings;
    }
  };

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
          <h3 className="text-lg font-semibold text-gray-900">Workflows</h3>
          <p className="text-sm text-gray-600">Automate your development and deployment processes</p>
        </div>
        <button
          onClick={() => setShowCreateWorkflow(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Workflows List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow) => (
          <motion.div
            key={workflow.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTriggerColor(workflow.trigger_type)}`}>
                    {workflow.trigger_type}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={workflow.is_active} 
                      onChange={() => handleToggleWorkflow(workflow)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                
                {/* Workflow Steps */}
                <div className="space-y-2 mb-4">
                  {workflow.steps && workflow.steps.map((step, index) => (
                    <div key={step.id || index} className="flex items-center space-x-2 text-sm">
                      <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                        {index + 1}
                      </div>
                      <SafeIcon icon={getStepIcon(step.type)} className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{step.name}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiActivity} className="w-3 h-3" />
                    <span>{workflow.run_count || 0} runs</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiCheckCircle} className="w-3 h-3" />
                    <span>{workflow.success_count || 0} successful</span>
                  </div>
                  {workflow.last_run && (
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiClock} className="w-3 h-3" />
                      <span>Last run {new Date(workflow.last_run).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button 
                onClick={() => handleRunWorkflow(workflow.id)}
                disabled={!workflow.is_active}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <SafeIcon icon={FiPlay} className="w-3 h-3" />
                <span>Run</span>
              </button>
              <div className="flex items-center space-x-2">
                <button className="text-gray-400 hover:text-gray-600">
                  <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteWorkflow(workflow.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Executions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Recent Executions</h4>
        </div>
        <div className="divide-y divide-gray-100">
          {executions.slice(0, 10).map((execution) => (
            <div key={execution.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SafeIcon icon={getStatusIcon(execution.status)} className={`w-4 h-4 ${getStatusColor(execution.status)}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Workflow #{execution.workflow_id?.substring(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Started {new Date(execution.started_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span>{execution.steps_completed || 0}/{execution.total_steps || 0}</span>
                  <span>steps</span>
                </div>
                {execution.completed_at && (
                  <span>
                    {Math.round((new Date(execution.completed_at) - new Date(execution.started_at)) / 1000)}s
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiZap} className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-600 mb-4">Automate your development processes with workflows</p>
          <button
            onClick={() => setShowCreateWorkflow(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Workflow
          </button>
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Workflow</h3>
              <button
                onClick={() => setShowCreateWorkflow(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Workflow name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what this workflow does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
                <select
                  value={newWorkflow.trigger_type}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, trigger_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="manual">Manual</option>
                  <option value="push">Git Push</option>
                  <option value="schedule">Scheduled</option>
                  <option value="webhook">Webhook</option>
                  <option value="event">Event-based</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Default Workflow Steps</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">1</div>
                    <SafeIcon icon={FiCode} className="w-4 h-4" />
                    <span>Run Tests</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                    <SafeIcon icon={FiUpload} className="w-4 h-4" />
                    <span>Build App</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">3</div>
                    <SafeIcon icon={FiGitPullRequest} className="w-4 h-4" />
                    <span>Deploy to Production</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-3">You can customize these steps after creating the workflow</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateWorkflow(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflow}
                disabled={!newWorkflow.name}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4 inline mr-2" />
                Create Workflow
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsSection;