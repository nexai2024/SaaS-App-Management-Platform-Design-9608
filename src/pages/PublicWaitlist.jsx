import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchPublicWaitlist,
  fetchPublicApp,
  fetchSignupCount,
  submitPublicSignup,
  launchUrl,
} from '../services/waitlistService';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiZap, FiCheck, FiLoader, FiShare2, FiUsers, FiCopy, FiArrowUp } = FiIcons;

const PublicWaitlist = () => {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const ref = (params.get('ref') || '').toUpperCase();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [waitlist, setWaitlist] = useState(null);
  const [app, setApp] = useState(null);
  const [count, setCount] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const wl = await fetchPublicWaitlist(slug);
        setWaitlist(wl);
        if (wl?.app_id) {
          const appRow = wl._app || (await fetchPublicApp(wl.app_id));
          setApp(appRow);
        }
        if (wl?.id && wl.show_count !== false) {
          const n = await fetchSignupCount(wl.id);
          setCount(n);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const shareUrl = useMemo(() => {
    if (!result?.signup?.referral_code) return '';
    return launchUrl(waitlist?.slug || slug, { ref: result.signup.referral_code });
  }, [result, waitlist, slug]);

  const closed =
    waitlist &&
    (waitlist.status === 'closed' || waitlist.status === 'draft' || waitlist.status === 'paused');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await submitPublicSignup({
        waitlist,
        email,
        name,
        referred_by: ref || null,
      });
      setResult(res);
      if (typeof count === 'number' && !res.duplicate) setCount(count + 1);
    } catch (err) {
      setError(err.message || 'Could not join waitlist');
    } finally {
      setSubmitting(false);
    }
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1222]">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (!waitlist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1222] px-4">
        <div className="max-w-md text-center text-white/80">
          <p className="font-display text-2xl font-semibold text-white">Launch page not found</p>
          <p className="text-sm mt-2 text-white/50">
            This waitlist link is invalid or hasn&apos;t been published yet.
          </p>
        </div>
      </div>
    );
  }

  const product = app?.name || waitlist.headline?.split(' ')?.[0] || 'Product';

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0c1222] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(20,184,166,0.35), transparent 55%),
            radial-gradient(ellipse 60% 40% at 90% 10%, rgba(56,189,248,0.2), transparent 50%),
            radial-gradient(ellipse 50% 60% at 70% 100%, rgba(15,118,110,0.25), transparent 55%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative max-w-xl mx-auto px-5 pt-16 pb-20 min-h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-center gap-3 mb-14"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <SafeIcon icon={FiZap} className="w-5 h-5 text-[#0c1222]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300/80">
              {product}
            </p>
            <p className="text-sm text-white/40">Early access</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="mb-10"
        >
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08] text-white">
            {waitlist.headline || 'Join the waitlist'}
          </h1>
          <p className="mt-5 text-lg text-white/55 leading-relaxed max-w-md">
            {waitlist.subhead || app?.description || 'Be first when we launch.'}
          </p>
          {waitlist.show_count !== false && typeof count === 'number' && count > 0 && (
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-teal-200/90 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">
              <SafeIcon icon={FiUsers} className="w-3.5 h-3.5" />
              {count.toLocaleString()} already on the list
            </p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-7 space-y-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-400/20 flex items-center justify-center shrink-0">
                  <SafeIcon icon={FiCheck} className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <p className="font-display font-semibold text-xl text-white">
                    {result.duplicate ? 'Welcome back' : "You're in"}
                  </p>
                  <p className="text-sm text-white/50 mt-1 leading-relaxed">
                    {waitlist.success_message}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/25 border border-white/8 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Queue spot</p>
                  <p className="font-display text-3xl font-semibold text-teal-300 mt-1 tabular-nums">
                    #{result.position || '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/25 border border-white/8 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Referrals</p>
                  <p className="font-display text-3xl font-semibold text-white mt-1 tabular-nums">
                    {result.referrals || 0}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-white/60 mb-2 flex items-center gap-1.5">
                  <SafeIcon icon={FiArrowUp} className="w-3.5 h-3.5 text-teal-300" />
                  Share to climb the queue
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-xs text-white/80 font-mono"
                  />
                  <button
                    type="button"
                    onClick={copyShare}
                    className="rounded-xl bg-teal-400 text-[#0c1222] px-4 font-semibold text-sm hover:bg-teal-300 transition-colors inline-flex items-center gap-1.5"
                  >
                    <SafeIcon icon={copied ? FiCheck : FiCopy} className="w-4 h-4" />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-white/35 mt-2">
                  Code <span className="text-white/60 font-mono">{result.signup.referral_code}</span>
                </p>
              </div>
            </motion.div>
          ) : closed ? (
            <motion.div
              key="closed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-7 text-center"
            >
              <p className="font-display text-xl font-semibold">
                {waitlist.status === 'paused' ? 'Temporarily paused' : 'Waitlist closed'}
              </p>
              <p className="text-sm text-white/50 mt-2">
                Check back soon — or follow the product for launch updates.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-7 space-y-4"
            >
              {ref && (
                <p className="text-xs text-teal-200 bg-teal-400/10 border border-teal-400/20 rounded-xl px-3 py-2">
                  Invited with code <span className="font-mono font-semibold">{ref}</span>
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Name</label>
                <input
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3.5 py-3 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3.5 py-3 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
              {error && <p className="text-sm text-rose-300">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-teal-400 text-[#0c1222] font-semibold py-3.5 hover:bg-teal-300 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
                ) : null}
                {waitlist.cta || 'Join waitlist'}
              </button>
              <p className="text-[11px] text-center text-white/30">
                No spam. Launch updates only.
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-auto pt-12 text-center text-xs text-white/25">
          <Link to="/status" className="hover:text-teal-300/80 transition-colors">
            System status
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PublicWaitlist;
