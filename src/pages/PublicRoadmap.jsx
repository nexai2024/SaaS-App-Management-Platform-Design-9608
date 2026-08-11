import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicDataFetch, dataFetch } from '../api';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiGitBranch, FiLoader, FiZap } = FiIcons;

const PublicRoadmap = () => {
  const { appId } = useParams();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('Product changelog');

  useEffect(() => {
    load();
  }, [appId]);

  const load = async () => {
    try {
      setLoading(true);
      if (appId) {
        const appRes = await publicDataFetch(`read/apps_1739884512?id=${appId}`).catch(() => null);
        const app = appRes?.data?.[0] || appRes?.data;
        if (app?.name) setTitle(`${app.name} changelog`);
        const verRes = await publicDataFetch(
          `read/app_versions_1739884512?app_id=${appId}&sort=created_at&order=desc`
        ).catch(() => dataFetch(`read/app_versions_1739884512?app_id=${appId}`).catch(() => null));
        setEntries(verRes?.data ?? []);
      } else {
        setTitle('Portfolio changelog');
        const verRes = await publicDataFetch(
          `read/app_versions_1739884512?sort=created_at&order=desc&limit=40`
        ).catch(() => null);
        setEntries(verRes?.data ?? []);
      }
    } catch (e) {
      console.error(e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6f8] bg-app-mesh">
      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="flex items-center gap-3.5 mb-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center shadow-soft">
            <SafeIcon icon={FiZap} className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-950 tracking-tight">{title}</h1>
            <p className="text-sm text-ink-500 mt-0.5">Public roadmap & release notes</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="panel p-10 text-center text-ink-500">No public releases yet.</div>
        ) : (
          <div className="space-y-4">
            {entries.map((v) => (
              <article key={v.id} className="panel p-6">
                <div className="flex items-center gap-2 mb-2">
                  <SafeIcon icon={FiGitBranch} className="w-4 h-4 text-brand-700" />
                  <h2 className="font-display font-semibold text-ink-950">
                    {v.version_number || 'Release'}
                  </h2>
                </div>
                <p className="text-xs text-ink-400 mb-3">
                  {v.release_date || v.created_at
                    ? new Date(v.release_date || v.created_at).toLocaleDateString()
                    : ''}
                </p>
                <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-wrap">
                  {v.release_notes || v.changelog || 'No notes'}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicRoadmap;
