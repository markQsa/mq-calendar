import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTimelineCssVar, resetTimelineCssVarCache } from './cssVars';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

afterEach(() => {
  resetTimelineCssVarCache();
  document.documentElement.style.removeProperty('--timeline-row-height');
  document.documentElement.style.removeProperty('--timeline-row-header-height');
  vi.restoreAllMocks();
});

describe('readTimelineCssVar', () => {
  it('parses px values with parseInt ("48px" -> 48)', () => {
    document.documentElement.style.setProperty('--timeline-row-height', '48px');
    expect(readTimelineCssVar('--timeline-row-height', '60')).toBe(48);
  });

  it('uses the fallback when the variable is unset', () => {
    expect(readTimelineCssVar('--timeline-row-height', '60')).toBe(60);
    expect(readTimelineCssVar('--timeline-row-header-height', '40')).toBe(40);
  });

  it('calls getComputedStyle once for many reads within a frame', () => {
    document.documentElement.style.setProperty('--timeline-row-height', '48px');
    document.documentElement.style.setProperty('--timeline-row-header-height', '32px');
    const spy = vi.spyOn(window, 'getComputedStyle');

    expect(readTimelineCssVar('--timeline-row-height', '60')).toBe(48);
    expect(readTimelineCssVar('--timeline-row-height', '60')).toBe(48);
    expect(readTimelineCssVar('--timeline-row-header-height', '40')).toBe(32);
    expect(readTimelineCssVar('--timeline-row-height', '60')).toBe(48);
    expect(readTimelineCssVar('--timeline-row-header-height', '40')).toBe(32);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(document.documentElement);
  });

  it('sees a new value after the next animation frame', async () => {
    document.documentElement.style.setProperty('--timeline-row-height', '48px');
    expect(readTimelineCssVar('--timeline-row-height', '60')).toBe(48);

    document.documentElement.style.setProperty('--timeline-row-height', '80px');
    expect(readTimelineCssVar('--timeline-row-height', '60')).toBe(48);

    await nextFrame();

    expect(readTimelineCssVar('--timeline-row-height', '60')).toBe(80);
  });
});
