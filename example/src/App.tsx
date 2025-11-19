import React, { useState } from 'react';
import { TimelineCalendar, TimelineItem, fiFI, TimelineRow, TimelineRowGroup } from '../../src/react';

type ThemeMode = 'light' | 'dark';

function App() {
  const [viewport, setViewport] = useState({ start: '', end: '' });
  const [zoom, setZoom] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  // State for draggable item (horizontal only)
  const [dragItemTime, setDragItemTime] = useState(new Date('2025-04-10'));

  // State for draggable item (row change allowed)
  const [dragItemTime2, setDragItemTime2] = useState(new Date('2025-05-15'));
  const [dragItemRow2, setDragItemRow2] = useState(0);

  // State for drag events
  const [dragEvents, setDragEvents] = useState<string[]>([]);

  return (
    <div>
      <h1>Timeline Calendar Demo</h1>

      <div className="timeline-wrapper">
        <TimelineCalendar
          startDate={new Date('2024-01-01')}
          endDate={new Date('2026-12-31')}
          width="100%"
          height="1000px"
          minZoom="1000 years"   // Maximum time span to display
          maxZoom="100 milliseconds"   // Minimum time span to display
          showNavigation={false}
          showCurrentTime={true}  // Show current time line with auto-refresh
          locale={fiFI}  // Use Finnish locale
          theme={themeMode}  // Use theme name: 'light' or 'dark'
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
              backgroundColor: themeMode === 'dark'
                ? 'rgba(0, 0, 0, 0.3)'  // Darker overlay in dark mode
                : 'rgba(156, 163, 175, 0.12)', // Light gray in light mode
            }
          }}
          onViewportChange={(start, end) => {
            setViewport({
              start: start.toLocaleDateString(),
              end: end.toLocaleDateString()
            });
          }}
          onZoomChange={(pixelsPerMs) => {
            setZoom(pixelsPerMs);
          }}
        >
          <TimelineRowGroup>
            {/* Collapsible row with header */}
            <TimelineRow id="line-a" label="Production Line A" rowCount={2} collapsible={true} defaultExpanded={true}>
              <TimelineItem
                startTime="2025-03-10"
                duration="5 days"
                row={0}
              >
                <div className="timeline-item blue">
                  Order #1234
                </div>
              </TimelineItem>

              <TimelineItem
                startTime="2025-03-18"
                duration="3 days"
                row={0}
              >
                <div className="timeline-item green">
                  Order #1235
                </div>
              </TimelineItem>

              <TimelineItem
                startTime="2025-03-25"
                duration="1 week"
                row={1}
              >
                <div className="timeline-item orange">
                  Order #1236
                </div>
              </TimelineItem>
            </TimelineRow>

            {/* Collapsible row with header */}
            <TimelineRow id="line-b" label="Production Line B" rowCount={1} collapsible={true} defaultExpanded={true}>
              <TimelineItem
                startTime="2025-03-12"
                duration="4 days"
                row={0}
              >
                <div className="timeline-item purple">
                  Order #1240
                </div>
              </TimelineItem>

              <TimelineItem
                startTime="2025-03-20"
                duration="6 days"
                row={0}
              >
                <div className="timeline-item cyan">
                  Order #1241
                </div>
              </TimelineItem>
            </TimelineRow>

            {/* Collapsible row, collapsed by default */}
            <TimelineRow id="line-c" label="Production Line C" rowCount={1} collapsible={true} defaultExpanded={false}>
              <TimelineItem
                startTime="2025-03-15"
                duration="2 days"
                row={0}
              >
                <div className="timeline-item red">
                  Order #1250
                </div>
              </TimelineItem>
            </TimelineRow>

            {/* Simple row without collapse functionality, but with header visible */}
            <TimelineRow id="line-d" label="Production Line D (Simple)" rowCount={2} collapsible={false} showHeader={true}>
              <TimelineItem
                startTime="2025-03-08"
                duration="1 week"
                row={0}
              >
                <div className="timeline-item blue">
                  Order #1260
                </div>
              </TimelineItem>

              <TimelineItem
                startTime="2025-03-16"
                duration="5 days"
                row={1}
              >
                <div className="timeline-item green">
                  Order #1261
                </div>
              </TimelineItem>
            </TimelineRow>

            {/* Drag & Drop Demo Row - Horizontal Only */}
            <TimelineRow id="drag-demo" label="Drag & Drop Demo (Horizontal)" rowCount={1} collapsible={true} defaultExpanded={true}>
              <TimelineItem
                startTime={dragItemTime}
                duration="5 days"
                row={0}
                draggable={true}
                onDragStart={(timestamp, row, rowGroupId) => {
                  setDragEvents(prev => [
                    `[${new Date().toLocaleTimeString()}] onDragStart: ${new Date(timestamp).toLocaleString()}, row ${row}, group ${rowGroupId}`,
                    ...prev.slice(0, 19) // Keep last 20 events
                  ]);
                }}
                onDrag={(currentTimestamp, currentRow, currentRowGroupId) => {
                  setDragEvents(prev => [
                    `[${new Date().toLocaleTimeString()}] onDrag: ${new Date(currentTimestamp).toLocaleString()}, row ${currentRow}, group ${currentRowGroupId}`,
                    ...prev.slice(0, 19)
                  ]);
                }}
                onDragEnd={(newTimestamp, originalTimestamp, newRow, originalRow, newRowGroupId, originalRowGroupId) => {
                  setDragItemTime(new Date(newTimestamp));
                  setDragEvents(prev => [
                    `[${new Date().toLocaleTimeString()}] onDragEnd: ${new Date(newTimestamp).toLocaleString()}, row ${newRow}, group ${newRowGroupId} (was: row ${originalRow}, group ${originalRowGroupId})`,
                    ...prev.slice(0, 19)
                  ]);
                }}
              >
                <div className="timeline-item purple" style={{ border: '2px dashed #a855f7' }}>
                  Drag Me Horizontally!
                </div>
              </TimelineItem>
            </TimelineRow>

            {/* Overlapping Items Demo Row */}
            <TimelineRow id="overlap-demo" label="Overlapping Items Demo" rowCount={3} collapsible={true} defaultExpanded={true}>
              {/* Row 0: Two overlapping items */}
              <TimelineItem
                key="overlap-1-1"
                startTime="2025-04-01"
                duration="10 days"
                row={0}
              >
                <div className="timeline-item blue">
                  Task A (10 days)
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-1-2"
                startTime="2025-04-05"
                duration="8 days"
                row={0}
              >
                <div className="timeline-item green">
                  Task B (8 days)
                </div>
              </TimelineItem>

              {/* Row 1: Three overlapping items */}
              <TimelineItem
                key="overlap-2-1"
                startTime="2025-04-15"
                duration="12 days"
                row={1}
              >
                <div className="timeline-item orange">
                  Project X
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-2-2"
                startTime="2025-04-18"
                duration="10 days"
                row={1}
              >
                <div className="timeline-item purple">
                  Project Y
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-2-3"
                startTime="2025-04-22"
                duration="8 days"
                row={1}
              >
                <div className="timeline-item cyan">
                  Project Z
                </div>
              </TimelineItem>

              {/* Row 2: Four overlapping items (like the screenshot) */}
              <TimelineItem
                key="overlap-3-1"
                startTime="2025-05-01"
                duration="5 days"
                row={2}
              >
                <div className="timeline-item" style={{ backgroundColor: '#059669', color: 'white' }}>
                  Fire Alarm System Test
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-3-2"
                startTime="2025-05-02"
                duration="4 days"
                row={2}
              >
                <div className="timeline-item" style={{ backgroundColor: '#2563eb', color: 'white' }}>
                  Industrial Motor Wiring
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-3-3"
                startTime="2025-05-03"
                duration="3 days"
                row={2}
              >
                <div className="timeline-item" style={{ backgroundColor: '#16a34a', color: 'white' }}>
                  Medical Clinic Installation
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-3-4"
                startTime="2025-05-04"
                duration="2 days"
                row={2}
              >
                <div className="timeline-item" style={{ backgroundColor: '#ea580c', color: 'white' }}>
                  Train Station Maintenance
                </div>
              </TimelineItem>
            </TimelineRow>

          </TimelineRowGroup>
        </TimelineCalendar>
      </div>

      <div className="info">
        <h2>Controls:</h2>
        <ul>
          <li><code>Mouse Wheel</code> - Scroll horizontally</li>
          <li><code>Ctrl/Cmd + Mouse Wheel</code> - Zoom in/out (smooth, continuous)</li>
          <li>Zoom is centered on your cursor position</li>
        </ul>
        <h2 style={{ marginTop: '15px' }}>Theme:</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setThemeMode('light')}
            style={{
              padding: '8px 16px',
              background: themeMode === 'light' ? '#3b82f6' : '#e5e7eb',
              color: themeMode === 'light' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Light
          </button>
          <button
            onClick={() => setThemeMode('dark')}
            style={{
              padding: '8px 16px',
              background: themeMode === 'dark' ? '#3b82f6' : '#e5e7eb',
              color: themeMode === 'dark' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Dark
          </button>
        </div>
        <h2 style={{ marginTop: '15px' }}>Current State:</h2>
        <ul>
          <li>Viewport: {viewport.start} to {viewport.end}</li>
          <li>Zoom: {zoom.toFixed(8)} pixels/ms</li>
          <li>Required for full year: ~0.0000444 pixels/ms</li>
        </ul>
        <h2 style={{ marginTop: '15px' }}>Drag Events:</h2>
        <div style={{
          maxHeight: '150px',
          overflowY: 'auto',
          background: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {dragEvents.length === 0 ? (
            <div style={{ color: '#999' }}>No drag events yet. Try dragging the item in "Drag & Drop Demo"!</div>
          ) : (
            dragEvents.map((event, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>{event}</div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

export default App;
