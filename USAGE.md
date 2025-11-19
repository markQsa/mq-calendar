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

### 8. Pinpoint Markers with Clustering

Display point-in-time markers (milestones, events, deadlines) with automatic clustering:

```tsx
import { TimelinePinpoint, TimelinePinpointGroup } from '@mq/timeline-calendar/react';

function App() {
  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
    >
      <TimelineRow id="events" label="Events" rowCount={1}>
        <TimelinePinpointGroup row={0} clusterDistance={30}>
          {/* Individual pinpoints - will cluster when too close */}
          <TimelinePinpoint
            time="2025-03-10T10:00:00"
            color="#10b981"
            data={{ type: 'inspection', name: 'Safety Check' }}
          >
            ✓
          </TimelinePinpoint>

          <TimelinePinpoint
            time="2025-03-10T14:00:00"
            color="#3b82f6"
            data={{ type: 'meeting', name: 'Team Sync' }}
          >
            👥
          </TimelinePinpoint>

          <TimelinePinpoint
            time="2025-03-15T09:00:00"
            color="#ef4444"
            data={{ type: 'deadline', name: 'Project Deadline' }}
          >
            !
          </TimelinePinpoint>
        </TimelinePinpointGroup>
      </TimelineRow>
    </TimelineCalendar>
  );
}
```

#### Pinpoint Customization

```tsx
{/* Different sizes */}
<TimelinePinpoint
  time="2025-03-01T10:00:00"
  size={32}              // Circle size in pixels (default: 24)
  color="#10b981"
>
  ✓
</TimelinePinpoint>

{/* Different alignments */}
<TimelinePinpoint
  time="2025-03-05T10:00:00"
  alignment="top"        // 'top' (default), 'center', or 'bottom'
  color="#3b82f6"
>
  📍
</TimelinePinpoint>

<TimelinePinpoint
  time="2025-03-10T10:00:00"
  alignment="center"     // Center alignment hides the line
  color="#f59e0b"
>
  ◆
</TimelinePinpoint>

{/* Custom line styles */}
<TimelinePinpoint
  time="2025-03-15T10:00:00"
  lineStyle="dashed"     // 'solid' (default), 'dashed', or 'dotted'
  lineWidth={3}          // Line width in pixels (default: 2)
  lineLength={50}        // Line length in pixels (default: half row height)
  color="#ef4444"
>
  !
</TimelinePinpoint>

{/* Click handler with custom data */}
<TimelinePinpoint
  time="2025-03-20T10:00:00"
  color="#8b5cf6"
  data={{ id: 123, type: 'event', name: 'Custom Event' }}
  onClick={(timestamp, data) => {
    console.log('Clicked:', new Date(timestamp), data);
  }}
>
  📅
</TimelinePinpoint>
```

#### Clustering Behavior

- Pinpoints within `clusterDistance` pixels (default: 30px) are automatically grouped
- Cluster markers show the count of pinpoints
- Clicking a cluster smoothly zooms in to separate the pinpoints
- Custom cluster click handler:

```tsx
<TimelinePinpointGroup
  row={0}
  clusterDistance={30}
  clusterColor="#ef4444"  // Custom color for cluster markers
  onClusterClick={(timestamp, items) => {
    console.log('Cluster clicked:', new Date(timestamp));
    console.log('Items in cluster:', items);
    // Custom behavior instead of default zoom
  }}
>
  {/* Pinpoints */}
</TimelinePinpointGroup>
```

#### Pinpoint Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `time` | `TimeValue` | required | Time of the pinpoint (Date, timestamp, or ISO string) |
| `row` | `number` | 0 | Row/lane for vertical positioning |
| `size` | `number` | 24 | Circle marker size in pixels |
| `color` | `string` | theme color | Color of the marker and line |
| `alignment` | `'top' \| 'center' \| 'bottom'` | 'top' | Vertical position; 'center' hides the line |
| `lineWidth` | `number` | 2 | Width of the vertical line in pixels |
| `lineLength` | `number` | half row height | Length of the vertical line in pixels |
| `lineStyle` | `'solid' \| 'dashed' \| 'dotted'` | 'solid' | Style of the vertical line |
| `children` | `ReactNode` | - | Icon/emoji to display in the marker |
| `data` | `any` | - | Custom data associated with the pinpoint |
| `onClick` | `(timestamp: number, data?: any) => void` | - | Click handler |
| `className` | `string` | - | Custom CSS class |
| `style` | `CSSProperties` | - | Custom inline styles |

#### TimelinePinpointGroup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `row` | `number` | 0 | Row/lane for vertical positioning |
| `clusterDistance` | `number` | 30 | Pixel distance threshold for clustering |
| `clusterColor` | `string` | theme color | Color for cluster markers |
| `clusterSize` | `number` | 24 | Size of cluster circle marker in pixels |
| `pinpointSize` | `number` | 24 | Default size for individual pinpoint markers |
| `pinpointLineWidth` | `number` | 2 | Default line width for pinpoints |
| `pinpointLineLength` | `number` | half row height | Default line length for pinpoints |
| `onClusterClick` | `(timestamp, items) => void` | - | Custom cluster click handler |

#### Group-Level Defaults

You can set default properties at the group level that apply to all pinpoints:

```tsx
{/* All pinpoints inherit size and line properties from the group */}
<TimelinePinpointGroup
  row={0}
  clusterDistance={30}
  clusterSize={32}           // Larger cluster markers
  clusterColor="#ec4899"
  pinpointSize={16}          // All pinpoints default to 16px
  pinpointLineWidth={3}      // Thicker lines for all
  pinpointLineLength={25}    // Shorter lines
>
  <TimelinePinpoint time="2025-03-01T10:00:00" color="#10b981">✓</TimelinePinpoint>
  <TimelinePinpoint time="2025-03-01T11:00:00" color="#3b82f6">👥</TimelinePinpoint>
  <TimelinePinpoint time="2025-03-01T12:00:00" color="#f59e0b">🔧</TimelinePinpoint>
  {/* All inherit: size=16, lineWidth=3, lineLength=25 */}
</TimelinePinpointGroup>

{/* Individual pinpoints can override group defaults */}
<TimelinePinpointGroup
  row={1}
  pinpointSize={24}          // Default size for this group
  pinpointLineWidth={2}
>
  <TimelinePinpoint time="2025-04-01T10:00:00" size={16}>
    ✓
  </TimelinePinpoint>  {/* Overrides size to 16px */}

  <TimelinePinpoint time="2025-04-05T10:00:00">
    👥
  </TimelinePinpoint>  {/* Uses group default size=24px */}
</TimelinePinpointGroup>
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
