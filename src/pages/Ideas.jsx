import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ideasStore } from '../services/portfolioStore';
import { createApp } from '../services/appService';
import { tasks as tasksApi, notes as notesApi } from '../services/dataLayer';
import { toastSuccess, toastError } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiArrowUpRight, FiStar } = FiIcons;

const Ideas = () => {
  const [ideas, setIdeas] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', score: 5 });
  const [promoting, setPromoting] = useState(null);
  const navigate = useNavigate();

  const refresh = () => setIdeas(ideasStore.list());

  useEffect(() => {
    refresh();
  }, []);

  const handleAdd = () => {
    if (!form.title.trim()) return;
    ideasStore.save(form);
    setForm({ title: '', description: '', score: 5 });
    refresh();
    toastSuccess('Idea captured');
  };

  const handlePromote = async (idea) => {
    try {
      setPromoting(idea.id);
      const { data, error } = await createApp({
        name: idea.title,
        description: idea.description || 'Promoted from ideas pipeline',
        status: 'Development',
        tech_stack: ['React'],
        users_count: 0,
        revenue: 0,
        growth_rate: 0,
      });
      if (error || !data?.id) throw new Error(error || 'Failed to create app');
      await Promise.all([
        tasksApi.save(data.id, {
          title: 'Define MVP scope',
          description: idea.description || '',
          status: 'todo',
          priority: 'high',
          task_type: 'manual',
        }),
        tasksApi.save(data.id, {
          title: 'Validate positioning',
          description: 'Draft ICP and differentiation',
          status: 'todo',
          priority: 'medium',
          task_type: 'manual',
        }),
        notesApi.save(data.id, {
          title: 'Origin idea',
          content: `# ${idea.title}\n\nScore: ${idea.score}/10\n\n${idea.description || ''}`,
          note_type: 'general',
          tags: 'idea,pipeline',
        }),
      ]);
      ideasStore.markPromoted(idea.id, data.id);
      refresh();
      toastSuccess('Promoted to app with starter tasks & note');
      navigate(`/apps/${data.id}`);
    } catch (e) {
      console.error(e);
      toastError(e.message || 'Promote failed');
    } finally {
      setPromoting(null);
    }
  };

  const sorted = [...ideas].sort((a, b) => Number(b.score) - Number(a.score));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Idea Pipeline</h1>
        <p className="page-subtitle">Capture ideas, score them, promote winners into apps with starter work</p>
      </div>

      <div className="panel p-5 space-y-3">
        <input
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="Idea title"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={3}
          placeholder="Why this matters, who it's for..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Score
            <input
              type="range"
              min={1}
              max={10}
              value={form.score}
              onChange={(e) => setForm((p) => ({ ...p, score: Number(e.target.value) }))}
            />
            <span className="font-semibold text-gray-900 w-6">{form.score}</span>
          </label>
          <button
            type="button"
            onClick={handleAdd}
            className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" /> Add idea
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((idea) => (
          <div key={idea.id} className="panel p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{idea.title}</h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                <SafeIcon icon={FiStar} className="w-3 h-3" /> {idea.score}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2 line-clamp-3">{idea.description || 'No description'}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-3">{idea.status}</p>
            <div className="mt-3 flex items-center gap-2">
              {idea.status !== 'promoted' ? (
                <button
                  type="button"
                  disabled={promoting === idea.id}
                  onClick={() => handlePromote(idea)}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <SafeIcon icon={FiArrowUpRight} className="w-3.5 h-3.5" />
                  {promoting === idea.id ? 'Promoting…' : 'Promote to app'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/apps/${idea.promoted_app_id}`)}
                  className="text-sm text-brand-700 hover:underline"
                >
                  Open app →
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  ideasStore.remove(idea.id);
                  refresh();
                }}
                className="p-1.5 text-gray-400 hover:text-red-600"
              >
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Ideas;
