/**
 * Portfolio MRR / ARR and renewal / churn alert helpers.
 */

const ACTIVE_SALE_STATUSES = new Set([
  'completed',
  'active',
  'won',
  'closed',
  'paid',
  'renewed',
]);

const AT_RISK_STATUSES = new Set([
  'at_risk',
  'at-risk',
  'churn_risk',
  'churning',
  'pending',
  'trial',
  'negotiation',
]);

const CHURNED_STATUSES = new Set(['churned', 'lost', 'cancelled', 'canceled']);

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/** Infer monthly recurring contribution from a sale amount + plan name. */
export function saleToMrr(sale) {
  const status = normalizeStatus(sale.status);
  if (CHURNED_STATUSES.has(status)) return 0;
  if (!ACTIVE_SALE_STATUSES.has(status) && status && !AT_RISK_STATUSES.has(status)) {
    // Unknown statuses still count if amount looks like recurring revenue
    if (!sale.amount) return 0;
  }

  const amount = toNumber(sale.amount);
  if (amount <= 0) return 0;

  const plan = String(sale.plan_name || sale.billing_cycle || '').toLowerCase();
  if (plan.includes('year') || plan.includes('annual') || plan.includes('arr')) {
    return amount / 12;
  }
  if (plan.includes('quarter')) return amount / 3;
  if (plan.includes('week')) return (amount * 52) / 12;
  // Default: treat as monthly
  return amount;
}

/** Rough MRR from pricing plans when no sales exist (list price as proxy). */
export function plansToMrr(plans = []) {
  if (!plans.length) return 0;
  // Use lowest paid plan as a conservative product signal, not full ARR.
  const prices = plans.map((p) => toNumber(p.price)).filter((p) => p > 0);
  if (!prices.length) return 0;
  return Math.min(...prices);
}

export function computeAppMrr(app, sales = [], plans = []) {
  const fromSales = sales.reduce((sum, sale) => sum + saleToMrr(sale), 0);
  if (fromSales > 0) return fromSales;
  // Fall back to app.revenue field if present (often annual or total — treat as monthly if small)
  const appRevenue = toNumber(app?.revenue);
  if (appRevenue > 0) {
    // Heuristic: values > 10k likely annual totals stored on the app
    return appRevenue > 10000 ? appRevenue / 12 : appRevenue;
  }
  return plansToMrr(plans);
}

export function computePortfolioMetrics(apps = [], salesByApp = {}, plansByApp = {}) {
  const perApp = apps.map((app) => {
    const sales = salesByApp[app.id] || [];
    const plans = plansByApp[app.id] || [];
    const mrr = computeAppMrr(app, sales, plans);
    return {
      appId: app.id,
      name: app.name || 'Untitled',
      status: app.status,
      users: toNumber(app.users_count),
      salesCount: sales.length,
      mrr,
      arr: mrr * 12,
    };
  });

  const mrr = perApp.reduce((sum, row) => sum + row.mrr, 0);
  return {
    mrr,
    arr: mrr * 12,
    perApp: perApp.sort((a, b) => b.mrr - a.mrr),
    activeApps: apps.filter((a) => String(a.status || '').toLowerCase() === 'active').length,
  };
}

/**
 * Build renewal / churn alerts from sales dates + statuses.
 * Assumes annual renewals when sale date exists and status is active/completed.
 */
export function buildRenewalAlerts(sales = [], appsById = {}, { withinDays = 45 } = {}) {
  const now = new Date();
  const horizon = withinDays * 86400000;
  const alerts = [];

  sales.forEach((sale) => {
    const status = normalizeStatus(sale.status);
    const app = appsById[sale.app_id];
    const customer = sale.customer_name || 'Customer';
    const amount = toNumber(sale.amount);

    if (CHURNED_STATUSES.has(status)) {
      alerts.push({
        id: `churned-${sale.id}`,
        type: 'churned',
        severity: 'high',
        title: `${customer} churned`,
        detail: `${app?.name || 'App'} · ${formatMoney(amount)} · status ${sale.status}`,
        appId: sale.app_id,
        date: sale.date || null,
      });
      return;
    }

    if (AT_RISK_STATUSES.has(status)) {
      alerts.push({
        id: `risk-${sale.id}`,
        type: 'at_risk',
        severity: 'high',
        title: `${customer} at risk`,
        detail: `${app?.name || 'App'} · ${sale.status}${amount ? ` · ${formatMoney(amount)}` : ''}`,
        appId: sale.app_id,
        date: sale.date || null,
      });
    }

    const start = parseDate(sale.date || sale.renewal_date);
    if (!start) return;

    // Next anniversary (annual renewal default)
    const renewal = new Date(start);
    renewal.setFullYear(now.getFullYear());
    if (renewal < now) renewal.setFullYear(now.getFullYear() + 1);

    const msUntil = renewal.getTime() - now.getTime();
    if (msUntil >= 0 && msUntil <= horizon && ACTIVE_SALE_STATUSES.has(status || 'completed')) {
      const days = Math.ceil(msUntil / 86400000);
      alerts.push({
        id: `renewal-${sale.id}`,
        type: 'renewal',
        severity: days <= 14 ? 'high' : 'medium',
        title: `${customer} renews in ${days}d`,
        detail: `${app?.name || 'App'} · ${formatMoney(amount)} · ${renewal.toLocaleDateString()}`,
        appId: sale.app_id,
        date: renewal.toISOString(),
      });
    }
  });

  const severityRank = { high: 0, medium: 1, low: 2 };
  return alerts.sort(
    (a, b) =>
      (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) ||
      String(a.date || '').localeCompare(String(b.date || ''))
  );
}

export function formatMoney(value, currency = 'USD') {
  const n = toNumber(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: n >= 1000 ? 0 : 2,
    }).format(n);
  } catch {
    return `$${n.toLocaleString()}`;
  }
}
