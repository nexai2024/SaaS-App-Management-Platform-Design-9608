import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { experimentsStore } from '../services/studioFeatures';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiArchive, FiAward } = FiIcons;

const Experiments = () => {
  const [params] = useSearchParams();
  const preApp = params.get('app') || '';
  const [apps, setApps] = useState([]);
  const [rows, setRows] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({
    name: '',
    hypothesis: '',
    metric: 'conversion',
    app_id: preApp,
    variant_a: 'Control',
    variant_b: 'Variant',
    status: 'running',
    winner: '',
  });
  const userId = localStorage.getItem('user_id');

  const refresh = () => setRows(experimentsStore.list());

  useEffect(() => {
    (async () => {
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      setApps(res?.data ?? []);
      refresh();
    })();
  }, []);

  useEffect(() => {
    if (preApp) setForm((p) => ({ ...p, app_id: preApp }));
  }, [preApp]);

  const visible = rows.filter((r) => (showArchived ? r.status === 'archived' : r.status !== 'archived'));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Experiment lab</h1>
          <p className="page-subtitle">A/B & pricing tests — hypothesis, metric, winner, archive</p>
        </div>
        <div className="flex gap-2 items-center">
          {preApp && (
            <Link to={`/apps/${preApp}`} className="text-sm text-brand-700 hover:underline">
              ← Back to app marketing
            </Link>
          )}
          <button type="button" className="btn-secondary text-sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Show active' : 'Show archive'}
          </button>
        </div>
      </div>

      {!showArchived && (
        <div className="panel p-5 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input-field" placeholder="Experiment name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <select className="input-field" value={form.app_id} onChange={(e) => setForm((p) => ({ ...p, app_id: e.target.value }))}>
              <option value="">App</option>
              {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <textarea className="input-field md:col-span-2" rows={2} placeholder="Hypothesis" value={form.hypothesis} onChange={(e) => setForm((p) => ({ ...p, hypothesis: e.target.value }))} />
            <select className="input-field" value={form.metric} onChange={(e) => setForm((p) => ({ ...p, metric: e.target.value }))}>
              <option value="conversion">Conversion</option>
              <option value="signup">Signup</option>
              <option value="mrr">MRR</option>
              <option value="activation">Activation</option>
              <option value="retention">Retention</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input-field" placeholder="Variant A" value={form.variant_a} onChange={(e) => setForm((p) => ({ ...p, variant_a: e.target.value }))} />
              <input className="input-field" placeholder="Variant B" value={form.variant_b} onChange={(e) => setForm((p) => ({ ...p, variant_b: e.target.value }))} />
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!form.name.trim()) return;
              experimentsStore.save(form);
              setForm({
                name: '',
                hypothesis: '',
                metric: 'conversion',
                app_id: preApp,
                variant_a: 'Control',
                variant_b: 'Variant',
                status: 'running',
                winner: '',
              });
              refresh();
              toastSuccess('Experiment started');
            }}
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" /> Start experiment
          </button>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((e) => {
          const appName = apps.find((a) => String(a.id) === String(e.app_id))?.name;
          return (
            <div key={e.id} className="panel p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-ink-950">{e.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {appName || '—'} · metric: {e.metric} · {e.status}
                    {e.winner ? ` · winner: ${e.winner}` : ''}
                  </p>
                  <p className="text-sm text-ink-600 mt-2">{e.hypothesis}</p>
                  <p className="text-xs text-ink-500 mt-2">
                    A: {e.variant_a} · B: {e.variant_b}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {e.status === 'running' && (
                    <>
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => {
                          experimentsStore.save({ id: e.id, winner: e.variant_a, status: 'completed' });
                          refresh();
                          toastSuccess('A wins');
                        }}
                      >
                        <SafeIcon icon={FiAward} className="w-3.5 h-3.5" /> A wins
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => {
                          experimentsStore.save({ id: e.id, winner: e.variant_b, status: 'completed' });
                          refresh();
                          toastSuccess('B wins');
                        }}
                      >
                        <SafeIcon icon={FiAward} className="w-3.5 h-3.5" /> B wins
                      </button>
                    </>
                  )}
                  {e.status !== 'archived' && (
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => {
                        experimentsStore.save({ id: e.id, status: 'archived' });
                        refresh();
                      }}
                    >
                      <SafeIcon icon={FiArchive} className="w-3.5 h-3.5" /> Archive
                    </button>
                  )}
                  <button type="button" className="p-2 text-ink-400 hover:text-rose-600" onClick={() => { experimentsStore.remove(e.id); refresh(); }}>
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!visible.length && <p className="text-sm text-ink-500">No experiments here.</p>}
      </div>
    </motion.div>
  );
};

export default Experiments;
