// Pending-save registry for app-trigger config panels.
//
// AppTriggerSetup no longer auto-registers webhooks on its own button click.
// Instead it publishes a save function into this registry whenever its state
// changes, and WorkflowStudio's Save/Deploy handlers flush the registry after
// the workflow itself is persisted. That way webhooks are only created when
// the user has explicitly saved or deployed the workflow.
//
// Keys are `${workflowId}:${platform}`, so each workflow has at most one
// pending save per platform (matches the one-integration-per-platform model).

const pending = new Map();

export function registerPendingTriggerSave(workflowId, platform, fn) {
  if (!workflowId || !platform || typeof fn !== 'function') return;
  pending.set(`${workflowId}:${platform}`, fn);
}

export function clearPendingTriggerSave(workflowId, platform) {
  if (!workflowId || !platform) return;
  pending.delete(`${workflowId}:${platform}`);
}

export function hasPendingTriggerSaves(workflowId) {
  if (!workflowId) return false;
  const prefix = `${workflowId}:`;
  for (const k of pending.keys()) {
    if (k.startsWith(prefix)) return true;
  }
  return false;
}

// Runs every registered save function for the given workflow, in parallel.
// Returns { ok, failed } counts. Each registered function is expected to
// surface its own toast on error — flush just aggregates.
export async function flushPendingTriggerSaves(workflowId) {
  if (!workflowId) return { ok: 0, failed: 0 };
  const prefix = `${workflowId}:`;
  const tasks = [];
  const keys = [];
  for (const [k, fn] of pending) {
    if (!k.startsWith(prefix)) continue;
    keys.push(k);
    tasks.push(Promise.resolve().then(fn));
  }
  if (tasks.length === 0) return { ok: 0, failed: 0 };
  const results = await Promise.allSettled(tasks);
  // Drop entries only for successful flushes — keep failures so the user can
  // retry by saving again.
  let ok = 0;
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      ok += 1;
      pending.delete(keys[i]);
    } else {
      failed += 1;
    }
  });
  return { ok, failed };
}
