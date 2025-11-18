# mq-timeline-calendar

A flexible, headless timeline/calendar component for React with smooth scrolling, zooming, and drag-and-drop capabilities.

[![npm version](https://img.shields.io/npm/v/mq-timeline-calendar.svg)](https://www.npmjs.com/package/mq-timeline-calendar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Headless by default** - Full control over styling and rendering
- 📅 **Smooth scrolling** - Navigate through time seamlessly with mouse wheel
- 🔍 **Continuous zoom** - Smooth, cursor-relative zoom (Ctrl/Cmd + wheel)
- 🎨 **Built-in themes** - Light and dark themes included
- 🖱️ **Drag & Drop** - Move items horizontally (time) and vertically (rows)
- 📊 **Row grouping** - Organize timeline items with collapsible row groups
- 🌍 **Localization** - Support for 13+ European languages
- ⏰ **Availability overlay** - Show working hours and available time periods
- 📊 **Smart aggregation** - Auto-aggregate items when zoomed out for better performance
- ⚛️ **React first** - Optimized React components with hooks
- 📦 **TypeScript** - Full type safety and IntelliSense support
- 🚀 **Framework-agnostic core** - Core engine can be used with any framework

## Installation

```bash
npm install mq-timeline-calendar
```

## Live Demo

Try out the timeline calendar in CodeSandbox:

[![Edit on CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/github/markQsa/mq-calendar-demo/main)

[Open Demo →](https://codesandbox.io/p/github/markQsa/mq-calendar-demo/main)

## Quick Start

```tsx
import { TimelineCalendar, TimelineItem, TimelineRow, TimelineRowGroup } from 'mq-timeline-calendar/react';

function App() {
  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
      height="600px"
      showCurrentTime={true}
      theme="light"
    >
      <TimelineRowGroup>
        <TimelineRow id="row-1" label="Production Line A" rowCount={2} collapsible={true}>
          <TimelineItem
            startTime="2025-03-15"
            duration="1 week"
            row={0}
          >
            <div style={{ background: '#3b82f6', padding: '8px', color: 'white' }}>
              Order #1234
            </div>
          </TimelineItem>

          <TimelineItem
            startTime="2025-03-25"
            duration="5 days"
            row={1}
          >
            <div style={{ background: '#10b981', padding: '8px', color: 'white' }}>
              Order #1235
            </div>
          </TimelineItem>
        </TimelineRow>
      </TimelineRowGroup>
    </TimelineCalendar>
  );
}
```

## Core Concepts

### TimelineCalendar

The main container component that manages the timeline viewport, zoom level, and scrolling.

```tsx
<TimelineCalendar
  startDate={new Date('2024-01-01')}
  endDate={new Date('2026-12-31')}
  width="100%"
  height="600px"
  minZoom="1000 years"
  maxZoom="100 milliseconds"
  showNavigation={false}
  showCurrentTime={true}
  locale={fiFI}
  theme="dark"
  onViewportChange={(start, end) => console.log('Viewport:', start, end)}
  onZoomChange={(pixelsPerMs) => console.log('Zoom:', pixelsPerMs)}
>
  {/* Timeline items and rows */}
</TimelineCalendar>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `startDate` | `TimeValue` | required | Start date of the timeline |
| `endDate` | `TimeValue` | required | End date of the timeline |
| `width` | `string \| number` | `"100%"` | Width of the container |
| `height` | `string \| number` | `"600px"` | Height of the container |
| `minZoom` | `number \| string` | - | Minimum zoom level (e.g., "5 years") |
| `maxZoom` | `number \| string` | - | Maximum zoom level (e.g., "1 hour") |
| `showNavigation` | `boolean` | `false` | Show navigation buttons |
| `showCurrentTime` | `boolean` | `false` | Show current time indicator |
| `currentTimeLineWidth` | `number` | `2` | Width of current time line in pixels |
| `locale` | `CalendarLocale` | - | Locale for date formatting |
| `theme` | `'light' \| 'dark' \| TimelineTheme` | `'light'` | Theme preset or custom theme object |
| `availability` | `AvailabilityConfig` | - | Availability/working hours configuration |
| `onViewportChange` | `(start: Date, end: Date) => void` | - | Called when viewport changes |
| `onZoomChange` | `(pixelsPerMs: number) => void` | - | Called when zoom level changes |

### TimelineItem

Individual items placed on the timeline at specific times.

```tsx
<TimelineItem
  startTime="2025-03-15"
  duration="1 week"
  row={0}
  draggable={true}
  allowRowChange={true}
  onDragStart={(timestamp, row, rowGroupId) => console.log('Drag started')}
  onDrag={(timestamp, row, rowGroupId) => console.log('Dragging')}
  onDragEnd={(newTime, oldTime, newRow, oldRow, newGroupId, oldGroupId) => {
    console.log('Dropped at:', new Date(newTime), 'row:', newRow);
  }}
>
  <div>My Event</div>
</TimelineItem>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `startTime` | `TimeValue` | required | Start time (Date, timestamp, or ISO string) |
| `duration` | `DurationValue` | required | Duration (ms or human-readable like "1 week") |
| `endTime` | `TimeValue` | - | Alternative to duration - specify end time directly |
| `row` | `number` | `0` | Row/lane for vertical positioning |
| `draggable` | `boolean` | `false` | Enable drag and drop |
| `allowRowChange` | `boolean` | `false` | Allow dragging between rows (vertical) |
| `onDragStart` | `(timestamp, row, rowGroupId?) => void` | - | Called when drag starts |
| `onDrag` | `(timestamp, row, rowGroupId?) => void` | - | Called during drag |
| `onRowChange` | `(newRow, oldRow, newGroupId?, oldGroupId?) => void` | - | Called when row changes |
| `onDragEnd` | `(newTime, oldTime, newRow, oldRow, newGroupId?, oldGroupId?) => void` | - | Called when drag ends |
| `className` | `string` | - | CSS class name |
| `style` | `CSSProperties` | - | Inline styles |

### TimelineRow & TimelineRowGroup

Organize timeline items into rows with optional collapsible headers.

```tsx
<TimelineRowGroup>
  <TimelineRow
    id="line-a"
    label="Production Line A"
    rowCount={2}
    collapsible={true}
    defaultExpanded={true}
  >
    <TimelineItem startTime="2025-03-15" duration="1 week" row={0}>
      <div>Order #1</div>
    </TimelineItem>
    <TimelineItem startTime="2025-03-20" duration="3 days" row={1}>
      <div>Order #2</div>
    </TimelineItem>
  </TimelineRow>

  <TimelineRow id="line-b" label="Production Line B" rowCount={1} collapsible={true}>
    <TimelineItem startTime="2025-03-18" duration="5 days" row={0}>
      <div>Order #3</div>
    </TimelineItem>
  </TimelineRow>
</TimelineRowGroup>
```

#### TimelineRow Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | auto-generated | Unique identifier |
| `label` | `string` | - | Label text for header |
| `rowCount` | `number` | `1` | Number of rows this component occupies |
| `collapsible` | `boolean` | `false` | Whether row can be collapsed |
| `showHeader` | `boolean` | `true` | Show header (only if collapsible=true) |
| `defaultExpanded` | `boolean` | `true` | Initial expanded state |
| `headerClassName` | `string` | - | CSS class for header |
| `headerStyle` | `CSSProperties` | - | Inline styles for header |
| `aggregation` | `AggregationConfig` | - | Aggregation configuration (see Aggregation section) |
| `renderAggregatedPeriod` | `(params) => ReactNode` | - | Custom renderer for aggregated periods |
| `getAggregatedTypeStyle` | `(type: string) => StyleObject` | - | Function to get style for aggregated bar segments |

## Drag and Drop

### Horizontal Dragging (Time)

Move items forward or backward in time:

```tsx
const [itemTime, setItemTime] = useState(new Date('2025-03-15'));

<TimelineItem
  startTime={itemTime}
  duration="5 days"
  row={0}
  draggable={true}
  onDragEnd={(newTimestamp) => {
    setItemTime(new Date(newTimestamp));
  }}
>
  <div>Drag me horizontally!</div>
</TimelineItem>
```

### Vertical Dragging (Rows)

Move items between rows within the same TimelineRow group:

```tsx
const [itemRow, setItemRow] = useState(0);

<TimelineRow id="group-1" rowCount={3} collapsible={true}>
  <TimelineItem
    startTime="2025-03-15"
    duration="5 days"
    row={itemRow}
    draggable={true}
    allowRowChange={true}
    onDragEnd={(newTime, oldTime, newRow) => {
      setItemRow(newRow);
    }}
  >
    <div>Drag me vertically!</div>
  </TimelineItem>
</TimelineRow>
```

### Drag Behavior

- **Direction-locked**: Once drag starts, it's locked to either horizontal (time) or vertical (row) based on initial movement
- **Snapping**: Time changes snap to 15-minute intervals by default
- **Threshold**: 5-pixel movement required before drag activates (prevents accidental drags)
- **Row constraints**: Vertical dragging is constrained within the TimelineRow's `rowCount`

## Time Formats

The component accepts multiple time formats:

```tsx
// Date object
startTime={new Date('2025-03-15')}

// ISO string
startTime="2025-03-15T10:00:00Z"

// Timestamp (milliseconds)
startTime={1710504000000}

// Duration can be:
duration={7 * 24 * 60 * 60 * 1000} // milliseconds
duration="1 week"                    // human-readable
duration="3 days"
duration="2 hours"
duration="30 minutes"
```

## Themes

### Built-in Themes

```tsx
// Light theme (default)
<TimelineCalendar theme="light">

// Dark theme
<TimelineCalendar theme="dark">
```

### Custom Theme

```tsx
<TimelineCalendar
  theme={{
    colors: {
      background: '#1a1a1a',
      gridLine: '#333333',
      headerBackground: '#2a2a2a',
      headerText: '#ffffff',
      currentTimeLine: '#3b82f6'
    },
    spacing: {
      headerHeight: 100,
      rowHeight: 60
    }
  }}
>
```

## Availability / Working Hours

Show available and unavailable time periods:

```tsx
<TimelineCalendar
  availability={{
    // Weekly pattern: define working hours for each day
    weekly: {
      1: [{ start: '08:00', end: '17:30' }], // Monday
      2: [{ start: '09:00', end: '16:00' }], // Tuesday
      3: [{ start: '08:00', end: '17:30' }], // Wednesday
      4: [{ start: '09:00', end: '16:00' }], // Thursday
      5: [{ start: '08:00', end: '15:00' }], // Friday
    },
    unavailableStyle: {
      backgroundColor: 'rgba(156, 163, 175, 0.12)',
    }
  }}
>
```

## Timeline Aggregation

When working with large datasets, the timeline can automatically aggregate items into grouped periods for better performance and visualization.

### How It Works

When you zoom out far enough (beyond the configured threshold) and have many items, the timeline automatically switches from individual item rendering to an aggregated view. The aggregated view shows:

- **Stacked bar charts** grouped by week or month
- **Occupancy percentage** - how much of the available time is occupied
- **Item counts** by type
- **Color-coded segments** representing different item types

### Configuration

Add the `aggregation` prop to `TimelineRow`:

```tsx
<TimelineRow
  id="production-line"
  label="Production Line A"
  rowCount={2}
  aggregation={{
    enabled: true,
    threshold: "6 months",        // Switch to aggregated view when viewport > 6 months
    granularity: "dynamic",        // "week" | "month" | "dynamic"
    minItemsForAggregation: 50    // Only aggregate if row has 50+ items
  }}
  getAggregatedTypeStyle={(type) => ({
    backgroundColor: type === 'urgent' ? '#ef4444' : '#3b82f6',
    color: 'white'
  })}
  renderAggregatedPeriod={({ period, position, width, height }) => (
    <div style={{ width, height }}>
      Custom rendering for {period.start} - {period.end}
    </div>
  )}
>
  {/* Many TimelineItem components */}
</TimelineRow>
```

### Aggregation Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable aggregation |
| `threshold` | `DurationValue` | `"6 months"` | Viewport duration that triggers aggregation |
| `granularity` | `'week' \| 'month' \| 'dynamic'` | `"dynamic"` | How to group periods |
| `minItemsForAggregation` | `number` | `50` | Minimum items needed to activate aggregation |

### Custom Rendering

You can customize the aggregated view rendering:

```tsx
<TimelineRow
  aggregation={{ enabled: true }}
  renderAggregatedPeriod={({ period, position, width, height }) => {
    const { occupancyPercent, byType } = period;

    return (
      <div
        style={{
          position: 'absolute',
          left: position,
          width,
          height,
          background: `linear-gradient(to top,
            rgba(59, 130, 246, ${occupancyPercent / 100}) 0%,
            rgba(59, 130, 246, 0.2) 100%)`
        }}
      >
        <span>{occupancyPercent.toFixed(0)}%</span>
      </div>
    );
  }}
>
```

### Type-Based Styling

Customize the appearance of different item types in aggregated view:

```tsx
<TimelineRow
  aggregation={{ enabled: true }}
  getAggregatedTypeStyle={(type) => {
    const styles = {
      'production': { backgroundColor: '#10b981', color: 'white' },
      'maintenance': { backgroundColor: '#f59e0b', color: 'white' },
      'downtime': { backgroundColor: '#ef4444', color: 'white' }
    };
    return styles[type] || { backgroundColor: '#6b7280', color: 'white' };
  }}
>
```

### Granularity Options

- **`week`**: Always group by ISO weeks (Monday-Sunday)
- **`month`**: Always group by calendar months
- **`dynamic`**: Automatically choose based on viewport:
  - Weeks for 6-12 month viewports
  - Months for >12 month viewports

## Localization

```tsx
import { deDE } from 'mq-timeline-calendar/react';

<TimelineCalendar locale={deDE}>
```

Available locales:
- `enUS` - English (US) - Default
- `deDE` - German (Germany)
- `frFR` - French (France)
- `esES` - Spanish (Spain)
- `itIT` - Italian (Italy)
- `ptPT` - Portuguese (Portugal)
- `nlNL` - Dutch (Netherlands)
- `svSE` - Swedish (Sweden)
- `noNO` - Norwegian (Norway)
- `daDK` - Danish (Denmark)
- `plPL` - Polish (Poland)
- `ruRU` - Russian (Russia)
- `fiFI` - Finnish (Finland)

You can also create custom locales by implementing the `CalendarLocale` interface.

## Keyboard & Mouse Controls

- **Horizontal Trackpad Swipe / Wheel**: Scroll horizontally through time
- **Vertical Mouse Wheel (over header)**: Scroll horizontally through time
- **Vertical Trackpad Swipe / Mouse Wheel (over content)**: Scroll vertically through rows (when overflow exists)
- **Shift + Vertical Mouse Wheel**: Scroll horizontally through time (works anywhere)
- **Ctrl/Cmd + Mouse Wheel**: Zoom in/out (centered on cursor position)
- **Click header cells**: Zoom to that time period
- **Drag items**: Move items in time or between rows (if enabled)

## TypeScript Support

The package is written in TypeScript and includes full type definitions:

```tsx
import type {
  TimelineCalendarProps,
  TimelineItemProps,
  TimelineRowProps,
  TimeValue,
  DurationValue,
  CalendarLocale,
  TimelineTheme,
  AggregationConfig,
  AggregatedPeriod,
  AggregatedPeriodRenderParams
} from 'mq-timeline-calendar/react';
```

## CSS Custom Properties

Customize appearance using CSS variables:

```css
:root {
  --timeline-header-height: 100px;
  --timeline-header-row-height: 40px;
  --timeline-row-height: 60px;
  --timeline-header-bg: #ffffff;
  --timeline-header-text: #374151;
  --timeline-header-border: #d1d5db;
  --timeline-grid-line: #e5e7eb;
  --timeline-grid-line-primary: #d1d5db;
}
```

## Framework-Agnostic Core

The core timeline engine can be used without React:

```typescript
import { TimelineEngine } from 'mq-timeline-calendar/core';

const engine = new TimelineEngine(
  new Date('2025-01-01'),
  new Date('2025-12-31'),
  1000 // viewport width in pixels
);

// Convert time to pixel position
const pixelX = engine.timeToPixel(new Date('2025-06-15').getTime());

// Convert pixel to time
const timestamp = engine.pixelToTime(500);

// Zoom
engine.zoom(1.5, 500); // 1.5x zoom at pixel position 500

// Scroll
engine.scroll(100); // Scroll 100 pixels
```

## Examples

### Basic Timeline

```tsx
import { TimelineCalendar, TimelineItem } from 'mq-timeline-calendar/react';

function BasicTimeline() {
  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
      height="400px"
    >
      <TimelineItem startTime="2025-03-15" duration="1 week" row={0}>
        <div>Event 1</div>
      </TimelineItem>
      <TimelineItem startTime="2025-06-20" duration="3 days" row={1}>
        <div>Event 2</div>
      </TimelineItem>
    </TimelineCalendar>
  );
}
```

### Production Schedule

```tsx
import { TimelineCalendar, TimelineItem, TimelineRow, TimelineRowGroup } from 'mq-timeline-calendar/react';

function ProductionSchedule() {
  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
      height="600px"
      showCurrentTime={true}
      theme="dark"
    >
      <TimelineRowGroup>
        <TimelineRow id="line-a" label="Production Line A" rowCount={2} collapsible={true}>
          <TimelineItem startTime="2025-03-10" duration="5 days" row={0}>
            <div className="order">Order #1234</div>
          </TimelineItem>
          <TimelineItem startTime="2025-03-18" duration="3 days" row={1}>
            <div className="order">Order #1235</div>
          </TimelineItem>
        </TimelineRow>

        <TimelineRow id="line-b" label="Production Line B" rowCount={1} collapsible={true}>
          <TimelineItem startTime="2025-03-12" duration="4 days" row={0}>
            <div className="order">Order #1240</div>
          </TimelineItem>
        </TimelineRow>
      </TimelineRowGroup>
    </TimelineCalendar>
  );
}
```

### Draggable Items

```tsx
function DraggableTimeline() {
  const [items, setItems] = useState([
    { id: 1, time: new Date('2025-03-15'), duration: '5 days', row: 0 },
    { id: 2, time: new Date('2025-03-20'), duration: '3 days', row: 1 },
  ]);

  const handleDragEnd = (itemId, newTime, newRow) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, time: new Date(newTime), row: newRow }
        : item
    ));
  };

  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
      height="600px"
    >
      <TimelineRow id="tasks" rowCount={3} collapsible={false}>
        {items.map(item => (
          <TimelineItem
            key={item.id}
            startTime={item.time}
            duration={item.duration}
            row={item.row}
            draggable={true}
            allowRowChange={true}
            onDragEnd={(newTime, _, newRow) => handleDragEnd(item.id, newTime, newRow)}
          >
            <div>Task {item.id}</div>
          </TimelineItem>
        ))}
      </TimelineRow>
    </TimelineCalendar>
  );
}
```

### Timeline with Aggregation

```tsx
function LargeDatasetTimeline() {
  // Generate hundreds of items
  const items = useMemo(() => {
    const result = [];
    for (let i = 0; i < 200; i++) {
      const dayOffset = Math.floor(Math.random() * 365);
      const types = ['production', 'maintenance', 'testing', 'downtime'];
      result.push({
        id: i,
        startTime: addDays(new Date('2025-01-01'), dayOffset),
        duration: `${Math.floor(Math.random() * 5) + 1} days`,
        type: types[Math.floor(Math.random() * types.length)],
        row: Math.floor(Math.random() * 3)
      });
    }
    return result;
  }, []);

  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
      height="600px"
      showCurrentTime={true}
    >
      <TimelineRowGroup>
        <TimelineRow
          id="production"
          label="Production Line"
          rowCount={3}
          collapsible={true}
          aggregation={{
            enabled: true,
            threshold: "6 months",
            granularity: "dynamic",
            minItemsForAggregation: 50
          }}
          getAggregatedTypeStyle={(type) => {
            const styles = {
              production: { backgroundColor: '#10b981', color: 'white' },
              maintenance: { backgroundColor: '#f59e0b', color: 'white' },
              testing: { backgroundColor: '#3b82f6', color: 'white' },
              downtime: { backgroundColor: '#ef4444', color: 'white' }
            };
            return styles[type] || { backgroundColor: '#6b7280', color: 'white' };
          }}
        >
          {items.map(item => (
            <TimelineItem
              key={item.id}
              startTime={item.startTime}
              duration={item.duration}
              row={item.row}
              type={item.type}
            >
              <div style={{ padding: '4px', fontSize: '12px' }}>
                {item.type} #{item.id}
              </div>
            </TimelineItem>
          ))}
        </TimelineRow>
      </TimelineRowGroup>
    </TimelineCalendar>
  );
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Your Name]

## Links

- [GitHub Repository](https://github.com/markQsa/mq-calendar)
- [NPM Package](https://www.npmjs.com/package/mq-timeline-calendar)
- [Live Demo (CodeSandbox)](https://codesandbox.io/p/github/markQsa/mq-calendar-demo/main)
- [Issue Tracker](https://github.com/markQsa/mq-calendar/issues)
