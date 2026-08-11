import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../../api';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { 
  FiPlus, FiPlay, FiPause, FiSettings, FiGitBranch, FiCalendar, 
  FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiEdit3, FiTrash2,
  FiZap, FiActivity, FiCode, FiUpload, FiDatabase, FiGitPullRequest,
  FiSave, FiX
} = FiIcons;

const WorkflowsSection = ({ appId }) => {
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '', trigger_type: 'manual', is_active: 1 });

  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    if (appId) { fetchWorkflows(); fetchExecutions(); }
  }, [appId]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await dataFetch(`read/workflows_1739884512?app_id=${appId}&owner_id=${userId}&sort=created_at&order=desc`);
      if (res?.status === 'error') throw new Error(res.error);
      const data = (res?.data ?? []).map(w => ({ ...w, steps: typeof w.steps === 'string' ? JSON.parse(w.steps) : (w.steps || []) }));
      setWorkflows(data);
    } catch (error) { console.error('Error fetching workflows:', error); } finally { setLoading(false); }
  };

  const fetchExecutions = async () => {
    try {
      const res = await dataFetch(`read/workflow_executions_1739884512?app_id=${appId}&owner_id=${userId}&sort=started_at&order=desc&limit=20`);
      setExecutions(res?.data ?? []);
    } catch (error) { console.error('Error fetching executions:', error); }
  };

  const handleCreateWorkflow = async () => {
    try {
      const workflowData = {
        ...newWorkflow,
        app_id: parseInt(appId),
        user_id: userId,
        steps: JSON.stringify([
          { id: 'step1', name: 'Run Tests', type: 'testing' },
          { id: 'step2', name: 'Build App', type: 'build' },
          { id: 'step3', name: 'Deploy', type: 'deploy' }
        ]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const res = await dataFetch(`create/workflows_1739884512?owner_id=${userId}`, { method: 'POST', body: JSON.stringify(workflowData) });
      if (res?.status === 'error') throw new Error(res.error);
      fetchWorkflows();
      setShowCreateWorkflow(false);
      setNewWorkflow({ name: '', description: '', trigger_type: 'manual', is_active: 1 });
    } catch (error) { console.error('Error creating workflow:', error); }
  };

  const handleRunWorkflow = async (workflowId) => {
    try {
      const executionData = { workflow_id: workflowId, app_id: parseInt(appId), status: 'running', total_steps: 3, steps_completed: 0, started_at: new Date().toISOString(), user_id: userId };
      const res = await dataFetch(`create/workflow_executions_1739884512?owner_id=${userId}`, { method: 'POST', body: JSON.stringify(executionData) });
      
      if (res?.status === 'success') {
        const executionId = res.data.id;
        // Simulate progress
        setTimeout(async () => {
          await dataFetch(`update/workflow_executions_1739884512/${executionId}?owner_id=${userId}`, { method: 'PUT', body: JSON.stringify({ status: 'completed', steps_completed: 3, completed_at: new Date().toISOString(), user_id: userId }) });
          fetchExecutions();
          // Update workflow stats
          const workflow = workflows.find(w => w.id === workflowId);
          await dataFetch(`update/workflows_1739884512/${workflowId}?owner_id=${userId}`, { method: 'PUT', body: JSON.stringify({ run_count: (workflow.run_count || 0) + 1, success_count: (workflow.success_count || 0) + 1, last_run: new Date().toISOString(), user_id: userId }) });
          fetchWorkflows();
        }, 3000);
      }
      fetchExecutions();
    } catch (error) { console.error('Error running workflow:', error); }
  };

  const handleToggleWorkflow = async (workflow) => {
    try {
      await dataFetch(`update/workflows_1739884512/${workflow.id}?owner_id=${userId}`, { method: 'PUT', body: JSON.stringify({ is_active: workflow.is_active === 1 ? 0 : 1, user_id: userId }) });
      fetchWorkflows();
    } catch (error) { console.error('Error toggling workflow:', error); }
  };

  const getTriggerIcon = (type) => { switch (type) { case 'manual': return FiPlay; case 'push': return FiGitBranch; case 'schedule': return FiCalendar; default: return FiZap; } };
  const getStatusIcon = (status) => { switch (status) { case 'completed': return FiCheckCircle; case 'failed': return FiXCircle; default: return FiActivity; } };
  const getStatusColor = (status) => { switch (status) { case 'completed': return 'text-green-600'; case 'failed': return 'text-red-600'; default: return 'text-blue-600'; } };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-gray-900">Workflows</h3><p className="text-sm text-gray-600">Automate your development and deployment processes</p></div>
        <button onClick={() => setShowCreateWorkflow(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"><SafeIcon icon={FiPlus} className="w-4 h-4" /><span>Create Workflow</span></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow) => (
          <motion.div key={workflow.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                  <span className="px-2 py-1 rounded-full text-[10px] bg-blue-100 text-blue-700 font-medium">{workflow.trigger_type}</span>
                  <button onClick={() => handleToggleWorkflow(workflow)} className={`w-8 h-4 rounded-full relative transition-colors ${workflow.is_active === 1 ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${workflow.is_active === 1 ? 'left-4.5' : 'left-0.5'}`}></div></button>
                </div>
                <p className="text-sm text-gray-600 mb-4">{workflow.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1"><SafeIcon icon={FiActivity} className="w-3 h-3" /><span>{workflow.run_count || 0} runs</span></div>
                  {workflow.last_run && <div className="flex items-center space-x-1"><SafeIcon icon={FiClock} className="w-3 h-3" /><span>Last run {new Date(workflow.last_run).toLocaleDateString()}</span></div>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button onClick={() => handleRunWorkflow(workflow.id)} disabled={workflow.is_active !== 1} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center space-x-1"><SafeIcon icon={FiPlay} className="w-3 h-3" /><span>Run</span></button>
              <div className="flex items-center space-x-2"><button className="text-gray-400 hover:text-gray-600"><SafeIcon icon={FiEdit3} className="w-4 h-4" /></button></div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200"><h4 className="font-medium text-gray-900">Recent Executions</h4></div>
        <div className="divide-y divide-gray-100">
          {executions.map((execution) => (
            <div key={execution.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3"><SafeIcon icon={getStatusIcon(execution.status)} className={`w-4 h-4 ${getStatusColor(execution.status)}`} /><div><p className="text-sm font-medium text-gray-900">Workflow #{execution.workflow_id}</p><p className="text-xs text-gray-500">Started {new Date(execution.started_at).toLocaleString()}</p></div></div>
              <div className="text-sm text-gray-600">{execution.steps_completed}/{execution.total_steps} steps</div>
            </div>
          ))}
        </div>
      </div>

      {showCreateWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900">Create Workflow</h3><button onClick={() => setShowCreateWorkflow(false)} className="text-gray-400 hover:text-gray-600"><SafeIcon icon={FiX} className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={newWorkflow.name} onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Workflow name..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label><select value={newWorkflow.trigger_type} onChange={(e) => setNewWorkflow(prev => ({ ...prev, trigger_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="manual">Manual</option><option value="push">Git Push</option><option value="schedule">Scheduled</option></select></div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6"><button onClick={() => setShowCreateWorkflow(false)} className="px-4 py-2 text-gray-600">Cancel</button><button onClick={handleCreateWorkflow} disabled={!newWorkflow.name} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Create</button></div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsSection;