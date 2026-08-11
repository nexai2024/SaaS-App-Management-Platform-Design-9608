import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { versions as versionsApi } from '../services/dataLayer';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiLoader, FiExternalLink, FiCopy, FiGitBranch } = FiIcons;

const Roadmap = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [apps, setApps] = useState([]);
  const [appFilter, setAppFilter] = useState('all');
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
            const rows = await versionsApi.list(app.id);
            all.push(
              ...rows.map((v) => ({
                ...v,
                app_name: app.name,
                app_id: v.app_id || app.id,
              }))
            );
          } catch {
            /* skip */
          }
        })
      );
      all.sort((a, b) => new Date(b.release_date || b.created_at || 0) - new Date(a.release_date || a.created_at || 0));
      setEntries(all);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () => (appFilter === 'all' ? entries : entries.filter((e) => String(e.app_id) === String(appFilter))),
    [entries, appFilter]
  );

  const publicUrl =
    appFilter === 'all'
      ? `${window.location.origin}/public/roadmap`
      : `${window.location.origin}/public/roadmap/${appFilter}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toastSuccess('Public roadmap link copied');
    } catch {
      toastSuccess(publicUrl);
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
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Roadmap & Changelog</h1>
          <p className="page-subtitle">Versions across apps — share updates with users and investors</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All apps</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={copyLink}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <SafeIcon icon={FiCopy} className="w-4 h-4" /> Copy public link
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <SafeIcon icon={FiExternalLink} className="w-4 h-4" /> Open public
          </a>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="panel p-8 text-center text-gray-500">
            No versions yet. Add releases in each app’s Versions tab.
          </div>
        )}
        {filtered.map((v) => (
          <div key={`${v.app_id}-${v.id}`} className="panel p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <SafeIcon icon={FiGitBranch} className="w-4 h-4 text-brand-700" />
              <span className="font-semibold text-gray-900">{v.version_number || v.name || 'Release'}</span>
              <Link to={`/apps/${v.app_id}`} className="text-xs text-brand-700 hover:underline">{v.app_name}</Link>
              {v.status && (
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">{v.status}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {v.release_date || v.created_at
                ? new Date(v.release_date || v.created_at).toLocaleDateString()
                : 'No date'}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {v.changelog || v.description || 'No changelog notes'}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Roadmap;
