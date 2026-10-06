import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TimelineCalendar } from './TimelineCalendar';
import { TimelineItem } from './TimelineItem';
import { TimelineRow } from './TimelineRow';

describe('TimelineCalendar', () => {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem startTime="2025-03-15" duration="1 week" row={0}>
              <div>Test Item</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      expect(container).toBeInTheDocument();
    });

    it('should render with data-timeline-calendar attribute', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <div>Content</div>
        </TimelineCalendar>
      );

      const calendar = container.querySelector('[data-timeline-calendar]');
      expect(calendar).toBeInTheDocument();
    });

    it('should apply custom width and height', () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1200px"
          height="800px"
        >
          <div>Content</div>
        </TimelineCalendar>
      );

      const calendar = container.querySelector('[data-timeline-calendar]');
      expect(calendar).toHaveStyle({ width: '1200px', height: '800px' });
    });
  });

  describe('theming', () => {
    it('should apply light theme by default', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <div>Content</div>
        </TimelineCalendar>
      );

      const calendar = container.querySelector('[data-timeline-calendar]');

      // Light theme has white background
      expect(calendar).toHaveStyle({
        '--timeline-bg': '#ffffff',
      });
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          classNames={{ root: 'custom-class' }}
        >
          <div>Content</div>
        </TimelineCalendar>
      );

      const calendar = container.querySelector('.custom-class');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('time formats', () => {
    it('should accept Date objects for start and end', () => {
      const { container } = render(
        <TimelineCalendar
          startDate={new Date('2025-01-01')}
          endDate={new Date('2025-12-31')}
        >
          <div>Content</div>
        </TimelineCalendar>
      );

      expect(container.querySelector('[data-timeline-calendar]')).toBeInTheDocument();
    });

    it('should accept ISO strings for start and end', () => {
      const { container } = render(
        <TimelineCalendar
          startDate="2025-01-01T00:00:00Z"
          endDate="2025-12-31T23:59:59Z"
        >
          <div>Content</div>
        </TimelineCalendar>
      );

      expect(container.querySelector('[data-timeline-calendar]')).toBeInTheDocument();
    });

    it('should accept timestamps for start and end', () => {
      const { container } = render(
        <TimelineCalendar
          startDate={new Date('2025-01-01').getTime()}
          endDate={new Date('2025-12-31').getTime()}
        >
          <div>Content</div>
        </TimelineCalendar>
      );

      expect(container.querySelector('[data-timeline-calendar]')).toBeInTheDocument();
    });
  });

  describe('compressClosedHours', () => {
    // A workshop open 06:00-18:00, shown as a single day
    const dayStart = new Date(2025, 5, 2); // Monday
    const dayEnd = new Date(2025, 5, 3);
    const openingHours = {
      weekly: {
        1: [{ start: '06:00', end: '18:00' }],
      },
    };

    const renderDay = (compressClosedHours: boolean) =>
      render(
        <TimelineCalendar
          startDate={dayStart}
          endDate={dayEnd}
          availability={openingHours}
          compressClosedHours={compressClosedHours}
        >
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem
              id="job"
              startTime={new Date(2025, 5, 2, 6)}
              endTime={new Date(2025, 5, 2, 18)}
              row={0}
            >
              <div>Job</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

    const itemWidth = (container: HTMLElement) => {
      const item = container.querySelector('[data-timeline-item]') as HTMLElement | null;
      return item ? Number.parseFloat(item.style.width) : NaN;
    };

    it('widens opening hours and shifts them right', () => {
      const plain = renderDay(false);
      const compressed = renderDay(true);

      const plainWidth = itemWidth(plain.container);
      const compressedWidth = itemWidth(compressed.container);

      // 12h of a 24h day vs 12h of a 15h axis (12h + 12h * 0.15)
      expect(plainWidth).toBeGreaterThan(0);
      expect(compressedWidth).toBeGreaterThan(plainWidth * 1.4);
    });

    it('does not compress without an availability config', () => {
      const { container } = render(
        <TimelineCalendar startDate={dayStart} endDate={dayEnd} compressClosedHours>
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem
              id="job"
              startTime={new Date(2025, 5, 2, 6)}
              endTime={new Date(2025, 5, 2, 18)}
              row={0}
            >
              <div>Job</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      const plain = renderDay(false);
      expect(itemWidth(container)).toBeCloseTo(itemWidth(plain.container), 3);
    });

    it('stays stable when availability is re-created on every render', () => {
      const tree = (
        <TimelineCalendar
          startDate={dayStart}
          endDate={dayEnd}
          availability={{ weekly: { 1: [{ start: '06:00', end: '18:00' }] } }}
          compressClosedHours={{ factor: 0.2 }}
        >
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem
              id="job"
              startTime={new Date(2025, 5, 2, 6)}
              endTime={new Date(2025, 5, 2, 18)}
              row={0}
            >
              <div>Job</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      const { container, rerender } = render(tree);
      const first = itemWidth(container);

      // New object identities for availability and the options object
      rerender(tree);

      expect(itemWidth(container)).toBeCloseTo(first, 3);
    });
  });

  describe('zoom limits', () => {
    it('should accept minZoom as string', () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          minZoom="5 years"
        >
          <div>Content</div>
        </TimelineCalendar>
      );

      const calendar = container.querySelector('[data-timeline-calendar]');
      expect(calendar).toBeInTheDocument();
    });

    it('should accept maxZoom as string', () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          maxZoom="1 hour"
        >
          <div>Content</div>
        </TimelineCalendar>
      );

      const calendar = container.querySelector('[data-timeline-calendar]');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('sidebar sticky layout', () => {
    const row = (testId: string, label: string) => (
      <div data-testid={testId} style={{ height: 80, boxSizing: 'border-box' }}>
        {label}
      </div>
    );

    const renderWithSidebar = () =>
      render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          height="200px"
          sidebar={{
            width: 100,
            headerContent: <div>Lifts</div>,
            content: (
              <div>
                {row('sidebar-row-0', 'S0')}
                {row('sidebar-row-1', 'S1')}
                {row('sidebar-row-2', 'S2')}
                {row('sidebar-row-3', 'S3')}
                {row('sidebar-row-4', 'S4')}
                {row('sidebar-row-5', 'S5')}
              </div>
            ),
          }}
        >
          <div>
            {row('content-row-0', 'C0')}
            {row('content-row-1', 'C1')}
            {row('content-row-2', 'C2')}
            {row('content-row-3', 'C3')}
            {row('content-row-4', 'C4')}
            {row('content-row-5', 'C5')}
          </div>
        </TimelineCalendar>
      );

    const nearestOverflowYAuto = (el: HTMLElement | null): HTMLElement | null => {
      while (el) {
        if (el.style.overflowY === 'auto') return el;
        el = el.parentElement;
      }
      return null;
    };

    it('keeps public timeline content and header attributes', () => {
      const { container } = renderWithSidebar();

      expect(container.querySelector('[data-timeline-calendar]')).toBeInTheDocument();
      expect(container.querySelector('[data-timeline-header]')).toBeInTheDocument();
      expect(container.querySelector('[data-timeline-content]')).toBeInTheDocument();
      expect(container.querySelector('[data-timeline-content-inner]')).toBeInTheDocument();
    });

    it('sticks the sidebar in the same vertical scroller as the rows', () => {
      const { container } = renderWithSidebar();

      const sidebar = container.querySelector('[data-timeline-sidebar]') as HTMLElement | null;
      const content = container.querySelector('[data-timeline-content]') as HTMLElement | null;
      const sidebarRow = container.querySelector('[data-testid="sidebar-row-0"]') as HTMLElement | null;
      const contentRow = container.querySelector('[data-testid="content-row-0"]') as HTMLElement | null;

      expect(sidebar).toBeTruthy();
      expect(content).toBeTruthy();
      expect(sidebarRow).toBeTruthy();
      expect(contentRow).toBeTruthy();

      expect(sidebar!.style.position).toBe('sticky');
      expect(sidebar!.style.left).toBe('0px');
      expect(sidebar!.style.transform).toBe('');

      const scroller = nearestOverflowYAuto(sidebar);
      expect(scroller).toBeTruthy();
      expect(scroller).toContainElement(sidebarRow);
      expect(scroller).toContainElement(contentRow);
      expect(scroller).toContainElement(content);
      expect(scroller).not.toBe(content);
      expect(content!.style.overflowY).toBe('visible');
    });

    it('aligns sidebar rows with content rows after vertical scroll without writing scrollTop', () => {
      const { container } = renderWithSidebar();

      const sidebar = container.querySelector('[data-timeline-sidebar]') as HTMLElement;
      const content = container.querySelector('[data-timeline-content]') as HTMLElement;
      const sidebarRow = container.querySelector('[data-testid="sidebar-row-0"]') as HTMLElement;
      const contentRow = container.querySelector('[data-testid="content-row-0"]') as HTMLElement;
      const scroller = nearestOverflowYAuto(sidebar)!;

      const sidebarScrollTop = vi.fn();
      Object.defineProperty(sidebar, 'scrollTop', {
        configurable: true,
        get: () => 0,
        set: sidebarScrollTop,
      });

      scroller.scrollTop = 48;
      scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
      content.scrollTop = 48;
      content.dispatchEvent(new Event('scroll', { bubbles: true }));

      expect(sidebarScrollTop).not.toHaveBeenCalled();
      expect(scroller.contains(sidebarRow)).toBe(true);
      expect(scroller.contains(contentRow)).toBe(true);

      const sidebarOffset = sidebarRow.offsetTop;
      const contentOffset = contentRow.offsetTop;
      expect(sidebarOffset).toBe(contentOffset);
    });
  });

  describe('CSS variable reads', () => {
    it('reads --timeline-row-height at most once per render', () => {
      const original = window.getComputedStyle;
      const documentElementReads: Element[] = [];
      const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation((elt, pseudo) => {
        if (elt === document.documentElement) {
          documentElementReads.push(elt as Element);
        }
        return original.call(window, elt, pseudo);
      });

      try {
        const tree = (
          <TimelineCalendar startDate={startDate} endDate={endDate}>
            <div>Content</div>
          </TimelineCalendar>
        );
        const { rerender } = render(tree);

        expect(documentElementReads.length).toBe(1);

        rerender(tree);
        expect(documentElementReads.length).toBe(1);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
