import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import {
  waitlistsStore,
  waitlistSignupsStore,
  publishPublicBundle,
  buildStatusSnapshot,
  readPublicBundle,
  getPublicBundleTokenLocal,
} from '../services/studioFeatures';
import { appMonitoring } from '../services/appMonitoring';
import StudioSyncPanel from '../components/common/StudioSyncPanel';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiExternalLink, FiUserCheck } = FiIcons;

const Waitlists = () => {
  const [apps, setApps] = useState([]);
  const [lists, setLists] = useState([]);
  const [signups, setSignups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    app_id: '',
    slug: '',
    headline: '',
    subhead: '',
    cta: 'Join waitlist',
  });
  const userId = localStorage.getItem('user_id');

  const refresh = () => {
    const wl = waitlistsStore.list();
    setLists(wl);
    if (selected) {
      const pub = waitlistSignupsStore.publicList(selected);
      const priv = waitlistSignupsStore.list(selected);
      const map = new Map();
      [...priv, ...pub].forEach((s) => map.set(s.id || s.email, s));
      setSignups([...map.values()]);
    }
  };

  useEffect(() => {
    (async () => {
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      setApps(res?.data ?? []);
      refresh();
    })();
  }, []);

  useEffect(() => {
    refresh();
  }, [selected]);

  const publish = async () => {
    const monitoringByApp = {};
    apps.forEach((app) => {
      monitoringByApp[String(app.id)] = appMonitoring.get(app.id);
    });
    const prev = readPublicBundle();
    const result = await publishPublicBundle({
      ...prev,
      ...buildStatusSnapshot(apps, monitoringByApp),
      waitlists: waitlistsStore.list(),
    });
    const token = result.publicToken || getPublicBundleTokenLocal();
    toastSuccess(token ? `Launch pages published · share /status?t=${token}` : 'Launch pages published');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Waitlists & launch</h1>
          <p className="page-subtitle">Per-app landing pages, email capture, referrals, convert to users</p>
        </div>
        <button type="button" onClick={publish} className="btn-primary">
          Publish launch pages
        </button>
      </div>

      <StudioSyncPanel channels={[]} />

      <div className="panel p-5 space-y-3">
        <h2 className="font-display font-semibold">Create waitlist</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <select
            className="input-field"
            value={form.app_id}
            onChange={(e) => {
              const app = apps.find((a) => String(a.id) === e.target.value);
              setForm((p) => ({
                ...p,
                app_id: e.target.value,
                slug: p.slug || (app ? String(app.name || '').toLowerCase().replace(/\s+/g, '-') : ''),
                headline: p.headline || (app ? `Join the ${app.name} waitlist` : ''),
              }));
            }}
          >
            <option value="">Select app</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="slug (url path)"
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          />
          <input
            className="input-field md:col-span-2"
            placeholder="Headline"
            value={form.headline}
            onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
          />
          <input
            className="input-field md:col-span-2"
            placeholder="Subhead"
            value={form.subhead}
            onChange={(e) => setForm((p) => ({ ...p, subhead: e.target.value }))}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!form.slug.trim()) return;
            waitlistsStore.save(form);
            setForm({ app_id: '', slug: '', headline: '', subhead: '', cta: 'Join waitlist' });
            refresh();
            toastSuccess('Waitlist created');
          }}
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" /> Create
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {lists.map((w) => (
            <div
              key={w.id}
              className={`panel p-4 cursor-pointer ${selected === w.id ? 'ring-2 ring-brand-400' : ''}`}
              onClick={() => setSelected(w.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink-950">{w.headline || w.slug}</p>
                  <p className="text-xs text-ink-400">/launch/{w.slug}</p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/launch/${w.slug}`} target="_blank" className="p-2 text-brand-700" onClick={(e) => e.stopPropagation()}>
                    <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    className="p-2 text-ink-400 hover:text-rose-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      waitlistsStore.remove(w.id);
                      if (selected === w.id) setSelected(null);
                      refresh();
                    }}
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!lists.length && <p className="text-sm text-ink-500">No waitlists yet.</p>}
        </div>

        <div className="space-y-3">
          <h2 className="font-display font-semibold">Signups {selected ? '' : '(select a list)'}</h2>
          {signups.map((s) => (
            <div key={s.id || s.email} className="panel p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{s.email}</p>
                <p className="text-xs text-ink-400">
                  {s.name || '—'} · {s.status}
                  {s.referred_by ? ` · ref ${s.referred_by}` : ''} · code {s.referral_code}
                </p>
              </div>
              {s.status !== 'converted' && (
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    waitlistSignupsStore.convert(s.id);
                    refresh();
                    toastSuccess('Marked as first user');
                  }}
                >
                  <SafeIcon icon={FiUserCheck} className="w-3.5 h-3.5" /> Convert
                </button>
              )}
            </div>
          ))}
          {selected && !signups.length && <p className="text-sm text-ink-500">No signups yet.</p>}
        </div>
      </div>
    </motion.div>
  );
};

export default Waitlists;
