import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicDataFetch } from '../api';
import { appMonitoring } from '../services/appMonitoring';
import {
  readPublicBundleSmart,
  buildStatusSnapshot,
  incidentsStore,
  maintenanceStore,
} from '../services/studioFeatures';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiZap, FiCheckCircle, FiAlertTriangle, FiXCircle, FiClock, FiLoader } = FiIcons;

function stateMeta(state) {
  if (state === 'up') return { label: 'Operational', icon: FiCheckCircle, className: 'text-emerald-600 bg-emerald-50' };
  if (state === 'degraded') return { label: 'Degraded', icon: FiAlertTriangle, className: 'text-amber-700 bg-amber-50' };
  if (state === 'down') return { label: 'Outage', icon: FiXCircle, className: 'text-rose-700 bg-rose-50' };
  return { label: 'Unknown', icon: FiClock, className: 'text-ink-500 bg-ink-50' };
}

const PublicStatus = () => {
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState({ status: [], incidents: [], maintenance: [] });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams(window.location.search);
        const published = await readPublicBundleSmart(params.get('t'));
        if (published?.status?.length || published?.incidents?.length) {
          setBundle(published);
          return;
        }
        // Fallback: try public apps + local monitoring (same browser as owner)
        const appsRes = await publicDataFetch('read/apps_1739884512?limit=50').catch(() => null);
        const apps = appsRes?.data ?? [];
        const monitoringByApp = {};
        apps.forEach((app) => {
          monitoringByApp[String(app.id)] = appMonitoring.get(app.id);
        });
        setBundle({
          ...buildStatusSnapshot(apps, monitoringByApp),
          incidents: incidentsStore.list(),
          maintenance: maintenanceStore.list(),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const products = bundle.status || [];
  const openIncidents = (bundle.incidents || []).filter((i) => i.status !== 'resolved');
  const upcomingMaint = (bundle.maintenance || []).filter((m) => {
    const end = m.ends_at ? new Date(m.ends_at).getTime() : Infinity;
    return end >= Date.now();
  });
  const overall =
    products.some((p) => p.state === 'down')
      ? 'down'
      : products.some((p) => p.state === 'degraded')
        ? 'degraded'
        : products.some((p) => p.state === 'up')
          ? 'up'
          : 'unknown';
  const overallMeta = stateMeta(overall);

  return (
    <div className="min-h-screen bg-[#f3f6f8] bg-app-mesh">
      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="flex items-center gap-3.5 mb-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center shadow-soft">
            <SafeIcon icon={FiZap} className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-950 tracking-tight">System status</h1>
            <p className="text-sm text-ink-500 mt-0.5">Portfolio-wide uptime, incidents & maintenance</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className={`panel p-5 mb-6 flex items-center gap-3 ${overallMeta.className}`}>
              <SafeIcon icon={overallMeta.icon} className="w-6 h-6" />
              <div>
                <p className="font-display font-semibold text-lg">{overallMeta.label}</p>
                <p className="text-sm opacity-80">
                  {products.length} product{products.length === 1 ? '' : 's'} monitored
                </p>
              </div>
            </div>

            <section className="space-y-3 mb-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">Products</h2>
              {products.length === 0 ? (
                <div className="panel p-8 text-center text-ink-500">No products published yet.</div>
              ) : (
                products.map((p) => {
                  const meta = stateMeta(p.state);
                  return (
                    <div key={p.app_id} className="panel p-4 flex items-center gap-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${meta.className}`}>
                        {meta.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-950 truncate">{p.name}</p>
                        {p.url && <p className="text-xs text-ink-400 truncate">{p.url}</p>}
                      </div>
                      {p.uptimePct != null && (
                        <span className="text-sm text-ink-600 tabular-nums">{p.uptimePct}% uptime</span>
                      )}
                    </div>
                  );
                })
              )}
            </section>

            <section className="mb-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400 mb-3">Incidents</h2>
              {openIncidents.length === 0 ? (
                <div className="panel p-5 text-sm text-ink-500">No active incidents.</div>
              ) : (
                <div className="space-y-3">
                  {openIncidents.map((i) => (
                    <article key={i.id} className="panel p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase text-rose-600">{i.severity || 'minor'}</span>
                        <span className="text-xs text-ink-400">{i.status}</span>
                      </div>
                      <h3 className="font-display font-semibold text-ink-950">{i.title}</h3>
                      <p className="text-sm text-ink-600 mt-1 whitespace-pre-wrap">{i.description}</p>
                      <p className="text-xs text-ink-400 mt-2">
                        {i.created_at ? new Date(i.created_at).toLocaleString() : ''}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400 mb-3">
                Scheduled maintenance
              </h2>
              {upcomingMaint.length === 0 ? (
                <div className="panel p-5 text-sm text-ink-500">No scheduled maintenance.</div>
              ) : (
                <div className="space-y-3">
                  {upcomingMaint.map((m) => (
                    <article key={m.id} className="panel p-5">
                      <h3 className="font-display font-semibold text-ink-950">{m.title}</h3>
                      <p className="text-sm text-ink-600 mt-1">{m.description}</p>
                      <p className="text-xs text-ink-400 mt-2">
                        {m.starts_at ? new Date(m.starts_at).toLocaleString() : '?'} →{' '}
                        {m.ends_at ? new Date(m.ends_at).toLocaleString() : '?'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <p className="text-center text-xs text-ink-400 mt-12">
          Powered by Studio · <Link to="/login" className="text-brand-700 hover:underline">Operator login</Link>
        </p>
      </div>
    </div>
  );
};

export default PublicStatus;
