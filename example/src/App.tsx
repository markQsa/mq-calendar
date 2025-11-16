import React, { useState } from 'react';
import { TimelineCalendar, TimelineItem, fiFI } from '../../src/react';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import { PanelGroup } from './components/PanelGroup';

function App() {
  const [viewport, setViewport] = useState({ start: '', end: '' });
  const [zoom, setZoom] = useState(0);

  return (
    <div>
      <h1>Timeline Calendar Demo</h1>

      <div className="info">
        <h2>Controls:</h2>
        <ul>
          <li><code>Mouse Wheel</code> - Scroll horizontally</li>
          <li><code>Ctrl/Cmd + Mouse Wheel</code> - Zoom in/out (smooth, continuous)</li>
          <li>Zoom is centered on your cursor position</li>
        </ul>
        <h2 style={{ marginTop: '15px' }}>Current State:</h2>
        <ul>
          <li>Viewport: {viewport.start} to {viewport.end}</li>
          <li>Zoom: {zoom.toFixed(8)} pixels/ms</li>
          <li>Required for full year: ~0.0000444 pixels/ms</li>
        </ul>
      </div>

      <div className="timeline-wrapper">
        <TimelineCalendar
          startDate={new Date('2024-01-01')}
          endDate={new Date('2026-12-31')}
          width="100%"
          height="600px"
          minZoom="1000 years"   // Maximum time span to display
          maxZoom="100 milliseconds"   // Minimum time span to display
          showNavigation={false}
          showCurrentTime={true}  // Show current time line with auto-refresh
          locale={fiFI}  // Use Finnish locale
          onViewportChange={(start, end) => {
            setViewport({
              start: start.toLocaleDateString(),
              end: end.toLocaleDateString()
            });
          }}
          onZoomChange={(pixelsPerMs) => {
            setZoom(pixelsPerMs);
          }}
          theme={{
            colors: {
              background: '#ffffff',
              gridLine: '#e5e7eb',
              gridLinePrimary: '#9ca3af',
              headerBackground: '#ffffff',
              headerText: '#374151',
              headerBorder: '#d1d5db',
              currentTimeLine: '#ef4444',  // Bright red for current time line
              timeTypes: {
                century: { text: '#1f2937', line: '#1f2937' },
                decade: { text: '#374151', line: '#374151' },
                year: { text: '#4b5563', line: '#4b5563' },
                month: { text: '#6b7280', line: '#6b7280' },
                week: { text: '#6b7280', line: '#6b7280' },
                day: { text: '#9ca3af', line: '#9ca3af' },
                halfday: { text: '#9ca3af', line: '#9ca3af' },
                quarterday: { text: '#9ca3af', line: '#9ca3af' },
                hour: { text: '#d1d5db', line: '#d1d5db' },
                halfhour: { text: '#d1d5db', line: '#d1d5db' },
                quarterhour: { text: '#d1d5db', line: '#d1d5db' },
                minute: { text: '#e5e7eb', line: '#e5e7eb' },
                halfminute: { text: '#e5e7eb', line: '#e5e7eb' },
                quarterminute: { text: '#e5e7eb', line: '#e5e7eb' },
                second: { text: '#f3f4f6', line: '#f3f4f6' },
                millisecond: { text: '#f9fafb', line: '#f9fafb' },
              }
            },
            spacing: {
              headerHeight: 80,
              headerRowHeight: 40,
              rowHeight: 70,
            }
          }}
        >
          <PanelGroup>
            <CollapsiblePanel id="line-a" title="Production Line A" rowCount={2} defaultExpanded={true}>
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
          </CollapsiblePanel>

          <CollapsiblePanel id="line-b" title="Production Line B" rowCount={1} defaultExpanded={true}>
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
          </CollapsiblePanel>

          <CollapsiblePanel id="line-c" title="Production Line C" rowCount={1} defaultExpanded={false}>
            <TimelineItem
              startTime="2025-03-15"
              duration="2 days"
              row={0}
            >
              <div className="timeline-item red">
                Order #1250
              </div>
            </TimelineItem>
          </CollapsiblePanel>
          </PanelGroup>
        </TimelineCalendar>
      </div>
    </div>
  );
}

export default App;
