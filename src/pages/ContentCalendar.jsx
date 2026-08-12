import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { contentStore } from '../services/studioFeatures';
import { versions as versionsApi } from '../services/dataLayer';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiCheck } = FiIcons;

const CHANNELS = ['tweet', 'blog', 'changelog', 'linkedin', 'newsletter'];

const ContentCalendar = () => {
  const [apps, setApps] = useState([]);
  const [posts, setPosts] = useState([]);
  const [versions, setVersions] = useState([]);
  const [form, setForm] = useState({
    title: '',
    channel: 'tweet',
    app_id: '',
    scheduled_at: '',
    body: '',
    status: 'planned',
    version_id: '',
  });
  const userId = localStorage.getItem('user_id');

  const refresh = () => setPosts(contentStore.list());

  useEffect(() => {
    (async () => {
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      const appRows = res?.data ?? [];
      setApps(appRows);
      const allVersions = [];
      await Promise.all(
        appRows.slice(0, 12).map(async (app) => {
          try {
            const list = await versionsApi.list(app.id);
            list.forEach((v) => allVersions.push({ ...v, app_name: app.name, app_id: app.id }));
          } catch {
            /* ignore */
          }
        })
      );
      setVersions(allVersions.slice(0, 40));
      refresh();
    })();
  }, []);

  const sorted = [...posts].sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Content calendar</h1>
        <p className="page-subtitle">Plan tweets, blogs, and changelogs — link “shipped” to versions</p>
      </div>

      <div className="panel p-5 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <select className="input-field" value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-field" value={form.app_id} onChange={(e) => setForm((p) => ({ ...p, app_id: e.target.value }))}>
            <option value="">App</option>
            {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="datetime-local" className="input-field" value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} />
          <select
            className="input-field md:col-span-2"
            value={form.version_id}
            onChange={(e) => {
              const v = versions.find((x) => String(x.id) === e.target.value);
              setForm((p) => ({
                ...p,
                version_id: e.target.value,
                app_id: v?.app_id || p.app_id,
                title: p.title || (v ? `Shipped ${v.version_number || v.app_name}` : p.title),
                body: p.body || v?.release_notes || v?.changelog || '',
                channel: p.channel === 'tweet' ? 'changelog' : p.channel,
              }));
            }}
          >
            <option value="">Link version (optional)</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.app_name} · {v.version_number || v.id}
              </option>
            ))}
          </select>
          <textarea className="input-field md:col-span-2" rows={3} placeholder="Draft…" value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!form.title.trim()) return;
            contentStore.save(form);
            setForm({ title: '', channel: 'tweet', app_id: '', scheduled_at: '', body: '', status: 'planned', version_id: '' });
            refresh();
            toastSuccess('Scheduled');
          }}
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" /> Add to calendar
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((p) => {
          const appName = apps.find((a) => String(a.id) === String(p.app_id))?.name;
          const ver = versions.find((v) => String(v.id) === String(p.version_id));
          return (
            <div key={p.id} className="panel p-4 flex gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                    {p.channel}
                  </span>
                  <span className="text-xs text-ink-400">{p.status}</span>
                  {ver && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      shipped {ver.version_number}
                    </span>
                  )}
                </div>
                <p className="font-medium text-ink-950 mt-1">{p.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">
                  {appName || '—'} · {p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : 'unscheduled'}
                </p>
                {p.body && <p className="text-sm text-ink-600 mt-2 line-clamp-2">{p.body}</p>}
              </div>
              <div className="flex flex-col gap-1">
                {p.status !== 'published' && (
                  <button
                    type="button"
                    className="p-2 text-emerald-600"
                    title="Mark published"
                    onClick={() => {
                      contentStore.save({ id: p.id, status: 'published', published_at: new Date().toISOString() });
                      refresh();
                    }}
                  >
                    <SafeIcon icon={FiCheck} className="w-4 h-4" />
                  </button>
                )}
                <button type="button" className="p-2 text-ink-400 hover:text-rose-600" onClick={() => { contentStore.remove(p.id); refresh(); }}>
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        {!sorted.length && <p className="text-sm text-ink-500">Calendar is empty.</p>}
      </div>
    </motion.div>
  );
};

export default ContentCalendar;
