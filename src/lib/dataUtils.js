/**
 * Shared persistence helpers for NCB-backed data.
 * Keeps UUID ids intact, normalizes flags/arrays, and fails loudly on API errors.
 */

export function getUserId() {
  return localStorage.getItem('user_id');
}

/** Never coerce UUID / string ids with parseInt — that yields NaN and breaks FKs. */
export function asId(id, label = 'id') {
  if (id == null || id === '') {
    throw new Error(`Missing ${label}`);
  }
  const value = String(id).trim();
  if (!value || value === 'NaN' || value === 'undefined' || value === 'null') {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

/**
 * NCB instances may use either integer or string/UUID primary keys.
 * Keep numeric ids as numbers so int columns accept them.
 */
export function asDbId(id, label = 'id') {
  const value = asId(id, label);
  return /^\d+$/.test(value) ? Number(value) : value;
}

export function isTruthyFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/** Persist flags as 0/1 for NCB while accepting boolean reads. */
export function toDbFlag(value) {
  return isTruthyFlag(value) ? 1 : 0;
}

export function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function serializeArray(value) {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(Array.isArray(parsed) ? parsed : parseJsonArray(value));
    } catch {
      return JSON.stringify(parseJsonArray(value));
    }
  }
  return JSON.stringify(Array.isArray(value) ? value : []);
}

/** Use in JSON request bodies for text[] / array columns (do not double-stringify). */
export function toDbArray(value) {
  return parseJsonArray(value);
}

/** Drop null/undefined/empty-string fields that often break NCB inserts. */
export function compactPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (value === '') return false;
      return true;
    })
  );
}

export function parseJsonObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function serializeJson(value, fallback = {}) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value ?? fallback);
}

export function assertSuccess(res, fallbackMessage = 'Request failed') {
  if (!res || res.status === 'error') {
    const detail =
      res?.error ||
      res?.message ||
      res?.data?.error ||
      res?.data?.message ||
      fallbackMessage;
    const rawHint =
      res?.raw && typeof res.raw === 'object'
        ? ` | ${JSON.stringify(res.raw).slice(0, 300)}`
        : '';
    throw new Error(`${typeof detail === 'string' ? detail : fallbackMessage}${rawHint}`);
  }
  return res;
}

export function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data == null) return [];
  return [data];
}

export function unwrapOne(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/** MySQL DATETIME-compatible string (NCB rejects ISO with T/Z). */
export function toMysqlDatetime(value) {
  if (value == null || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function nowIso() {
  return toMysqlDatetime(new Date());
}

/** Date-only values (from <input type="date">) as MySQL DATE/DATETIME at midnight UTC. */
export function toMysqlDate(value) {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value} 00:00:00`;
  }
  return toMysqlDatetime(value);
}

export function shareNoteUrl(token) {
  return `${window.location.origin}/shared/note/${token}`;
}

export function generateShareToken() {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function normalizeNote(note) {
  if (!note) return note;
  return {
    ...note,
    is_pinned: toDbFlag(note.is_pinned),
    is_encrypted: toDbFlag(note.is_encrypted),
    is_shared: toDbFlag(note.is_shared),
  };
}

export function normalizeVersion(version) {
  if (!version) return version;
  return {
    ...version,
    is_current: toDbFlag(version.is_current),
  };
}

export function normalizeBackup(backup) {
  if (!backup) return backup;
  return {
    ...backup,
    is_encrypted: toDbFlag(backup.is_encrypted),
  };
}

export function normalizeWorkflow(workflow) {
  if (!workflow) return workflow;
  let steps = workflow.steps;
  if (typeof steps === 'string') {
    try {
      steps = JSON.parse(steps);
    } catch {
      steps = [];
    }
  }
  let triggerConfig = workflow.trigger_config;
  if (typeof triggerConfig === 'string') {
    try {
      triggerConfig = JSON.parse(triggerConfig);
    } catch {
      triggerConfig = {};
    }
  }
  return {
    ...workflow,
    steps: Array.isArray(steps) ? steps : [],
    trigger_config: triggerConfig && typeof triggerConfig === 'object' ? triggerConfig : {},
    is_active: toDbFlag(workflow.is_active),
    run_count: Number(workflow.run_count || 0),
    success_count: Number(workflow.success_count || 0),
  };
}

export function normalizeApp(app) {
  if (!app) return app;
  return {
    ...app,
    tech_stack: parseJsonArray(app.tech_stack),
    specifications: parseJsonObject(app.specifications, {}),
  };
}

export function normalizeTask(task) {
  if (!task) return task;
  return {
    ...task,
    tags: parseJsonArray(task.tags),
  };
}

export function normalizePlan(plan) {
  if (!plan) return plan;
  return {
    ...plan,
    features: parseJsonArray(plan.features),
  };
}
