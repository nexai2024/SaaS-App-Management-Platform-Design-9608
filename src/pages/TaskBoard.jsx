import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { tasks as tasksApi } from '../services/dataLayer';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiLoader, FiCalendar, FiFilter } = FiIcons;

const COLUMNS = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'completed', label: 'Done' },
];

const TaskBoard = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [apps, setApps] = useState([]);
  const [appFilter, setAppFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const appsRes = await dataFetch(`read/apps_1739884512?owner_id=${userId}`);
      const appRows = appsRes?.data ?? [];
      setApps(appRows);
      const all = [];
      await Promise.all(
        appRows.map(async (app) => {
          try {
            const rows = await tasksApi.list(app.id);
            all.push(...rows.map((t) => ({ ...t, app_name: app.name, app_id: t.app_id || app.id })));
          } catch {
            /* skip */
          }
        })
      );
      setTasks(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const moveTask = async (task, status) => {
    try {
      await tasksApi.updateStatus(task.id, status);
      setTasks((prev) => prev.map((t) => (String(t.id) === String(task.id) ? { ...t, status } : t)));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => {
      if (appFilter !== 'all' && String(t.app_id) !== String(appFilter)) return false;
      if (dueFilter === 'overdue' && t.due_date) {
        const d = new Date(t.due_date).getTime();
        if (!(d < now && t.status !== 'completed')) return false;
      }
      if (dueFilter === 'week' && t.due_date) {
        const d = new Date(t.due_date).getTime();
        if (!(d >= now && d <= now + 7 * 86400000)) return false;
      }
      if (dueFilter === 'week' && !t.due_date) return false;
      if (dueFilter === 'overdue' && !t.due_date) return false;
      return true;
    });
  }, [tasks, appFilter, dueFilter]);

  const formatDue = (value) => {
    if (!value) return null;
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      const overdue = d.getTime() < Date.now();
      return { label: d.toLocaleDateString(), overdue };
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Task Board</h1>
          <p className="page-subtitle">Cross-app Kanban with due dates across your portfolio</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <SafeIcon icon={FiFilter} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-auto min-w-[140px]"
            >
              <option value="all">All apps</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value)}
            className="input-field py-2 text-sm w-auto"
          >
            <option value="all">All due dates</option>
            <option value="week">Due this week</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => (t.status || 'todo') === col.id);
          return (
            <div key={col.id} className="panel-muted p-3 min-h-[420px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold text-ink-800">{col.label}</h3>
                <span className="badge-neutral">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => {
                  const due = formatDue(task.due_date);
                  return (
                    <div key={task.id} className="panel-solid p-3.5">
                      <Link to={`/apps/${task.app_id}`} className="text-[10px] uppercase tracking-wide text-brand-700 font-semibold">
                        {task.app_name}
                      </Link>
                      <p className="text-sm font-medium text-ink-900 mt-1">{task.title}</p>
                      {due && (
                        <p className={`text-xs mt-2 flex items-center gap-1 ${due.overdue && task.status !== 'completed' ? 'text-red-600' : 'text-ink-400'}`}>
                          <SafeIcon icon={FiCalendar} className="w-3 h-3" />
                          {due.label}{due.overdue && task.status !== 'completed' ? ' · overdue' : ''}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {COLUMNS.filter((c) => c.id !== col.id).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => moveTask(task, c.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded-md bg-ink-50 text-ink-500 hover:bg-brand-50 hover:text-brand-800"
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default TaskBoard;
