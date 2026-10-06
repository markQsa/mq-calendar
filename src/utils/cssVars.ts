/**
 * Cached reader for --timeline-* CSS custom properties on :root.
 *
 * getComputedStyle forces a style recalculation. Rows and items used to call it
 * during render, which is expensive with dozens of them (especially in Firefox).
 * Snapshot the variables once per animation frame; the next frame drops the
 * snapshot so theme switches are still picked up.
 */

const TIMELINE_CSS_VARS = [
  '--timeline-row-height',
  '--timeline-row-header-height',
] as const;

let snapshot: Map<string, string> | null = null;
let liveStyle: CSSStyleDeclaration | null = null;
let invalidateHandle: number | null = null;

function clearSnapshot(): void {
  snapshot = null;
  liveStyle = null;
  invalidateHandle = null;
}

function scheduleInvalidate(): void {
  if (invalidateHandle !== null) return;
  if (typeof requestAnimationFrame !== 'function') return;
  invalidateHandle = requestAnimationFrame(() => {
    clearSnapshot();
  });
}

function ensureSnapshot(): Map<string, string> {
  if (snapshot) return snapshot;

  const values = new Map<string, string>();
  if (typeof document !== 'undefined') {
    liveStyle = getComputedStyle(document.documentElement);
    for (const name of TIMELINE_CSS_VARS) {
      values.set(name, liveStyle.getPropertyValue(name));
    }
  }

  snapshot = values;
  scheduleInvalidate();
  return values;
}

/**
 * Read a --timeline-* CSS variable as a pixel number.
 * Parsing matches the previous `parseInt(getPropertyValue(name) || fallback)`
 * behaviour (`'48px'` → 48; unset/empty uses `fallback`).
 */
export function readTimelineCssVar(name: string, fallback: string): number {
  const values = ensureSnapshot();
  let raw = values.get(name);
  if (raw === undefined) {
    raw = liveStyle?.getPropertyValue(name) ?? '';
    values.set(name, raw);
  }
  return parseInt(raw || fallback);
}

/** Drop the per-frame snapshot immediately. Used by tests. */
export function resetTimelineCssVarCache(): void {
  if (invalidateHandle !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(invalidateHandle);
  }
  clearSnapshot();
}
