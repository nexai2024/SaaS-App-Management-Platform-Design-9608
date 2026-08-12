/**
 * Customer / product health scores from usage proxies, support, and payment signals.
 */

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

/**
 * @param {object} input
 * @param {object} input.app
 * @param {object[]} [input.sales]
 * @param {object[]} [input.tickets]
 * @param {object} [input.monitor]
 * @param {number} [input.openTasks]
 */
export function scoreAppHealth({
  app,
  sales = [],
  tickets = [],
  monitor = {},
  openTasks = 0,
} = {}) {
  const reasons = [];

  // Usage proxy: users_count + growth_rate
  const users = Number(app?.users_count) || 0;
  const growth = Number(app?.growth_rate) || 0;
  let usage = 40;
  if (users >= 1000) usage = 90;
  else if (users >= 100) usage = 75;
  else if (users >= 20) usage = 60;
  else if (users >= 1) usage = 50;
  else usage = 25;
  if (growth > 10) usage = clamp(usage + 10);
  else if (growth < -5) {
    usage = clamp(usage - 15);
    reasons.push('Negative growth');
  }

  // Payment: active vs churned / at-risk sales
  const statuses = sales.map((s) => String(s.status || '').toLowerCase());
  const active = statuses.filter((s) =>
    ['completed', 'active', 'won', 'paid', 'renewed'].includes(s)
  ).length;
  const atRisk = statuses.filter((s) =>
    s.includes('risk') || s.includes('trial') || s === 'pending'
  ).length;
  const churned = statuses.filter((s) =>
    ['churned', 'lost', 'cancelled', 'canceled'].includes(s)
  ).length;
  let payment = 70;
  if (active + atRisk + churned === 0) {
    payment = Number(app?.revenue) > 0 ? 65 : 45;
  } else {
    const total = active + atRisk + churned;
    payment = clamp(Math.round((active / total) * 100 - atRisk * 5 - churned * 12));
    if (churned > active) reasons.push('Churn exceeds active');
    if (atRisk > 0) reasons.push(`${atRisk} at-risk deals`);
  }

  // Support load
  const openTickets = tickets.filter((t) => !['resolved', 'closed'].includes(String(t.status || '').toLowerCase()));
  const urgent = openTickets.filter((t) => ['urgent', 'high'].includes(String(t.priority || '').toLowerCase()));
  let support = 85;
  if (openTickets.length >= 10) support = 40;
  else if (openTickets.length >= 5) support = 55;
  else if (openTickets.length >= 2) support = 70;
  else if (openTickets.length === 1) support = 80;
  if (urgent.length) {
    support = clamp(support - urgent.length * 10);
    reasons.push(`${urgent.length} urgent tickets`);
  }

  // Uptime / reliability
  let reliability = 70;
  const st = String(monitor.status || 'unknown');
  if (st === 'up') reliability = 95;
  else if (st === 'degraded') {
    reliability = 55;
    reasons.push('Degraded uptime');
  } else if (st === 'down') {
    reliability = 20;
    reasons.push('App down');
  }
  if (monitor.uptimePct != null) {
    reliability = clamp(Math.round(Number(monitor.uptimePct)));
  }

  // Task backlog pressure
  let ops = 80;
  if (openTasks >= 15) ops = 45;
  else if (openTasks >= 8) ops = 60;
  else if (openTasks >= 4) ops = 70;

  const score = Math.round(usage * 0.25 + payment * 0.3 + support * 0.25 + reliability * 0.15 + ops * 0.05);

  let band = 'healthy';
  if (score < 45) band = 'critical';
  else if (score < 60) band = 'at_risk';
  else if (score < 75) band = 'watch';

  if (band === 'at_risk' || band === 'critical') {
    if (!reasons.length) reasons.push('Composite score below healthy threshold');
  }

  return {
    appId: app?.id,
    name: app?.name,
    score: clamp(score),
    band,
    breakdown: { usage, payment, support, reliability, ops },
    reasons,
    openTickets: openTickets.length,
    users,
  };
}

export function rankHealth(rows) {
  return [...rows].sort((a, b) => a.score - b.score);
}
