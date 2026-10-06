import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { CalendarContent } from './CalendarContent';

function stubAnimationFrames() {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.push(cb);
    return queue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    queue[id - 1] = () => {};
  });
  return {
    flush() {
      const pending = queue.splice(0, queue.length);
      pending.forEach((cb) => cb(0));
    },
    get pending() {
      return queue.length;
    },
  };
}

function stubMutationObserver() {
  const callbacks: MutationCallback[] = [];
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(cb: MutationCallback) {
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
  );
  return {
    notify() {
      callbacks.forEach((cb) => cb([], {} as MutationObserver));
    },
  };
}

describe('CalendarContent', () => {
  beforeEach(() => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('expands to include absolutely positioned timeline content', async () => {
    const { container } = render(
      <div style={{ height: '200px' }}>
        <CalendarContent gridLines={[]}>
          <div
            data-timeline-row-content
            style={{
              position: 'absolute',
              top: '420px',
              left: 0,
              right: 0,
              height: '60px',
            }}
          />
        </CalendarContent>
      </div>
    );

    const contentInner = container.querySelector('[data-timeline-content-inner]');
    const grid = container.querySelector('[data-timeline-grid]');

    await waitFor(() => {
      expect(contentInner).toHaveStyle('min-height: 480px');
      expect(grid).toHaveStyle('height: 480px');
    });
  });

  it('measures at most once per frame when many style mutations happen', () => {
    const frames = stubAnimationFrames();
    const mo = stubMutationObserver();

    const { container } = render(
      <div style={{ height: '200px' }}>
        <CalendarContent gridLines={[]}>
          <div
            data-timeline-item
            style={{
              position: 'absolute',
              top: '100px',
              left: 0,
              height: '50px',
            }}
          />
        </CalendarContent>
      </div>
    );

    const inner = container.querySelector('[data-timeline-content-inner]') as HTMLElement;
    const item = inner.querySelector('[data-timeline-item]') as HTMLElement;
    const spy = vi.spyOn(inner, 'querySelectorAll');

    act(() => {
      frames.flush();
    });
    spy.mockClear();

    act(() => {
      for (let i = 0; i < 20; i++) {
        item.style.left = `${i}px`;
        item.style.top = `${100 + i}px`;
        mo.notify();
      }
    });

    expect(frames.pending).toBe(1);
    expect(spy).not.toHaveBeenCalled();

    act(() => {
      frames.flush();
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(frames.pending).toBe(0);
  });

  it('does not re-render when measured size is unchanged', () => {
    const frames = stubAnimationFrames();
    const mo = stubMutationObserver();

    let markerRenders = 0;
    function Marker() {
      markerRenders += 1;
      return null;
    }

    const { container } = render(
      <div style={{ height: '200px' }}>
        <CalendarContent gridLines={[]}>
          <Marker />
          <div
            data-timeline-item
            style={{
              position: 'absolute',
              top: '100px',
              left: 0,
              height: '50px',
            }}
          />
        </CalendarContent>
      </div>
    );

    const contentInner = container.querySelector('[data-timeline-content-inner]');
    expect(contentInner).toHaveStyle('min-height: 150px');

    const rendersAfterLayout = markerRenders;
    expect(rendersAfterLayout).toBeGreaterThan(0);

    act(() => {
      for (let i = 0; i < 5; i++) mo.notify();
    });
    expect(markerRenders).toBe(rendersAfterLayout);

    act(() => {
      frames.flush();
    });

    expect(markerRenders).toBe(rendersAfterLayout);
    expect(contentInner).toHaveStyle('min-height: 150px');
  });

  it('updates size when an item is added beyond the edge', async () => {
    const { container, rerender } = render(
      <div style={{ height: '200px' }}>
        <CalendarContent gridLines={[]}>
          <div
            data-timeline-item
            style={{
              position: 'absolute',
              top: '100px',
              left: 0,
              height: '50px',
            }}
          />
        </CalendarContent>
      </div>
    );

    const contentInner = container.querySelector('[data-timeline-content-inner]');
    const grid = container.querySelector('[data-timeline-grid]');

    await waitFor(() => {
      expect(contentInner).toHaveStyle('min-height: 150px');
      expect(grid).toHaveStyle('height: 150px');
    });

    rerender(
      <div style={{ height: '200px' }}>
        <CalendarContent gridLines={[]}>
          <div
            data-timeline-item
            style={{
              position: 'absolute',
              top: '100px',
              left: 0,
              height: '50px',
            }}
          />
          <div
            data-timeline-item
            style={{
              position: 'absolute',
              top: '500px',
              left: 0,
              height: '80px',
            }}
          />
        </CalendarContent>
      </div>
    );

    await waitFor(() => {
      expect(contentInner).toHaveStyle('min-height: 580px');
      expect(grid).toHaveStyle('height: 580px');
    });
  });
});

