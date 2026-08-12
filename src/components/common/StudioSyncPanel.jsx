import React, { useEffect, useState } from 'react';
import {
  ensureWebhookRegistry,
  getWebhookUrls,
  getWebhookTokenLocal,
  hydrateStudioFromCloud,
  syncStudioToCloud,
} from '../../services/studioFeatures';
import { toastSuccess, toastError } from './Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiCopy, FiRefreshCw, FiCloud, FiLink } = FiIcons;

/**
 * Shows NCB sync status + real webhook URLs for support/status ingest.
 */
const StudioSyncPanel = ({ channels = ['support', 'status'] }) => {
  const [urls, setUrls] = useState(() => getWebhookUrls());
  const [busy, setBusy] = useState(false);
  const [lastMsg, setLastMsg] = useState('');

  const refreshUrls = async () => {
    try {
      setBusy(true);
      await ensureWebhookRegistry();
      setUrls(getWebhookUrls());
      setLastMsg('Webhook registry ready');
    } catch (e) {
      toastError(e.message || 'Could not create webhook registry (need at least one app)');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!getWebhookTokenLocal()) {
      refreshUrls();
    } else {
      setUrls(getWebhookUrls());
    }
  }, []);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess('Copied');
    } catch {
      toastError('Copy failed');
    }
  };

  const pull = async () => {
    try {
      setBusy(true);
      const res = await hydrateStudioFromCloud();
      setLastMsg(
        `Synced from NCB${res.drained ? ` · drained ${res.drained} webhook event(s)` : ''}`
      );
      toastSuccess('Pulled cloud studio data');
      window.dispatchEvent(new CustomEvent('studio-hydrated'));
    } catch (e) {
      toastError(e.message || 'Pull failed');
    } finally {
      setBusy(false);
    }
  };

  const push = async () => {
    try {
      setBusy(true);
      await syncStudioToCloud();
      setLastMsg('Pushed to NCB');
      toastSuccess('Saved studio data to cloud');
    } catch (e) {
      toastError(e.message || 'Push failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-5 space-y-4 border border-brand-100 bg-brand-50/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-ink-950 flex items-center gap-2">
            <SafeIcon icon={FiCloud} className="w-4 h-4 text-brand-700" />
            Cloud sync & webhooks
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            Data lives in dedicated Studio tables on NCB (not Notes). Push/Pull syncs across
            devices. Webhooks write to <code>studio_webhook_events</code>.
          </p>
          {lastMsg && <p className="text-xs text-brand-700 mt-2">{lastMsg}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={pull}>
            <SafeIcon icon={FiRefreshCw} className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            Pull
          </button>
          <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={push}>
            Push
          </button>
          <button type="button" className="btn-primary text-xs" disabled={busy} onClick={refreshUrls}>
            <SafeIcon icon={FiLink} className="w-3.5 h-3.5" />
            Ensure token
          </button>
        </div>
      </div>

      {!urls.token ? (
        <p className="text-sm text-ink-500">Create an app, then click Ensure token.</p>
      ) : (
        <div className="space-y-3">
          {channels.includes('support') && (
            <div>
              <label className="label">Support webhook URL</label>
              <div className="flex gap-2">
                <input readOnly className="input-field font-mono text-xs" value={urls.support} />
                <button type="button" className="btn-secondary" onClick={() => copy(urls.support)}>
                  <SafeIcon icon={FiCopy} className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {channels.includes('status') && (
            <div>
              <label className="label">Status / uptime webhook URL</label>
              <div className="flex gap-2">
                <input readOnly className="input-field font-mono text-xs" value={urls.status} />
                <button type="button" className="btn-secondary" onClick={() => copy(urls.status)}>
                  <SafeIcon icon={FiCopy} className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-ink-400">
            Token <code className="text-ink-600">{urls.token}</code> · POST JSON to enqueue · open
            this page (or Pull) to drain into tickets/incidents
          </p>
        </div>
      )}
    </div>
  );
};

export default StudioSyncPanel;
