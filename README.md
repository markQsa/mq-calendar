# @mq/timeline-calendar

A flexible, framework-agnostic timeline/calendar component with smooth scrolling and zooming capabilities.

## Features

- 🎯 **Headless by default** - Full control over styling
- 📅 **Smooth scrolling** - Navigate through time seamlessly
- 🔍 **Continuous zoom** - Smooth, relative zoom without steps
- ⚛️ **React support** - First-class React components
- 🎨 **Styling flexibility** - Works with any CSS framework (Tailwind, MUI, etc.)
- 📦 **TypeScript first** - Full type safety
- 🚀 **Framework-agnostic core** - Use with any framework

## Installation

```bash
npm install @mq/timeline-calendar
```

## Quick Start

```tsx
import { TimelineCalendar, TimelineItem } from '@mq/timeline-calendar/react';

function App() {
  return (
    <TimelineCalendar
      startDate={new Date('2025-01-01')}
      endDate={new Date('2025-12-31')}
    >
      <TimelineItem
        startTime={new Date('2025-03-15')}
        duration={7 * 24 * 60 * 60 * 1000}
      >
        <div>My Event</div>
      </TimelineItem>
    </TimelineCalendar>
  );
}
```

## Documentation

Coming soon...

## License

MIT
