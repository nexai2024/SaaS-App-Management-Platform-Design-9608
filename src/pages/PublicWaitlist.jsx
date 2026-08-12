import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { publicDataFetch } from '../api';
import {
  readPublicBundle,
  readPublicBundleSmart,
  waitlistsStore,
  waitlistSignupsStore,
} from '../services/studioFeatures';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiZap, FiCheck, FiLoader, FiShare2 } = FiIcons;

const PublicWaitlist = () => {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const ref = params.get('ref') || '';
  const [loading, setLoading] = useState(true);
  const [waitlist, setWaitlist] = useState(null);
  const [app, setApp] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams(window.location.search);
        const bundle = (await readPublicBundleSmart(params.get('t'))) || readPublicBundle();
        let wl =
          (bundle.waitlists || []).find((w) => w.slug === slug || String(w.app_id) === String(slug)) ||
          waitlistsStore.getBySlug(slug);
        if (!wl) {
          // try treat slug as app id
          const appRes = await publicDataFetch(`read/apps_1739884512?id=${slug}`).catch(() => null);
          const found = appRes?.data?.[0] || appRes?.data;
          if (found) {
            setApp(found);
            wl = {
              id: `app_${found.id}`,
              app_id: found.id,
              slug: String(found.id),
              headline: `Join the ${found.name} waitlist`,
              subhead: found.description || 'Be first to know when we launch.',
              cta: 'Join waitlist',
            };
          }
        } else if (wl.app_id) {
          const appRes = await publicDataFetch(`read/apps_1739884512?id=${wl.app_id}`).catch(() => null);
          setApp(appRes?.data?.[0] || appRes?.data || null);
        }
        setWaitlist(wl || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const shareUrl = useMemo(() => {
    if (!done?.referral_code) return '';
    const base = `${window.location.origin}/launch/${waitlist?.slug || slug}`;
    return `${base}?ref=${done.referral_code}`;
  }, [done, waitlist, slug]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    const wlId = waitlist?.id || `app_${slug}`;
    const row = waitlistSignupsStore.publicAdd(wlId, {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      referred_by: ref || null,
      app_id: waitlist?.app_id || slug,
    });
    setDone(row);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6f8] bg-app-mesh">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!waitlist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6f8] bg-app-mesh px-4">
        <div className="panel p-8 max-w-md text-center">
          <p className="font-display text-lg font-semibold text-ink-950">Waitlist not found</p>
          <p className="text-sm text-ink-500 mt-2">Ask the founder for the correct launch link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6f8] bg-app-mesh">
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center shadow-soft">
            <SafeIcon icon={FiZap} className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              {app?.name || 'Launch'}
            </p>
            <h1 className="font-display text-2xl font-semibold text-ink-950 tracking-tight">
              {waitlist.headline || 'Join the waitlist'}
            </h1>
          </div>
        </div>

        <p className="text-ink-600 mb-8 leading-relaxed">
          {waitlist.subhead || app?.description || 'Get early access and launch updates.'}
        </p>

        {done ? (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <SafeIcon icon={FiCheck} className="w-5 h-5" />
              <p className="font-semibold">You&apos;re on the list</p>
            </div>
            <p className="text-sm text-ink-600">
              Share your referral link to move up the queue.
            </p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="input-field flex-1 text-sm" />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
              >
                <SafeIcon icon={FiShare2} className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-400">Your code: {done.referral_code}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
            {ref && (
              <p className="text-xs text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
                Referred by {ref}
              </p>
            )}
            <div>
              <label className="label">Name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="submit" className="btn-primary w-full justify-center">
              {waitlist.cta || 'Join waitlist'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-ink-400 mt-10">
          <Link to="/status" className="hover:text-brand-700">
            Status
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PublicWaitlist;
