import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { sales as salesApi, tasks as tasksApi } from '../services/dataLayer';
import { ticketsStore } from '../services/studioFeatures';
import { appMonitoring } from '../services/appMonitoring';
import { scoreAppHealth, rankHealth } from '../lib/healthScores';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiLoader, FiAlertTriangle, FiHeart } = FiIcons;

function bandClass(band) {
  if (band === 'critical') return 'bg-rose-50 text-rose-700';
  if (band === 'at_risk') return 'bg-amber-50 text-amber-800';
  if (band === 'watch') return 'bg-sky-50 text-sky-800';
  return 'bg-emerald-50 text-emerald-700';
}

const CustomerHealth = () => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState([]);
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
        const apps = res?.data ?? [];
        const tickets = ticketsStore.list();
        const results = await Promise.all(
          apps.map(async (app) => {
            let sales = [];
            let tasks = [];
            try {
              sales = await salesApi.list(app.id);
            } catch {
              sales = [];
            }
            try {
              tasks = await tasksApi.list(app.id);
            } catch {
              tasks = [];
            }
            const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'done').length;
            return scoreAppHealth({
              app,
              sales,
              tickets: tickets.filter((t) => String(t.app_id) === String(app.id)),
              monitor: appMonitoring.get(app.id),
              openTasks,
            });
          })
        );
        setScores(rankHealth(results));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const atRisk = scores.filter((s) => s.band === 'at_risk' || s.band === 'critical');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Customer health</h1>
        <p className="page-subtitle">Per-app scores from usage, support load, payments, and uptime</p>
      </div>

      {atRisk.length > 0 && (
        <div className="panel p-5 border border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-3">
            <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-amber-700" />
            <h2 className="font-display font-semibold text-amber-950">At-risk list</h2>
          </div>
          <ul className="space-y-2">
            {atRisk.map((h) => (
              <li key={h.appId} className="flex items-center gap-3 text-sm">
                <span className="font-semibold tabular-nums w-10">{h.score}</span>
                <Link to={`/apps/${h.appId}`} className="font-medium text-ink-950 hover:text-brand-700">
                  {h.name}
                </Link>
                <span className="text-ink-500 truncate">{(h.reasons || []).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {scores.map((h) => (
          <Link key={h.appId} to={`/apps/${h.appId}`} className="panel p-5 hover:shadow-soft transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display font-semibold text-ink-950">{h.name}</p>
                <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-md ${bandClass(h.band)}`}>
                  {h.band.replace('_', ' ')}
                </span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-display font-semibold tabular-nums text-ink-950">{h.score}</p>
                <SafeIcon icon={FiHeart} className="w-4 h-4 text-ink-300 ml-auto mt-1" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1 text-[10px] text-ink-400 uppercase tracking-wide">
              {Object.entries(h.breakdown || {}).map(([k, v]) => (
                <div key={k} className="text-center">
                  <p className="text-ink-700 font-semibold tabular-nums text-sm">{v}</p>
                  {k.slice(0, 3)}
                </div>
              ))}
            </div>
            {h.reasons?.length > 0 && (
              <p className="text-xs text-ink-500 mt-3 line-clamp-2">{h.reasons.join(' · ')}</p>
            )}
          </Link>
        ))}
      </div>
      {!scores.length && <p className="text-sm text-ink-500">Add apps to see health scores.</p>}
    </motion.div>
  );
};

export default CustomerHealth;
