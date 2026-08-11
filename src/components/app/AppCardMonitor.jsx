import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { appMonitoring, getAppUrl } from '../../services/appMonitoring';
import {
  getUptimeConfig,
  listProviderMonitors,
  setAppMonitorMapping,
  applyRemoteMonitorToApp,
  syncUptimeFromProvider,
} from '../../services/uptimeIntegrations';
import { toastSuccess, toastError } from '../common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const {
  FiActivity,
  FiFileText,
  FiImage,
  FiRefreshCw,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiExternalLink,
  FiLink,
  FiCloud,
} = FiIcons;

function statusMeta(status) {
  switch (status) {
    case 'up':
      return { label: 'Up', className: 'badge-success', icon: FiCheckCircle };
    case 'down':
      return { label: 'Down', className: 'badge-danger', icon: FiAlertTriangle };
    default:
      return { label: 'Unknown', className: 'badge-neutral', icon: FiClock };
  }
}

const AppCardMonitor = ({ app }) => {
  const appUrl = useMemo(() => getAppUrl(app), [app]);
  const [monitor, setMonitor] = useState(() => appMonitoring.get(app.id));
  const [checking, setChecking] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showShot, setShowShot] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [remoteMonitors, setRemoteMonitors] = useState([]);
  const [loadingRemotes, setLoadingRemotes] = useState(false);
  const mapping = getUptimeConfig().mappings?.[String(app.id)];

  useEffect(() => {
    setMonitor(appMonitoring.get(app.id));
    setImgError(false);
  }, [app.id]);

  const meta = statusMeta(monitor.status);
  const shot = monitor.screenshotUrl;

  const runCheck = async () => {
    if (!appUrl) {
      toastError('Add a domain or landing page to monitor this app');
      return;
    }
    try {
      setChecking(true);
      const next = await appMonitoring.checkUptime(app.id, appUrl);
      setMonitor(next);
      toastSuccess(next.status === 'up' ? 'Site is up' : 'Site appears down');
    } catch (e) {
      toastError(e.message || 'Uptime check failed');
    } finally {
      setChecking(false);
    }
  };

  const syncProvider = async () => {
    try {
      setChecking(true);
      await syncUptimeFromProvider([app]);
      setMonitor(appMonitoring.get(app.id));
      toastSuccess('Synced from provider');
    } catch (e) {
      toastError(e.message || 'Provider sync failed — check Settings → Integrations');
    } finally {
      setChecking(false);
    }
  };

  const openLinkModal = async () => {
    setShowLink(true);
    try {
      setLoadingRemotes(true);
      const list = await listProviderMonitors();
      setRemoteMonitors(list);
    } catch (e) {
      setRemoteMonitors([]);
      toastError(e.message || 'Could not load monitors');
    } finally {
      setLoadingRemotes(false);
    }
  };

  const linkMonitor = (remote) => {
    setAppMonitorMapping(app.id, {
      provider: remote.provider,
      monitorId: remote.id,
      monitorUrl: remote.url,
      friendlyName: remote.name,
    });
    const next = applyRemoteMonitorToApp(app.id, remote);
    setMonitor(next);
    setShowLink(false);
    toastSuccess(`Linked ${remote.name}`);
  };

  const captureShot = () => {
    if (!appUrl) {
      toastError('Add a domain or landing page first');
      return;
    }
    const next = appMonitoring.refreshScreenshot(app.id, appUrl);
    setMonitor(next);
    setImgError(false);
    toastSuccess('Screenshot refreshed');
  };

  return (
    <>
      <div className="rounded-xl border border-ink-100 bg-ink-50/50 overflow-hidden mb-4">
        <div className="relative aspect-[16/9] bg-ink-100">
          {shot && !imgError ? (
            <button type="button" className="w-full h-full block" onClick={() => setShowShot(true)}>
              <img
                src={shot}
                alt={`${app.name} screenshot`}
                className="w-full h-full object-cover object-top"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            </button>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-400 gap-2 px-4">
              <SafeIcon icon={FiImage} className="w-7 h-7" />
              <p className="text-xs text-center">
                {appUrl ? 'No screenshot yet — capture one' : 'Set domain / landing page for screenshots'}
              </p>
            </div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
            <span className={`${meta.className} inline-flex items-center gap-1 bg-white/90 backdrop-blur`}>
              <SafeIcon icon={meta.icon} className="w-3 h-3" />
              {meta.label}
            </span>
            {monitor.uptimePct != null && (
              <span className="badge-neutral bg-white/90 backdrop-blur">{monitor.uptimePct}% uptime</span>
            )}
            {(monitor.source || mapping) && (
              <span className="badge-info bg-white/90 backdrop-blur inline-flex items-center gap-1">
                <SafeIcon icon={FiCloud} className="w-3 h-3" />
                {mapping?.friendlyName || monitor.source || 'provider'}
              </span>
            )}
          </div>
        </div>

        <div className="px-3 py-2.5 flex flex-wrap items-center gap-2 justify-between">
          <div className="text-[11px] text-ink-500 min-w-0">
            {monitor.lastChecked ? (
              <span>
                Checked {new Date(monitor.lastChecked).toLocaleString()}
                {monitor.latencyMs != null ? ` · ${monitor.latencyMs}ms` : ''}
              </span>
            ) : (
              <span>Not checked yet</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <button
              type="button"
              onClick={syncProvider}
              disabled={checking}
              className="btn-ghost !px-2 !py-1.5 text-xs"
              title="Sync from UptimeRobot / Better Stack"
            >
              <SafeIcon icon={FiCloud} className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              Sync
            </button>
            <button
              type="button"
              onClick={openLinkModal}
              className="btn-ghost !px-2 !py-1.5 text-xs"
              title="Link remote monitor"
            >
              <SafeIcon icon={FiLink} className="w-3.5 h-3.5" />
              Link
            </button>
            <button
              type="button"
              onClick={runCheck}
              disabled={checking}
              className="btn-ghost !px-2 !py-1.5 text-xs"
              title="Live probe"
            >
              <SafeIcon icon={FiActivity} className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              Probe
            </button>
            <button
              type="button"
              onClick={() => setShowLogs(true)}
              className="btn-ghost !px-2 !py-1.5 text-xs"
              title="View logs"
            >
              <SafeIcon icon={FiFileText} className="w-3.5 h-3.5" />
              Logs
            </button>
            <button
              type="button"
              onClick={captureShot}
              className="btn-ghost !px-2 !py-1.5 text-xs"
              title="Refresh screenshot"
            >
              <SafeIcon icon={FiRefreshCw} className="w-3.5 h-3.5" />
              Shot
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showLink && (
          <div className="fixed inset-0 z-[80] bg-ink-950/45 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="panel-solid w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-ink-950">Link monitor</h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Map a provider monitor for webhook + sync ·{' '}
                    <Link to="/settings" className="text-brand-700">
                      Settings
                    </Link>
                  </p>
                </div>
                <button type="button" onClick={() => setShowLink(false)} className="p-2 rounded-xl hover:bg-ink-50">
                  <SafeIcon icon={FiX} className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-3 space-y-2 flex-1">
                {loadingRemotes && (
                  <p className="text-sm text-ink-500 text-center py-8">Loading monitors…</p>
                )}
                {!loadingRemotes && remoteMonitors.length === 0 && (
                  <p className="text-sm text-ink-500 text-center py-8 px-4">
                    No monitors loaded. Add an API key under Settings → Integrations.
                  </p>
                )}
                {remoteMonitors.map((m) => (
                  <button
                    key={`${m.provider}-${m.id}`}
                    type="button"
                    onClick={() => linkMonitor(m)}
                    className="w-full text-left rounded-xl border border-ink-100 px-3 py-2.5 hover:bg-brand-50/50 hover:border-brand-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink-900 truncate">{m.name}</p>
                      <span className={m.status === 'up' ? 'badge-success' : m.status === 'down' ? 'badge-danger' : 'badge-neutral'}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-500 truncate mt-0.5">{m.url}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogs && (
          <div className="fixed inset-0 z-[80] bg-ink-950/45 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="panel-solid w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-ink-950">Logs · {app.name}</h3>
                  <p className="text-xs text-ink-500 mt-0.5">Uptime, provider sync, and webhook events</p>
                </div>
                <button type="button" onClick={() => setShowLogs(false)} className="p-2 rounded-xl hover:bg-ink-50">
                  <SafeIcon icon={FiX} className="w-4 h-4 text-ink-500" />
                </button>
              </div>
              <div className="overflow-y-auto p-3 space-y-2 flex-1 bg-ink-950/[0.03]">
                {(monitor.logs || []).length === 0 && (
                  <p className="text-sm text-ink-500 text-center py-10">
                    No logs yet. Sync a provider or run a probe.
                  </p>
                )}
                {(monitor.logs || []).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-ink-100 bg-white px-3 py-2 font-mono text-[11px]"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={
                          log.level === 'error'
                            ? 'text-red-600'
                            : log.level === 'warn'
                              ? 'text-amber-600'
                              : 'text-brand-700'
                        }
                      >
                        [{log.level}]
                      </span>
                      <span className="text-ink-400">{new Date(log.at).toLocaleString()}</span>
                    </div>
                    <p className="text-ink-800 break-words">{log.message}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-ink-100 flex justify-between gap-2">
                <button type="button" onClick={syncProvider} className="btn-secondary text-xs" disabled={checking}>
                  <SafeIcon icon={FiCloud} className="w-3.5 h-3.5" /> Sync provider
                </button>
                <button type="button" onClick={() => setShowLogs(false)} className="btn-primary text-xs">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShot && shot && (
          <div
            className="fixed inset-0 z-[80] bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowShot(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-3xl panel-solid overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                <h3 className="font-display font-semibold text-ink-950">Screenshot · {app.name}</h3>
                <div className="flex items-center gap-1">
                  {appUrl && (
                    <a
                      href={appUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost !px-2 !py-1.5 text-xs"
                    >
                      <SafeIcon icon={FiExternalLink} className="w-3.5 h-3.5" /> Open site
                    </a>
                  )}
                  <button type="button" onClick={() => setShowShot(false)} className="p-2 rounded-xl hover:bg-ink-50">
                    <SafeIcon icon={FiX} className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <img src={shot} alt="" className="w-full max-h-[70vh] object-contain bg-ink-100" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppCardMonitor;
