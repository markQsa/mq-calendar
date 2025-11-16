import React, { useEffect } from 'react';
import { usePanelGroup } from './PanelGroup';
import './CollapsiblePanel.css';

interface CollapsiblePanelProps {
  id: string; // Unique identifier for this panel
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  rowCount?: number; // Number of rows this panel occupies (default: 1)
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  id,
  title,
  children,
  defaultExpanded = true,
  rowCount = 1
}) => {
  const { registerPanel, getPanelPosition, getPanelExpanded, togglePanel } = usePanelGroup();

  // Register this panel on mount
  useEffect(() => {
    registerPanel(id, rowCount, defaultExpanded);
  }, [id, rowCount, defaultExpanded, registerPanel]);

  const isExpanded = getPanelExpanded(id);
  const startRow = getPanelPosition(id);

  // Use the same row height calculation as TimelineItem
  const rowHeight = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--timeline-row-height') || '60');
  const headerHeight = 40;
  const top = startRow * rowHeight;
  const contentTop = top + headerHeight;
  const contentHeight = isExpanded ? (rowCount * rowHeight) : 0;

  return (
    <>
      {/* Panel header */}
      <div
        className="collapsible-panel-header"
        style={{
          top,
          height: headerHeight
        }}
        onClick={() => togglePanel(id)}
      >
        <span className="collapsible-panel-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="collapsible-panel-title">{title}</span>
      </div>

      {/* Panel content area - serves as background, children position absolutely in timeline */}
      {isExpanded && (
        <>
          {/* Background for panel content */}
          <div
            className="collapsible-panel-content"
            style={{
              top: contentTop,
              height: contentHeight
            }}
          />

          {/* Timeline items - positioned absolutely relative to timeline, offset by panel position */}
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && typeof child.props.row === 'number') {
              const itemGap = 8; // 4px top + 4px bottom gap
              const itemHeight = rowHeight - itemGap;

              // Calculate the pixel offset: startRow * rowHeight (panel start) + headerHeight + child row * rowHeight + top gap
              const topPixels = startRow * rowHeight + headerHeight + child.props.row * rowHeight + (itemGap / 2);
              // Convert back to row units for TimelineItem
              const absoluteRow = topPixels / rowHeight;

              return React.cloneElement(child as React.ReactElement<any>, {
                row: absoluteRow,
                style: {
                  ...child.props.style,
                  height: `${itemHeight}px`,
                  margin: 0
                }
              });
            }
            return child;
          })}
        </>
      )}
    </>
  );
};
