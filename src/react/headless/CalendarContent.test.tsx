import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CalendarContent } from './CalendarContent';

describe('CalendarContent', () => {
  beforeEach(() => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
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
});
