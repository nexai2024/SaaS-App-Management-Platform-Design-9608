import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { workflows as workflowsApi } from '../../services/dataLayer';
import { isTruthyFlag } from '../../lib/dataUtils';
import { toastSuccess } from '../common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const {
  FiPlus, FiPlay, FiEdit3, FiTrash2, FiX, FiSave, FiActivity, FiClock,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiGitBranch, FiCalendar,
  FiZap, FiCode, FiUpload, FiDatabase, FiSearch, FiPause, FiCopy,
  FiChevronUp, FiChevronDown, FiStopCircle
} = FiIcons;

const STEP_TYPES = [
  { value: 'testing', label: 'Testing', icon: FiCode },
  { value: 'build', label: 'Build', icon: FiDatabase },
  { value: 'deploy', label: 'Deploy', icon: FiUpload },
  { value: 'notify', label: 'Notify', icon: FiZap },
  { value: 'custom', label: 'Custom', icon: FiActivity },
];

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual', icon: FiPlay },
  { value: 'push', label: 'Git Push', icon: FiGitBranch },
  { value: 'schedule', label: 'Scheduled', icon: FiCalendar },
  { value: 'webhook', label: 'Webhook', icon: FiZap },
];

const TEMPLATES = [
  {
    id: 'ci',
    name: 'CI Pipeline',
    description: 'Run tests, build, and notify on every push',
    trigger_type: 'push',
    steps: [
      { id: 's1', name: 'Install Dependencies', type: 'build' },
      { id: 's2', name: 'Run Unit Tests', type: 'testing' },
      { id: 's3', name: 'Build Artifact', type: 'build' },
      { id: 's4', name: 'Notify Team', type: 'notify' },
    ],
  },
  {
    id: 'deploy',
    name: 'Production Deploy',
    description: 'Build and deploy to production with smoke checks',
    trigger_type: 'manual',
    steps: [
      { id: 's1', name: 'Run Smoke Tests', type: 'testing' },
      { id: 's2', name: 'Build Release', type: 'build' },
      { id: 's3', name: 'Deploy Production', type: 'deploy' },
      { id: 's4', name: 'Post-deploy Verify', type: 'testing' },
    ],
  },
  {
    id: 'backup',
    name: 'Nightly Backup',
    description: 'Scheduled backup and verification',
    trigger_type: 'schedule',
    trigger_config: { cron: '0 2 * * *' },
    steps: [
      { id: 's1', name: 'Snapshot Database', type: 'custom' },
      { id: 's2', name: 'Upload to Storage', type: 'deploy' },
      { id: 's3', name: 'Verify Integrity', type: 'testing' },
    ],
  },
];

const emptyForm = () => ({
  name: '',
  description: '',
  trigger_type: 'manual',
  trigger_config: {},
  is_active: 1,
  steps: [
    { id: `step_${Date.now()}`, name: 'Run Tests', type: 'testing' },
    { id: `step_${Date.now() + 1}`, name: 'Build App', type: 'build' },
    { id: `step_${Date.now() + 2}`, name: 'Deploy', type: 'deploy' },
  ],
});

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  } catch {
    return String(value);
  }
};

const WorkflowsSection = ({ appId }) => {
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrigger, setFilterTrigger] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (appId) {
      refreshAll();
    }
  }, [appId]);

  const refreshAll = async () => {
    try {
      setLoading(true);
      const [wf, ex] = await Promise.all([
        workflowsApi.list(appId),
        workflowsApi.listExecutions(appId),
      ]);
      setWorkflows(wf);
      setExecutions(ex);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = (template = null) => {
    setEditingWorkflow(null);
    if (template) {
      setForm({
        name: template.name,
        description: template.description,
        trigger_type: template.trigger_type,
        trigger_config: template.trigger_config || {},
        is_active: 1,
        steps: template.steps.map((s, i) => ({ ...s, id: `step_${Date.now()}_${i}` })),
      });
    } else {
      setForm(emptyForm());
    }
    setShowModal(true);
  };

  const openEdit = (workflow) => {
    setEditingWorkflow(workflow);
    setForm({
      name: workflow.name || '',
      description: workflow.description || '',
      trigger_type: workflow.trigger_type || 'manual',
      trigger_config: workflow.trigger_config || {},
      is_active: isTruthyFlag(workflow.is_active) ? 1 : 0,
      steps:
        Array.isArray(workflow.steps) && workflow.steps.length > 0
          ? workflow.steps.map((s, i) => ({
              id: s.id || `step_${i}`,
              name: s.name || `Step ${i + 1}`,
              type: s.type || 'custom',
            }))
          : emptyForm().steps,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      await workflowsApi.save(appId, form, editingWorkflow?.id || null);
      toastSuccess(editingWorkflow ? 'Workflow updated' : 'Workflow created');
      setShowModal(false);
      setEditingWorkflow(null);
      setForm(emptyForm());
      await refreshAll();
    } catch (error) {
      console.error('Error saving workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (workflow) => {
    if (!confirm(`Delete workflow "${workflow.name}"? This cannot be undone.`)) return;
    try {
      await workflowsApi.remove(workflow.id);
      toastSuccess('Workflow deleted');
      if (selectedId === workflow.id) setSelectedId(null);
      await refreshAll();
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const handleDuplicate = async (workflow) => {
    try {
      await workflowsApi.save(appId, {
        name: `${workflow.name} (copy)`,
        description: workflow.description,
        trigger_type: workflow.trigger_type,
        trigger_config: workflow.trigger_config,
        is_active: 0,
        steps: workflow.steps,
      });
      toastSuccess('Workflow duplicated');
      await refreshAll();
    } catch (error) {
      console.error('Error duplicating workflow:', error);
    }
  };

  const handleToggle = async (workflow) => {
    try {
      await workflowsApi.toggle(workflow);
      await refreshAll();
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const handleRun = async (workflow) => {
    if (!isTruthyFlag(workflow.is_active)) return;
    try {
      setRunningId(workflow.id);
      const execution = await workflowsApi.run(appId, workflow);
      toastSuccess(`Started "${workflow.name}"`);
      await refreshAll();

      if (execution?.id) {
        setTimeout(async () => {
          try {
            await workflowsApi.completeExecution(execution.id, workflow);
            toastSuccess(`"${workflow.name}" completed`);
            await refreshAll();
          } catch (error) {
            console.error('Error completing workflow:', error);
          } finally {
            setRunningId(null);
          }
        }, 2500);
      } else {
        setRunningId(null);
      }
    } catch (error) {
      console.error('Error running workflow:', error);
      setRunningId(null);
    }
  };

  const handleCancelExecution = async (executionId) => {
    try {
      await workflowsApi.cancelExecution(executionId);
      toastSuccess('Execution cancelled');
      setRunningId(null);
      await refreshAll();
    } catch (error) {
      console.error('Error cancelling execution:', error);
    }
  };

  const updateStep = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    }));
  };

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        { id: `step_${Date.now()}`, name: 'New Step', type: 'custom' },
      ],
    }));
  };

  const removeStep = (index) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const moveStep = (index, direction) => {
    setForm((prev) => {
      const next = [...prev.steps];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, steps: next };
    });
  };

  const getTriggerMeta = (type) =>
    TRIGGER_TYPES.find((t) => t.value === type) || TRIGGER_TYPES[0];

  const getStepIcon = (type) =>
    STEP_TYPES.find((t) => t.value === type)?.icon || FiActivity;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return FiCheckCircle;
      case 'failed':
        return FiXCircle;
      case 'cancelled':
        return FiStopCircle;
      default:
        return FiActivity;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-brand-700 bg-brand-50';
    }
  };

  const workflowNameById = (id) =>
    workflows.find((w) => String(w.id) === String(id))?.name || `Workflow #${id}`;

  const filteredWorkflows = workflows.filter((wf) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      String(wf.name || '').toLowerCase().includes(q) ||
      String(wf.description || '').toLowerCase().includes(q);
    const matchesTrigger = filterTrigger === 'all' || wf.trigger_type === filterTrigger;
    return matchesSearch && matchesTrigger;
  });

  const selectedWorkflow = workflows.find((w) => String(w.id) === String(selectedId));
  const selectedExecutions = executions.filter(
    (e) => !selectedId || String(e.workflow_id) === String(selectedId)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Workflows</h3>
          <p className="text-sm text-gray-600">
            Automate builds, deploys, and recurring ops with editable step pipelines
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          className="btn-primary flex items-center space-x-2 self-start"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Templates */}
      <div className="panel p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Start from a template</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => openCreate(tpl)}
              className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-brand-50/50 transition-colors"
            >
              <p className="font-medium text-gray-900 text-sm">{tpl.name}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.description}</p>
              <p className="text-[10px] text-brand-700 mt-2 uppercase tracking-wide">
                {tpl.trigger_type} · {tpl.steps.length} steps
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflows..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <select
          value={filterTrigger}
          onChange={(e) => setFilterTrigger(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All triggers</option>
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Workflow cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredWorkflows.map((workflow) => {
          const trigger = getTriggerMeta(workflow.trigger_type);
          const successRate =
            workflow.run_count > 0
              ? Math.round((workflow.success_count / workflow.run_count) * 100)
              : null;
          const isRunning = runningId === workflow.id;
          const isSelected = String(selectedId) === String(workflow.id);

          return (
            <motion.div
              key={workflow.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white p-4 rounded-lg border shadow-sm transition-colors ${
                isSelected ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : workflow.id)}
                  className="text-left flex-1 min-w-0"
                >
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{workflow.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-100 text-brand-700 font-medium inline-flex items-center gap-1">
                      <SafeIcon icon={trigger.icon} className="w-3 h-3" />
                      {trigger.label}
                    </span>
                    {!isTruthyFlag(workflow.is_active) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">Paused</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{workflow.description || 'No description'}</p>
                </button>
                <button
                  onClick={() => handleToggle(workflow)}
                  title={isTruthyFlag(workflow.is_active) ? 'Pause workflow' : 'Activate workflow'}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                    isTruthyFlag(workflow.is_active) ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                      isTruthyFlag(workflow.is_active) ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {(workflow.steps || []).slice(0, 4).map((step, i) => (
                  <span
                    key={step.id || i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 text-[11px] border border-gray-100"
                  >
                    <SafeIcon icon={getStepIcon(step.type)} className="w-3 h-3" />
                    {step.name}
                  </span>
                ))}
                {(workflow.steps || []).length > 4 && (
                  <span className="text-[11px] text-gray-400 px-1">+{workflow.steps.length - 4} more</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <SafeIcon icon={FiActivity} className="w-3 h-3" />
                    {workflow.run_count || 0} runs
                  </span>
                  {successRate != null && (
                    <span className="inline-flex items-center gap-1">
                      <SafeIcon icon={FiCheckCircle} className="w-3 h-3 text-green-500" />
                      {successRate}% success
                    </span>
                  )}
                </div>
                {workflow.last_run && (
                  <span className="inline-flex items-center gap-1">
                    <SafeIcon icon={FiClock} className="w-3 h-3" />
                    {formatDate(workflow.last_run)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleRun(workflow)}
                  disabled={!isTruthyFlag(workflow.is_active) || isRunning}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center space-x-1"
                >
                  <SafeIcon icon={isRunning ? FiActivity : FiPlay} className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Running…' : 'Run'}</span>
                </button>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDuplicate(workflow)}
                    className="p-2 text-gray-400 hover:text-brand-700 rounded-lg hover:bg-brand-50"
                    title="Duplicate"
                  >
                    <SafeIcon icon={FiCopy} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(workflow)}
                    className="p-2 text-gray-400 hover:text-brand-700 rounded-lg hover:bg-brand-50"
                    title="Edit workflow"
                  >
                    <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(workflow)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12 panel">
          <SafeIcon icon={FiZap} className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <h4 className="font-medium text-gray-900 mb-1">No workflows yet</h4>
          <p className="text-sm text-gray-500 mb-4">Create one from scratch or use a template</p>
          <button
            onClick={() => openCreate()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Workflow
          </button>
        </div>
      )}

      {/* Executions */}
      <div className="panel shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Recent Executions</h4>
            {selectedWorkflow && (
              <p className="text-xs text-gray-500 mt-0.5">Filtered to “{selectedWorkflow.name}”</p>
            )}
          </div>
          {selectedId && (
            <button onClick={() => setSelectedId(null)} className="text-xs text-brand-700 hover:underline">
              Clear filter
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {selectedExecutions.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">No executions yet. Run a workflow to see history.</div>
          )}
          {selectedExecutions.map((execution) => (
            <div key={execution.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`p-2 rounded-lg ${getStatusColor(execution.status)}`}>
                  <SafeIcon icon={getStatusIcon(execution.status)} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {workflowNameById(execution.workflow_id)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Started {formatDate(execution.started_at)}
                    {execution.completed_at ? ` · Finished ${formatDate(execution.completed_at)}` : ''}
                  </p>
                  {execution.error_message && (
                    <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                      <SafeIcon icon={FiAlertCircle} className="w-3 h-3" />
                      {execution.error_message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-sm text-gray-600">
                  {execution.steps_completed || 0}/{execution.total_steps || 0} steps
                </div>
                {execution.status === 'running' && (
                  <button
                    onClick={() => handleCancelExecution(execution.id)}
                    className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <SafeIcon icon={FiPause} className="w-3 h-3" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <SafeIcon icon={FiX} className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g. Production Deploy"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      placeholder="What does this workflow do?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
                    <select
                      value={form.trigger_type}
                      onChange={(e) => setForm((p) => ({ ...p, trigger_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {TRIGGER_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTruthyFlag(form.is_active)}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))
                        }
                        className="rounded border-gray-300 text-brand-700 focus:ring-brand-500"
                      />
                      Active (can be run)
                    </label>
                  </div>
                </div>

                {form.trigger_type === 'schedule' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cron schedule</label>
                    <input
                      type="text"
                      value={form.trigger_config?.cron || ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          trigger_config: { ...p.trigger_config, cron: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      placeholder="0 2 * * *"
                    />
                  </div>
                )}

                {form.trigger_type === 'webhook' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Webhook path hint</label>
                    <input
                      type="text"
                      value={form.trigger_config?.path || ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          trigger_config: { ...p.trigger_config, path: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      placeholder="/hooks/deploy"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Steps</label>
                    <button
                      type="button"
                      onClick={addStep}
                      className="text-sm text-brand-700 hover:text-brand-800 flex items-center gap-1"
                    >
                      <SafeIcon icon={FiPlus} className="w-3.5 h-3.5" />
                      Add step
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex flex-col gap-0.5 pt-1">
                          <button
                            type="button"
                            onClick={() => moveStep(index, -1)}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <SafeIcon icon={FiChevronUp} className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, 1)}
                            disabled={index === form.steps.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <SafeIcon icon={FiChevronDown} className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2">
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => updateStep(index, { name: e.target.value })}
                            className="sm:col-span-3 px-2.5 py-1.5 border border-gray-300 rounded-md text-sm"
                            placeholder="Step name"
                          />
                          <select
                            value={step.type}
                            onChange={(e) => updateStep(index, { type: e.target.value })}
                            className="sm:col-span-2 px-2.5 py-1.5 border border-gray-300 rounded-md text-sm"
                          >
                            {STEP_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          disabled={form.steps.length <= 1}
                          className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30"
                          title="Remove step"
                        >
                          <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.name.trim() || saving || form.steps.length === 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <SafeIcon icon={FiSave} className="w-4 h-4" />
                  {saving ? 'Saving…' : editingWorkflow ? 'Save Changes' : 'Create Workflow'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkflowsSection;
