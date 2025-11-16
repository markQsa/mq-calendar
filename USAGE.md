# Timeline Calendar - Usage Guide

## Installation

```bash
npm install @mq/timeline-calendar
```

## Basic Usage

### React Component

```tsx
import { TimelineCalendar, TimelineItem } from '@mq/timeline-calendar/react';

function App() {
  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
      width="100%"
      height="600px"
    >
      <TimelineItem
        startTime={new Date('2025-03-15')}
        duration="7 days"
        row={0}
      >
        <div style={{ background: '#3b82f6', color: 'white', padding: '8px' }}>
          Project Planning
        </div>
      </TimelineItem>

      <TimelineItem
        startTime={new Date('2025-03-22')}
        duration="14 days"
        row={1}
      >
        <div style={{ background: '#10b981', color: 'white', padding: '8px' }}>
          Development
        </div>
      </TimelineItem>

      <TimelineItem
        startTime={new Date('2025-04-05')}
        duration="3 days"
        row={2}
      >
        <div style={{ background: '#f59e0b', color: 'white', padding: '8px' }}>
          Testing
        </div>
      </TimelineItem>
    </TimelineCalendar>
  );
}
```

## Advanced Features

### 1. Flexible Time Input

Accept multiple time formats:

```tsx
<TimelineItem
  startTime={new Date('2025-03-15')}  // Date object
  duration="1 week"                    // Human-readable
/>

<TimelineItem
  startTime={1710460800000}            // Unix timestamp
  duration={604800000}                 // Milliseconds
/>

<TimelineItem
  startTime="2025-03-15T00:00:00Z"    // ISO string
  endTime="2025-03-22T00:00:00Z"      // Use endTime instead of duration
/>
```

### 2. Human-Readable Durations

Supported formats:
- `"1 day"`, `"2 days"`
- `"3 hours"`, `"3h"`
- `"30 minutes"`, `"30m"`
- `"1 week 2 days"`
- `"1 month"` (30 days)
- `"1 year"` (365 days)

### 3. Custom Styling with Material UI

```tsx
import { TimelineCalendar } from '@mq/timeline-calendar/react';
import { Box, Typography } from '@mui/material';

function StyledTimeline() {
  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
      theme={{
        colors: {
          background: '#ffffff',
          gridLine: '#e0e0e0',
          gridLinePrimary: '#b0b0b0',
          headerBackground: '#f5f5f5',
          headerText: '#333333',
        },
        fonts: {
          header: 'Roboto, sans-serif',
          content: 'Roboto, sans-serif',
        },
        spacing: {
          headerHeight: 100,
          headerRowHeight: 50,
          rowHeight: 80,
        }
      }}
      renderHeaderCell={({ label, isPrimary }) => (
        <Typography
          variant={isPrimary ? "h6" : "body2"}
          sx={{ fontWeight: isPrimary ? 'bold' : 'normal' }}
        >
          {label}
        </Typography>
      )}
    >
      {/* Your timeline items */}
    </TimelineCalendar>
  );
}
```

### 4. Custom Styling with Tailwind CSS

```tsx
<TimelineCalendar
  startDate={new Date('2025-01-01')}
  endDate={new Date('2025-12-31')}
  classNames={{
    root: 'bg-white dark:bg-gray-900 rounded-lg shadow-lg',
    header: 'bg-gray-100 dark:bg-gray-800 border-b border-gray-200',
    headerCell: 'text-sm font-medium text-gray-700 dark:text-gray-300',
    content: 'overflow-x-auto',
    gridLine: 'border-l border-gray-200 dark:border-gray-700',
  }}
>
  {/* Your timeline items */}
</TimelineCalendar>
```

### 5. Using Custom Time Libraries (Day.js, Luxon)

```tsx
import { TimelineCalendar, createTimeConverter } from '@mq/timeline-calendar';
import dayjs from 'dayjs';

const dayjsConverter = createTimeConverter({
  toTimestamp: (value) => dayjs(value).valueOf(),
  fromTimestamp: (timestamp) => dayjs(timestamp).toDate(),
  formatTime: (timestamp, format) => dayjs(timestamp).format(format)
});

function App() {
  return (
    <TimelineCalendar
      startDate={dayjs('2025-01-01')}
      endDate={dayjs('2025-12-31')}
      timeConverter={dayjsConverter}
    >
      <TimelineItem
        startTime={dayjs('2025-03-15')}
        duration="1 week"
      >
        <div>My Event</div>
      </TimelineItem>
    </TimelineCalendar>
  );
}
```

### 6. Custom Grid Lines

```tsx
<TimelineCalendar
  startDate={new Date('2025-01-01')}
  endDate={new Date('2025-12-31')}
  renderGridLine={({ timestamp, type, isPrimary, label }) => (
    <div
      style={{
        borderLeft: `${isPrimary ? 2 : 1}px ${isPrimary ? 'solid' : 'dashed'} #ccc`,
        height: '100%'
      }}
      title={label}
    />
  )}
>
  {/* Your timeline items */}
</TimelineCalendar>
```

### 7. Event Handlers

```tsx
<TimelineCalendar
  startDate={new Date('2025-01-01')}
  endDate={new Date('2025-12-31')}
  onViewportChange={(start, end) => {
    console.log('Viewport changed:', start, end);
  }}
  onZoomChange={(pixelsPerMs) => {
    console.log('Zoom level:', pixelsPerMs);
  }}
>
  {/* Your timeline items */}
</TimelineCalendar>
```

## Framework-Agnostic Core

Use the core engine without React:

```typescript
import { TimelineEngine } from '@mq/timeline-calendar/core';

const engine = new TimelineEngine({
  viewportStart: new Date('2025-01-01'),
  viewportEnd: new Date('2025-12-31'),
  containerWidth: 1200,
  minZoom: 0.000001,
  maxZoom: 1
});

// Get grid lines
const gridLines = engine.getVisibleGridLines();

// Zoom operations
engine.zoomIn();
engine.zoomOut();
engine.zoom(1.5, 600); // zoom by 1.5x at pixel 600

// Scroll operations
engine.scroll(100); // scroll 100 pixels
engine.scrollToTimestamp(new Date('2025-06-01').getTime());

// Convert between time and pixels
const pixelPosition = engine.timeToPixel(new Date('2025-03-15').getTime());
const timestamp = engine.pixelToTime(500);
```

## Controls

- **Mouse wheel**: Scroll horizontally
- **Ctrl/Cmd + Mouse wheel**: Zoom in/out (centered on cursor)
- **Smooth zoom**: Continuous zoom without steps
- **Smooth scroll**: Momentum-based scrolling

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  TimelineCalendarProps,
  TimelineItemProps,
  TimeValue,
  DurationValue,
  TimeConverter
} from '@mq/timeline-calendar';
```
