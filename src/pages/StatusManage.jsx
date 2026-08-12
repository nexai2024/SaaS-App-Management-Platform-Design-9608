import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { appMonitoring } from '../services/appMonitoring';
import {
  incidentsStore,
  maintenanceStore,
  buildStatusSnapshot,
  publishPublicBundle,
  waitlistsStore,
  getPublicBundleTokenLocal,
} from '../services/studioFeatures';
import StudioSyncPanel from '../components/common/StudioSyncPanel';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiExternalLink, FiUploadCloud } = FiIcons;

const StatusManage = () => {
  const [apps, setApps] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [incForm, setIncForm] = useState({
    title: '',
    description: '',
    severity: 'minor',
    app_id: '',
    status: 'investigating',
  });
  const [maintForm, setMaintForm] = useState({
    title: '',
    description: '',
    app_id: '',
    starts_at: '',
    ends_at: '',
  });
  const userId = localStorage.getItem('user_id');

  const refresh = () => {
    setIncidents(incidentsStore.list());
    setMaintenance(maintenanceStore.list());
  };

  useEffect(() => {
    (async () => {
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      setApps(res?.data ?? []);
      refresh();
    })();
    const onHydrated = () => refresh();
    window.addEventListener('studio-hydrated', onHydrated);
    return () => window.removeEventListener('studio-hydrated', onHydrated);
  }, []);

  const publish = async () => {
    const monitoringByApp = {};
    apps.forEach((app) => {
      monitoringByApp[String(app.id)] = appMonitoring.get(app.id);
    });
    const snap = buildStatusSnapshot(apps, monitoringByApp);
    const result = await publishPublicBundle({
      ...snap,
      waitlists: waitlistsStore.list(),
    });
    const token = result.publicToken || getPublicBundleTokenLocal();
    toastSuccess(token ? `Published · /status?t=${token}` : 'Public /status published');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Status page</h1>
          <p className="page-subtitle">Incidents, maintenance, and public uptime across products</p>
        </div>
        <div className="flex gap-2">
          <Link to="/status" target="_blank" className="btn-secondary">
            <SafeIcon icon={FiExternalLink} className="w-4 h-4" /> View public
          </Link>
          <button type="button" onClick={publish} className="btn-primary">
            <SafeIcon icon={FiUploadCloud} className="w-4 h-4" /> Publish
          </button>
        </div>
      </div>

      <StudioSyncPanel channels={['status']} />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel p-5 space-y-3">
          <h2 className="font-display font-semibold text-ink-950">Report incident</h2>
          <input
            className="input-field"
            placeholder="Title"
            value={incForm.title}
            onChange={(e) => setIncForm((p) => ({ ...p, title: e.target.value }))}
          />
          <textarea
            className="input-field"
            rows={3}
            placeholder="What happened…"
            value={incForm.description}
            onChange={(e) => setIncForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="input-field w-auto"
              value={incForm.severity}
              onChange={(e) => setIncForm((p) => ({ ...p, severity: e.target.value }))}
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
            <select
              className="input-field w-auto"
              value={incForm.app_id}
              onChange={(e) => setIncForm((p) => ({ ...p, app_id: e.target.value }))}
            >
              <option value="">All products</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!incForm.title.trim()) return;
              incidentsStore.save(incForm);
              setIncForm({ title: '', description: '', severity: 'minor', app_id: '', status: 'investigating' });
              refresh();
              toastSuccess('Incident logged');
            }}
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" /> Add incident
          </button>
        </div>

        <div className="panel p-5 space-y-3">
          <h2 className="font-display font-semibold text-ink-950">Schedule maintenance</h2>
          <input
            className="input-field"
            placeholder="Title"
            value={maintForm.title}
            onChange={(e) => setMaintForm((p) => ({ ...p, title: e.target.value }))}
          />
          <textarea
            className="input-field"
            rows={2}
            placeholder="Notes…"
            value={maintForm.description}
            onChange={(e) => setMaintForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              className="input-field"
              value={maintForm.starts_at}
              onChange={(e) => setMaintForm((p) => ({ ...p, starts_at: e.target.value }))}
            />
            <input
              type="datetime-local"
              className="input-field"
              value={maintForm.ends_at}
              onChange={(e) => setMaintForm((p) => ({ ...p, ends_at: e.target.value }))}
            />
          </div>
          <select
            className="input-field"
            value={maintForm.app_id}
            onChange={(e) => setMaintForm((p) => ({ ...p, app_id: e.target.value }))}
          >
            <option value="">Portfolio-wide</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!maintForm.title.trim()) return;
              maintenanceStore.save(maintForm);
              setMaintForm({ title: '', description: '', app_id: '', starts_at: '', ends_at: '' });
              refresh();
              toastSuccess('Maintenance scheduled');
            }}
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" /> Schedule
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="font-display font-semibold">Incidents</h2>
          {incidents.map((i) => (
            <div key={i.id} className="panel p-4 flex gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-950">{i.title}</p>
                <p className="text-xs text-ink-400">
                  {i.severity} · {i.status}
                </p>
              </div>
              {i.status !== 'resolved' && (
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    incidentsStore.save({ id: i.id, status: 'resolved', resolved_at: new Date().toISOString() });
                    refresh();
                  }}
                >
                  Resolve
                </button>
              )}
              <button type="button" className="p-2 text-ink-400 hover:text-rose-600" onClick={() => { incidentsStore.remove(i.id); refresh(); }}>
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!incidents.length && <p className="text-sm text-ink-500">No incidents yet.</p>}
        </div>
        <div className="space-y-3">
          <h2 className="font-display font-semibold">Maintenance</h2>
          {maintenance.map((m) => (
            <div key={m.id} className="panel p-4 flex gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-950">{m.title}</p>
                <p className="text-xs text-ink-400">
                  {m.starts_at ? new Date(m.starts_at).toLocaleString() : '—'} →{' '}
                  {m.ends_at ? new Date(m.ends_at).toLocaleString() : '—'}
                </p>
              </div>
              <button type="button" className="p-2 text-ink-400 hover:text-rose-600" onClick={() => { maintenanceStore.remove(m.id); refresh(); }}>
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!maintenance.length && <p className="text-sm text-ink-500">Nothing scheduled.</p>}
        </div>
      </div>
    </motion.div>
  );
};

export default StatusManage;
