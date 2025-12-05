import React, { useState } from "react";
import {
  TimelineCalendar,
  TimelineItem,
  fiFI,
  TimelineRow,
  TimelineRowGroup,
  TimelinePinpoint,
  TimelinePinpointGroup,
} from "../../src/react";

type ThemeMode = "light" | "dark";

// Date range presets for demonstrating smooth animation
const dateRanges = {
  "3 Years": { start: new Date("2024-01-01"), end: new Date("2026-12-31") },
  "2025 Only": { start: new Date("2025-01-01"), end: new Date("2025-12-31") },
  "Q1 2025": { start: new Date("2025-01-01"), end: new Date("2025-03-31") },
  "January 2025": { start: new Date("2025-01-01"), end: new Date("2025-01-31") },
  "This Week": {
    start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    end: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
  },
};

function App() {
  const [viewport, setViewport] = useState({ start: "", end: "" });
  const [zoom, setZoom] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  // State for date range (demonstrates smooth animation on change)
  const [dateRange, setDateRange] = useState(dateRanges["3 Years"]);

  // State for draggable items (horizontal only) - overlapping to demonstrate dynamic detection
  const [dragItemTime, setDragItemTime] = useState(new Date("2025-04-10"));
  const [dragItemTime2, setDragItemTime2] = useState(new Date("2025-04-20")); // Overlaps with first item

  // State for drag events
  const [dragEvents, setDragEvents] = useState<string[]>([]);

  return (
    <div>
      <h1>Timeline Calendar Demo</h1>

      {/* Date Range Controls - demonstrates smooth scroll/zoom animation */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: "bold", alignSelf: "center" }}>Jump to:</span>
        {Object.entries(dateRanges).map(([label, range]) => (
          <button
            key={label}
            onClick={() => setDateRange(range)}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              backgroundColor: dateRange === range ? "#3b82f6" : "#e5e7eb",
              color: dateRange === range ? "white" : "black",
              border: "none",
              borderRadius: "4px",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="timeline-wrapper">
        <TimelineCalendar
          startDate={dateRange.start}
          endDate={dateRange.end}
          animateDateChanges={true}
          animationDuration={500}
          width="100%"
          height="1000px"
          minZoom="1000 years" // Maximum time span to display
          maxZoom="100 milliseconds" // Minimum time span to display
          showNavigation={false}
          showCurrentTime={true} // Show current time line with auto-refresh
          locale={fiFI} // Use Finnish locale
          theme={themeMode} // Use theme name: 'light' or 'dark'
          availability={{
            // Weekly pattern: define working hours for each day
            weekly: {
              1: [{ start: "08:00", end: "17:30" }], // Monday
              2: [{ start: "09:00", end: "16:00" }], // Tuesday
              3: [{ start: "08:00", end: "17:30" }], // Wednesday
              4: [{ start: "09:00", end: "16:00" }], // Thursday
              5: [{ start: "08:00", end: "15:00" }], // Friday
            },
            unavailableStyle: {
              backgroundColor:
                themeMode === "dark"
                  ? "rgba(0, 0, 0, 0.3)" // Darker overlay in dark mode
                  : "rgba(156, 163, 175, 0.12)", // Light gray in light mode
            },
          }}
          onViewportChange={(start, end) => {
            setViewport({
              start: start.toLocaleDateString(),
              end: end.toLocaleDateString(),
            });
          }}
          onZoomChange={(pixelsPerMs) => {
            setZoom(pixelsPerMs);
          }}
        >
          {/* Wrap all rows in a single TimelineRowGroup for proper positioning */}
          <TimelineRowGroup>
            {/* Position-Only Items Demo (No duration, CSS-controlled width with alignment) */}
            <TimelineRow
              id="position-markers"
              rowCount={3}
              collapsible={false}
              showHeader={false}
            >
              {/* Left-aligned markers */}
              <TimelineItem startTime="2025-06-05" align="left" row={0}>
                <div
                  className="timeline-item red"
                  style={{
                    padding: "4px 8px",
                    width: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  ← Left Aligned
                </div>
              </TimelineItem>
            </TimelineRow>

            {/* Pinpoint Markers Demo with Clustering */}
            <TimelineRow
              id="pinpoints-demo"
              label="Events & Milestones (Pinpoints with Clustering)"
              rowCount={1}
              collapsible={true}
              defaultExpanded={true}
            >
              <TimelinePinpointGroup row={0} clusterDistance={30}>
                {/* Some pinpoints close together (will cluster when zoomed out) */}
                <TimelinePinpoint
                  time="2025-02-10T10:00:00"
                  color="#10b981"
                  data={{ type: "inspection", name: "Safety Inspection" }}
                >
                  ✓
                </TimelinePinpoint>
                <TimelinePinpoint
                  time="2025-02-10T14:30:00"
                  color="#3b82f6"
                  data={{ type: "meeting", name: "Team Meeting" }}
                >
                  👥
                </TimelinePinpoint>
                <TimelinePinpoint
                  time="2025-02-11T09:00:00"
                  color="#f59e0b"
                  data={{ type: "maintenance", name: "Equipment Check" }}
                >
                  🔧
                </TimelinePinpoint>

                {/* Some spread out pinpoints */}
                <TimelinePinpoint
                  time="2025-02-15T12:00:00"
                  color="#ef4444"
                  data={{ type: "deadline", name: "Project Deadline" }}
                >
                  !
                </TimelinePinpoint>
                <TimelinePinpoint
                  time="2025-02-20T08:00:00"
                  color="#8b5cf6"
                  data={{ type: "training", name: "Staff Training" }}
                >
                  📚
                </TimelinePinpoint>

                {/* Another cluster */}
                <TimelinePinpoint
                  time="2025-03-05T10:00:00"
                  color="#10b981"
                  data={{ type: "inspection", name: "Quality Check" }}
                >
                  ✓
                </TimelinePinpoint>
                <TimelinePinpoint
                  time="2025-03-05T11:00:00"
                  color="#3b82f6"
                  data={{ type: "meeting", name: "Client Review" }}
                >
                  👥
                </TimelinePinpoint>
                <TimelinePinpoint
                  time="2025-03-05T15:00:00"
                  color="#f59e0b"
                  data={{ type: "maintenance", name: "System Update" }}
                >
                  🔧
                </TimelinePinpoint>
                <TimelinePinpoint
                  time="2025-03-06T09:30:00"
                  color="#ef4444"
                  data={{ type: "audit", name: "Compliance Audit" }}
                >
                  📋
                </TimelinePinpoint>

                {/* More spread out events */}
                <TimelinePinpoint
                  time="2025-04-12T14:00:00"
                  color="#06b6d4"
                  data={{ type: "release", name: "Product Launch" }}
                >
                  🚀
                </TimelinePinpoint>
                <TimelinePinpoint
                  time="2025-05-20T10:00:00"
                  color="#ec4899"
                  data={{ type: "review", name: "Quarterly Review" }}
                >
                  📊
                </TimelinePinpoint>

                {/* Dense cluster to demonstrate clustering */}
                <TimelinePinpoint time="2025-06-01T08:00:00" color="#10b981">
                  ✓
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-06-01T09:00:00" color="#3b82f6">
                  👥
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-06-01T10:00:00" color="#f59e0b">
                  🔧
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-06-01T11:00:00" color="#ef4444">
                  !
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-06-01T14:00:00" color="#8b5cf6">
                  📚
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-06-01T15:00:00" color="#06b6d4">
                  🚀
                </TimelinePinpoint>
              </TimelinePinpointGroup>
            </TimelineRow>

            {/* Pinpoint Customization Demo - Different sizes, alignments, and line styles */}
            <TimelineRow
              id="pinpoints-custom"
              label="Pinpoint Customization (Size, Alignment, Line Styles)"
              rowCount={2}
              collapsible={true}
              defaultExpanded={true}
            >
              {/* Row 0: Group-level defaults - all pinpoints inherit size and line props */}
              <TimelinePinpointGroup
                row={0}
                clusterDistance={30}
                clusterSize={32}
                clusterColor="#ec4899"
                pinpointSize={16}
                pinpointLineWidth={3}
                pinpointLineLength={25}
              >
                <TimelinePinpoint time="2025-03-01T10:00:00" color="#10b981">
                  ✓
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-03-01T11:00:00" color="#3b82f6">
                  👥
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-03-01T12:00:00" color="#f59e0b">
                  🔧
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-03-01T13:00:00" color="#ef4444">
                  !
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-03-05T10:00:00" color="#8b5cf6">
                  📚
                </TimelinePinpoint>
              </TimelinePinpointGroup>

              {/* Row 1: Individual overrides - specific pinpoints override group defaults */}
              <TimelinePinpointGroup
                row={1}
                clusterDistance={30}
                pinpointSize={24}
                pinpointLineWidth={2}
              >
                <TimelinePinpoint
                  time="2025-04-01T10:00:00"
                  color="#10b981"
                  size={16}
                >
                  ✓
                </TimelinePinpoint>
                <TimelinePinpoint time="2025-04-05T10:00:00" color="#3b82f6">
                  👥
                </TimelinePinpoint>
                <TimelinePinpoint
                  alignment="bottom"
                  time="2025-04-10T10:00:00"
                  lineLength={15}
                  color="#f59e0b"
                  size={32}
                >
                  🔧
                </TimelinePinpoint>
              </TimelinePinpointGroup>
            </TimelineRow>

            {/* Collapsible row with header */}
            <TimelineRow
              id="line-a"
              label="Production Line A"
              rowCount={2}
              collapsible={true}
              defaultExpanded={true}
            >
              <TimelineItem startTime="2025-03-10" duration="5 days" row={0}>
                <div className="timeline-item blue">Order #1234</div>
              </TimelineItem>

              <TimelineItem startTime="2025-03-18" duration="3 days" row={0}>
                <div className="timeline-item green">Order #1235</div>
              </TimelineItem>

              <TimelineItem startTime="2025-03-25" duration="1 week" row={1}>
                <div className="timeline-item orange">Order #1236</div>
              </TimelineItem>
            </TimelineRow>

            {/* Collapsible row with header */}
            <TimelineRow
              id="line-b"
              label="Production Line B"
              rowCount={1}
              collapsible={true}
              defaultExpanded={true}
            >
              <TimelineItem startTime="2025-03-12" duration="4 days" row={0}>
                <div className="timeline-item purple">Order #1240</div>
              </TimelineItem>

              <TimelineItem startTime="2025-03-20" duration="6 days" row={0}>
                <div className="timeline-item cyan">Order #1241</div>
              </TimelineItem>
            </TimelineRow>

            {/* Collapsible row, collapsed by default */}
            <TimelineRow
              id="line-c"
              label="Production Line C"
              rowCount={1}
              collapsible={true}
              defaultExpanded={false}
            >
              <TimelineItem startTime="2025-03-15" duration="2 days" row={0}>
                <div className="timeline-item red">Order #1250</div>
              </TimelineItem>
            </TimelineRow>

            {/* Simple row without collapse functionality, but with header visible */}
            <TimelineRow
              id="line-d"
              label="Production Line D (Simple)"
              rowCount={2}
              collapsible={false}
              showHeader={true}
            >
              <TimelineItem startTime="2025-03-08" duration="1 week" row={0}>
                <div className="timeline-item blue">Order #1260</div>
              </TimelineItem>

              <TimelineItem startTime="2025-03-16" duration="5 days" row={1}>
                <div className="timeline-item green">Order #1261</div>
              </TimelineItem>
            </TimelineRow>

            {/* Drag & Drop Demo Row - Horizontal Only with Dynamic Overlap Detection */}
            <TimelineRow
              id="drag-demo"
              label="Drag & Drop Demo (Horizontal) - Drag to see dynamic overlap!"
              rowCount={1}
              collapsible={true}
              defaultExpanded={true}
            >
              <TimelineItem
                id="drag-item-1"
                startTime={dragItemTime}
                duration="5 days"
                row={0}
                draggable={true}
                onDragStart={(timestamp, row, rowGroupId) => {
                  setDragEvents((prev) => [
                    `[${new Date().toLocaleTimeString()}] onDragStart: ${new Date(
                      timestamp
                    ).toLocaleString()}, row ${row}, group ${rowGroupId}`,
                    ...prev.slice(0, 19), // Keep last 20 events
                  ]);
                }}
                onDrag={(currentTimestamp, currentRow, currentRowGroupId) => {
                  setDragEvents((prev) => [
                    `[${new Date().toLocaleTimeString()}] onDrag: ${new Date(
                      currentTimestamp
                    ).toLocaleString()}, row ${currentRow}, group ${currentRowGroupId}`,
                    ...prev.slice(0, 19),
                  ]);
                }}
                onDragEnd={(
                  newTimestamp,
                  originalTimestamp,
                  newRow,
                  originalRow,
                  newRowGroupId,
                  originalRowGroupId
                ) => {
                  setDragItemTime(new Date(newTimestamp));
                  setDragEvents((prev) => [
                    `[${new Date().toLocaleTimeString()}] onDragEnd: ${new Date(
                      newTimestamp
                    ).toLocaleString()}, row ${newRow}, group ${newRowGroupId} (was: row ${originalRow}, group ${originalRowGroupId})`,
                    ...prev.slice(0, 19),
                  ]);
                }}
              >
                <div
                  className="timeline-item purple"
                  style={{ border: "2px dashed #a855f7" }}
                >
                  Drag Me Horizontally!
                </div>
              </TimelineItem>

              <TimelineItem
                id="drag-item-2"
                startTime={dragItemTime2}
                duration="3 days"
                row={0}
                draggable={true}
                onDragStart={(timestamp, row, rowGroupId) => {
                  setDragEvents((prev) => [
                    `[${new Date().toLocaleTimeString()}] onDragStart: ${new Date(
                      timestamp
                    ).toLocaleString()}, row ${row}, group ${rowGroupId}`,
                    ...prev.slice(0, 19), // Keep last 20 events
                  ]);
                }}
                onDrag={(currentTimestamp, currentRow, currentRowGroupId) => {
                  setDragEvents((prev) => [
                    `[${new Date().toLocaleTimeString()}] onDrag: ${new Date(
                      currentTimestamp
                    ).toLocaleString()}, row ${currentRow}, group ${currentRowGroupId}`,
                    ...prev.slice(0, 19),
                  ]);
                }}
                onDragEnd={(
                  newTimestamp,
                  originalTimestamp,
                  newRow,
                  originalRow,
                  newRowGroupId,
                  originalRowGroupId
                ) => {
                  setDragItemTime2(new Date(newTimestamp));
                  setDragEvents((prev) => [
                    `[${new Date().toLocaleTimeString()}] onDragEnd: ${new Date(
                      newTimestamp
                    ).toLocaleString()}, row ${newRow}, group ${newRowGroupId} (was: row ${originalRow}, group ${originalRowGroupId})`,
                    ...prev.slice(0, 19),
                  ]);
                }}
              >
                <div
                  className="timeline-item purple"
                  style={{ border: "2px dashed #a855f7" }}
                >
                  Drag Me Horizontally!
                </div>
              </TimelineItem>
            </TimelineRow>

            {/* Overlapping Items Demo Row */}
            <TimelineRow
              id="overlap-demo"
              label="Overlapping Items Demo"
              rowCount={3}
              collapsible={true}
              defaultExpanded={true}
            >
              {/* Row 0: Two overlapping items */}
              <TimelineItem
                key="overlap-1-1"
                startTime="2025-04-01"
                duration="10 days"
                row={0}
              >
                <div className="timeline-item blue">Task A (10 days)</div>
              </TimelineItem>

              <TimelineItem
                key="overlap-1-2"
                startTime="2025-04-05"
                duration="8 days"
                row={0}
              >
                <div className="timeline-item green">Task B (8 days)</div>
              </TimelineItem>

              {/* Row 1: Three overlapping items */}
              <TimelineItem
                key="overlap-2-1"
                startTime="2025-04-15"
                duration="12 days"
                row={1}
              >
                <div className="timeline-item orange">Project X</div>
              </TimelineItem>

              <TimelineItem
                key="overlap-2-2"
                startTime="2025-04-18"
                duration="10 days"
                row={1}
              >
                <div className="timeline-item purple">Project Y</div>
              </TimelineItem>

              <TimelineItem
                key="overlap-2-3"
                startTime="2025-04-22"
                duration="8 days"
                row={1}
              >
                <div className="timeline-item cyan">Project Z</div>
              </TimelineItem>

              {/* Row 2: Four overlapping items (like the screenshot) */}
              <TimelineItem
                key="overlap-3-1"
                startTime="2025-05-01"
                duration="5 days"
                row={2}
              >
                <div
                  className="timeline-item"
                  style={{ backgroundColor: "#059669", color: "white" }}
                >
                  Fire Alarm System Test
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-3-2"
                startTime="2025-05-02"
                duration="4 days"
                row={2}
              >
                <div
                  className="timeline-item"
                  style={{ backgroundColor: "#2563eb", color: "white" }}
                >
                  Industrial Motor Wiring
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-3-3"
                startTime="2025-05-03"
                duration="3 days"
                row={2}
              >
                <div
                  className="timeline-item"
                  style={{ backgroundColor: "#16a34a", color: "white" }}
                >
                  Medical Clinic Installation
                </div>
              </TimelineItem>

              <TimelineItem
                key="overlap-3-4"
                startTime="2025-05-04"
                duration="2 days"
                row={2}
              >
                <div
                  className="timeline-item"
                  style={{ backgroundColor: "#ea580c", color: "white" }}
                >
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
          <li>
            <code>Mouse Wheel</code> - Scroll horizontally
          </li>
          <li>
            <code>Ctrl/Cmd + Mouse Wheel</code> - Zoom in/out (smooth,
            continuous)
          </li>
          <li>Zoom is centered on your cursor position</li>
        </ul>
        <h2 style={{ marginTop: "15px" }}>Theme:</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setThemeMode("light")}
            style={{
              padding: "8px 16px",
              background: themeMode === "light" ? "#3b82f6" : "#e5e7eb",
              color: themeMode === "light" ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Light
          </button>
          <button
            onClick={() => setThemeMode("dark")}
            style={{
              padding: "8px 16px",
              background: themeMode === "dark" ? "#3b82f6" : "#e5e7eb",
              color: themeMode === "dark" ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Dark
          </button>
        </div>
        <h2 style={{ marginTop: "15px" }}>Current State:</h2>
        <ul>
          <li>
            Viewport: {viewport.start} to {viewport.end}
          </li>
          <li>Zoom: {zoom.toFixed(8)} pixels/ms</li>
          <li>Required for full year: ~0.0000444 pixels/ms</li>
        </ul>
        <h2 style={{ marginTop: "15px" }}>Drag Events:</h2>
        <div
          style={{
            maxHeight: "150px",
            overflowY: "auto",
            background: "#f5f5f5",
            padding: "8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        >
          {dragEvents.length === 0 ? (
            <div style={{ color: "#999" }}>
              No drag events yet. Try dragging the item in "Drag & Drop Demo"!
            </div>
          ) : (
            dragEvents.map((event, i) => (
              <div key={i} style={{ marginBottom: "4px" }}>
                {event}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
