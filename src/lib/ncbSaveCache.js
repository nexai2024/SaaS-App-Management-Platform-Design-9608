/**
 * Per-table NCB save cache.
 * After the first successful write, stores the winning strategy id plus the exact
 * column set / owner_id / create-vs-bulk mode so later saves make one request
 * instead of burning through failing variants.
 */

const STORAGE_KEY = 'ncb_save_strategy_v2';
const LEGACY_KEY = 'ncb_save_strategy_v1';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // One-time migrate strategy ids from v1 (no columns yet — probe still preferred).
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = {};
      for (const [table, entry] of Object.entries(parsed || {})) {
        if (entry?.strategyId) {
          migrated[table] = {
            strategyId: entry.strategyId,
            columns: entry.meta?.columns || [],
            useOwner: !!entry.meta?.useOwner,
            mode: entry.meta?.mode || 'create',
            updatedAt: entry.updatedAt || new Date().toISOString(),
          };
        }
      }
      writeStore(migrated);
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getCachedStrategy(table) {
  const store = readStore();
  return store[table] || null;
}

export function setCachedStrategy(table, strategyId, meta = {}) {
  const store = readStore();
  store[table] = {
    strategyId,
    columns: Array.isArray(meta.columns) ? meta.columns : [],
    useOwner: !!meta.useOwner,
    mode: meta.mode || 'create',
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function clearCachedStrategy(table) {
  const store = readStore();
  delete store[table];
  writeStore(store);
}

export function clearAllCachedStrategies() {
  writeStore({});
}

/** Debug helper — returns the full cache map. */
export function listCachedStrategies() {
  return readStore();
}

/** Human-readable labels for known NCB table keys. */
export function labelForTable(tableKey) {
  const labels = {
    pricing_plans_1739884512: 'Pricing plans',
    sales_1739884512: 'Sales',
    marketing_materials_1739884512: 'Marketing materials',
    app_tasks_1739884512: 'Tasks',
    app_notes_1739884512: 'Notes',
    workflows_1739884512: 'Workflows',
  };
  return labels[tableKey] || tableKey.replace(/_1739884512$/, '').replace(/_/g, ' ');
}

/** Keep only known-good columns from a candidate body. */
export function pickColumns(body = {}, columns = []) {
  if (!columns.length) return { ...body };
  const next = {};
  for (const key of columns) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      next[key] = body[key];
    }
  }
  return next;
}

function rememberSuccess(table, strategy, mode) {
  setCachedStrategy(table, strategy.id, {
    mode,
    useOwner: !!strategy.useOwner,
    columns: Object.keys(strategy.body || {}),
  });
}

/**
 * @typedef {Object} SaveStrategy
 * @property {string} id
 * @property {object} body
 * @property {boolean} [useOwner]
 * @property {boolean} [tryBulk]
 */

/**
 * Try the cached column set first (single request). On miss/failure, probe
 * strategies and cache the winner's columns for next time.
 */
export async function saveWithCachedStrategies({
  table,
  existingId = null,
  strategies,
  execute,
  errorMessage = 'Failed to save record',
}) {
  if (!strategies?.length) {
    throw new Error(errorMessage);
  }

  const cached = getCachedStrategy(table);
  let lastError;

  // --- Fast path: known-good columns only ---
  if (cached?.strategyId || cached?.columns?.length) {
    const match =
      strategies.find((s) => s.id === cached.strategyId) ||
      strategies.find((s) => {
        const keys = Object.keys(s.body || {});
        return (
          !!cached.useOwner === !!s.useOwner &&
          (cached.columns || []).every((col) => keys.includes(col))
        );
      }) ||
      strategies[0];

    const body = cached.columns?.length
      ? pickColumns(match.body, cached.columns)
      : match.body;

    // Require primary fields still present after column pick
    if (body && Object.keys(body).length > 0) {
      const cachedStrategy = {
        ...match,
        id: cached.strategyId || match.id,
        body,
        useOwner: cached.useOwner ?? match.useOwner,
        tryBulk: match.tryBulk,
      };

      try {
        if (existingId) {
          const result = await execute(cachedStrategy, 'update');
          rememberSuccess(table, cachedStrategy, 'update');
          return { result, strategy: cachedStrategy, fromCache: true };
        }

        const preferredMode = cached.mode === 'bulk' ? 'bulk' : 'create';
        try {
          const result = await execute(cachedStrategy, preferredMode);
          rememberSuccess(table, cachedStrategy, preferredMode);
          return { result, strategy: cachedStrategy, fromCache: true };
        } catch (primaryError) {
          lastError = primaryError;
          // If we usually use create, one bulk retry with same columns is cheap
          if (preferredMode === 'create' && cachedStrategy.tryBulk !== false) {
            const result = await execute(cachedStrategy, 'bulk');
            rememberSuccess(table, cachedStrategy, 'bulk');
            return { result, strategy: cachedStrategy, fromCache: true };
          }
          throw primaryError;
        }
      } catch (error) {
        lastError = error;
        // Cached shape went stale — clear and fall through to full probe
        clearCachedStrategy(table);
      }
    }
  }

  // --- Probe path: try all strategies, cache winner ---
  const ordered = [...strategies];
  if (cached?.strategyId) {
    const idx = ordered.findIndex((s) => s.id === cached.strategyId);
    if (idx > 0) {
      const [hit] = ordered.splice(idx, 1);
      ordered.unshift(hit);
    }
  }

  for (const strategy of ordered) {
    try {
      if (existingId) {
        const result = await execute(strategy, 'update');
        rememberSuccess(table, strategy, 'update');
        return { result, strategy, fromCache: false };
      }

      try {
        const result = await execute(strategy, 'create');
        rememberSuccess(table, strategy, 'create');
        return { result, strategy, fromCache: false };
      } catch (createError) {
        lastError = createError;
        if (strategy.tryBulk !== false) {
          const result = await execute(strategy, 'bulk');
          rememberSuccess(table, strategy, 'bulk');
          return { result, strategy, fromCache: false };
        }
        throw createError;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(errorMessage);
}
