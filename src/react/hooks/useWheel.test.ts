import { createElement, useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useWheel, type UseWheelOptions } from './useWheel';

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 600;
const LINE_HEIGHT_PX = 16;

type RafCallback = FrameRequestCallback;

let nextRafId = 1;
const rafCallbacks = new Map<number, RafCallback>();

function flushRaf() {
  const callbacks = [...rafCallbacks.values()];
  rafCallbacks.clear();
  callbacks.forEach((cb) => cb(0));
}

function dispatchWheel(target: EventTarget, init: WheelEventInit): WheelEvent {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    deltaX: 0,
    deltaY: 0,
    deltaMode: 0,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function WheelHarness({ options }: { options: UseWheelOptions }) {
  const ref = useRef<HTMLDivElement>(null);
  useWheel(ref, options);
  return createElement(
    'div',
    { ref, 'data-testid': 'wheel-root' },
    createElement('div', { 'data-timeline-header': '', 'data-testid': 'header' }, 'header'),
    createElement('div', { 'data-testid': 'content' }, 'content')
  );
}

function renderWheel(options: UseWheelOptions) {
  const utils = render(createElement(WheelHarness, { options }));
  const root = utils.getByTestId('wheel-root');
  Object.defineProperty(root, 'clientWidth', { configurable: true, value: PAGE_WIDTH });
  Object.defineProperty(root, 'clientHeight', { configurable: true, value: PAGE_HEIGHT });
  return { ...utils, root };
}

describe('useWheel', () => {
  beforeEach(() => {
    nextRafId = 1;
    rafCallbacks.clear();
    vi.stubGlobal('requestAnimationFrame', (cb: RafCallback) => {
      const id = nextRafId++;
      rafCallbacks.set(id, cb);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes pixel deltas through when deltaMode is 0', () => {
    const onWheel = vi.fn();
    const { root } = renderWheel({ onWheel });

    act(() => {
      dispatchWheel(root, { deltaX: 40, deltaY: 5, deltaMode: 0 });
      flushRaf();
    });

    expect(onWheel).toHaveBeenCalledTimes(1);
    expect(onWheel).toHaveBeenCalledWith(40, 0, expect.any(WheelEvent));
  });

  it('converts line deltas (deltaMode 1) to pixels', () => {
    const onWheel = vi.fn();
    const { root } = renderWheel({ onWheel });

    act(() => {
      dispatchWheel(root, { deltaX: 3, deltaY: 0, deltaMode: 1 });
      flushRaf();
    });

    expect(onWheel).toHaveBeenCalledTimes(1);
    expect(onWheel).toHaveBeenCalledWith(3 * LINE_HEIGHT_PX, 0, expect.any(WheelEvent));
  });

  it('converts page deltas (deltaMode 2) to pixels using element size', () => {
    const onWheel = vi.fn();
    const { root } = renderWheel({ onWheel });

    act(() => {
      dispatchWheel(root, { deltaX: 1, deltaY: 0, deltaMode: 2 });
      flushRaf();
    });

    expect(onWheel).toHaveBeenCalledTimes(1);
    expect(onWheel).toHaveBeenCalledWith(PAGE_WIDTH, 0, expect.any(WheelEvent));
  });

  it('converts vertical line deltas to pixels when Shift is pressed', () => {
    const onWheel = vi.fn();
    const { root } = renderWheel({ onWheel });

    act(() => {
      dispatchWheel(root, { deltaX: 0, deltaY: 3, deltaMode: 1, shiftKey: true });
      flushRaf();
    });

    expect(onWheel).toHaveBeenCalledWith(3 * LINE_HEIGHT_PX, 0, expect.any(WheelEvent));
  });

  it('converts vertical page deltas to pixels using clientHeight when Shift is pressed', () => {
    const onWheel = vi.fn();
    const { root } = renderWheel({ onWheel });

    act(() => {
      dispatchWheel(root, { deltaX: 0, deltaY: 1, deltaMode: 2, shiftKey: true });
      flushRaf();
    });

    expect(onWheel).toHaveBeenCalledWith(PAGE_HEIGHT, 0, expect.any(WheelEvent));
  });

  it('zooms with ctrl+wheel using only the sign of deltaY', () => {
    const onWheel = vi.fn();
    const onZoom = vi.fn();
    const { root } = renderWheel({ onWheel, onZoom });

    act(() => {
      dispatchWheel(root, { deltaY: 120, ctrlKey: true });
      flushRaf();
    });

    expect(onZoom).toHaveBeenCalledTimes(1);
    expect(onZoom.mock.calls[0][0]).toBe(0.9);
    expect(onWheel).not.toHaveBeenCalled();

    onZoom.mockClear();

    act(() => {
      dispatchWheel(root, { deltaY: -120, ctrlKey: true });
      flushRaf();
    });

    expect(onZoom.mock.calls[0][0]).toBe(1.1);
  });

  it('zooms with meta+wheel the same way as ctrl', () => {
    const onZoom = vi.fn();
    const { root } = renderWheel({ onWheel: vi.fn(), onZoom });

    act(() => {
      dispatchWheel(root, { deltaY: 40, metaKey: true });
      flushRaf();
    });

    expect(onZoom).toHaveBeenCalledTimes(1);
    expect(onZoom.mock.calls[0][0]).toBe(0.9);
  });

  it('keeps zoom factors unchanged when Firefox reports line deltas', () => {
    const onZoom = vi.fn();
    const { root } = renderWheel({ onWheel: vi.fn(), onZoom });

    act(() => {
      dispatchWheel(root, { deltaY: 3, deltaMode: 1, ctrlKey: true });
      flushRaf();
    });

    expect(onZoom.mock.calls[0][0]).toBe(0.9);

    onZoom.mockClear();

    act(() => {
      dispatchWheel(root, { deltaY: -1, deltaMode: 1, ctrlKey: true });
      flushRaf();
    });

    expect(onZoom.mock.calls[0][0]).toBe(1.1);
  });

  it('sums multiple wheel events in the same frame into one callback', () => {
    const onWheel = vi.fn();
    const { root } = renderWheel({ onWheel });

    act(() => {
      dispatchWheel(root, { deltaX: 10, deltaMode: 0 });
      dispatchWheel(root, { deltaX: 3, deltaMode: 1 });
      expect(onWheel).not.toHaveBeenCalled();
      flushRaf();
    });

    expect(onWheel).toHaveBeenCalledTimes(1);
    expect(onWheel).toHaveBeenCalledWith(10 + 3 * LINE_HEIGHT_PX, 0, expect.any(WheelEvent));
  });

  it('does not capture vertical content scrolling', () => {
    const onWheel = vi.fn();
    const { getByTestId } = renderWheel({ onWheel });
    const content = getByTestId('content');

    act(() => {
      dispatchWheel(content, { deltaX: 0, deltaY: 40, deltaMode: 0 });
      flushRaf();
    });

    expect(onWheel).not.toHaveBeenCalled();
  });

  it('uses vertical delta over the header as timeline scroll', () => {
    const onWheel = vi.fn();
    const { getByTestId } = renderWheel({ onWheel });
    const header = getByTestId('header');

    act(() => {
      dispatchWheel(header, { deltaX: 0, deltaY: 3, deltaMode: 1 });
      flushRaf();
    });

    expect(onWheel).toHaveBeenCalledWith(3 * LINE_HEIGHT_PX, 0, expect.any(WheelEvent));
  });
});
