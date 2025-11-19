import React, { useMemo } from 'react';
import type { TimelinePinpointProps, TimelinePinpointGroupProps } from '../types';
import { useTimelineContext } from './TimelineContext';
import { clusterPinpoints, type PinpointItem, type PinpointCluster } from '../../utils/pinpointClustering';

/**
 * Individual pinpoint marker component
 * Displays a marker at a specific point in time with a vertical line
 */
export const TimelinePinpoint: React.FC<TimelinePinpointProps> = ({
  id,
  time,
  row = 0,
  color,
  size = 24,
  lineWidth = 2,
  lineLength,
  lineStyle = 'solid',
  alignment = 'top',
  className,
  style,
  children,
  data,
  onClick
}) => {
  const { engine, timeConverter, refreshCounter } = useTimelineContext();

  // Calculate horizontal position
  const { left, isVisible } = useMemo(() => {
    if (!engine) return { left: 0, isVisible: false };

    const timestamp = timeConverter.toTimestamp(time);
    const viewport = engine.getViewportState();
    const isVisible = timestamp >= viewport.start && timestamp <= viewport.end;
    const position = engine.timeToPixel(timestamp);

    return { left: position, isVisible };
  }, [engine, timeConverter, time, refreshCounter]);

  // Get row height for calculations
  const rowHeightPx = useMemo(() => {
    return parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
  }, []);

  // Calculate vertical position based on alignment
  const { top, lineTop, calculatedLineHeight } = useMemo(() => {
    const baseTop = row * rowHeightPx;
    const defaultLineLength = lineLength !== undefined ? lineLength : (rowHeightPx / 2);

    switch (alignment) {
      case 'center':
        // Center of row, no line
        return {
          top: baseTop + (rowHeightPx / 2) - (size / 2),
          lineTop: 0,
          calculatedLineHeight: 0
        };

      case 'bottom':
        // Bottom of row, line goes up
        return {
          top: baseTop + rowHeightPx - size,
          lineTop: -defaultLineLength,
          calculatedLineHeight: defaultLineLength
        };

      case 'top':
      default:
        // Top of row, line goes down
        return {
          top: baseTop,
          lineTop: size,
          calculatedLineHeight: defaultLineLength - size
        };
    }
  }, [row, rowHeightPx, alignment, size, lineLength]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const handleClick = () => {
    if (onClick) {
      const timestamp = timeConverter.toTimestamp(time);
      onClick(timestamp, data);
    }
  };

  const pinpointColor = color || 'var(--timeline-pinpoint-color, #3b82f6)';

  // Convert lineStyle to CSS borderStyle
  const borderStyleMap = {
    'solid': 'solid',
    'dashed': 'dashed',
    'dotted': 'dotted'
  };

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 20,
        pointerEvents: 'auto',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={handleClick}
      data-timeline-pinpoint
      data-pinpoint-id={id}
    >
      {/* Vertical line - only show if not center aligned and line height > 0 */}
      {alignment !== 'center' && calculatedLineHeight > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -(lineWidth / 2),
            top: lineTop,
            width: lineWidth,
            height: calculatedLineHeight,
            backgroundColor: lineStyle === 'solid' ? pinpointColor : 'transparent',
            borderLeft: lineStyle !== 'solid' ? `${lineWidth}px ${borderStyleMap[lineStyle]} ${pinpointColor}` : undefined,
            opacity: 0.6
          }}
        />
      )}

      {/* Pinpoint marker - same style as cluster */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: pinpointColor,
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          transform: 'translate(-50%, 0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${size * 0.58}px`,
          color: 'white'
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Renders a cluster marker (when multiple pinpoints are grouped)
 */
const ClusterMarker: React.FC<{
  cluster: PinpointCluster;
  absoluteRow: number;
  color?: string;
  size?: number;
  lineWidth?: number;
  onClick?: () => void;
}> = ({ cluster, absoluteRow, color, size = 24, lineWidth = 2, onClick }) => {
  const rowHeightPx = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--timeline-row-height') || '60');

  // Use absolute row directly (no adjustment needed)
  const top = absoluteRow * rowHeightPx;

  const clusterColor = color || 'var(--timeline-pinpoint-cluster-color, #ef4444)';

  return (
    <div
      style={{
        position: 'absolute',
        left: cluster.pixelPosition,
        top,
        zIndex: 21,
        pointerEvents: 'auto',
        cursor: 'pointer'
      }}
      onClick={onClick}
      data-timeline-cluster
      data-cluster-count={cluster.count}
    >
      {/* Vertical line */}
      <div
        style={{
          position: 'absolute',
          left: -(lineWidth / 2),
          top: size,
          width: lineWidth,
          height: (rowHeightPx / 2) - size,
          backgroundColor: clusterColor,
          opacity: 0.6
        }}
      />

      {/* Cluster marker with count */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: clusterColor,
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          transform: 'translate(-50%, 0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${size * 0.46}px`,
          fontWeight: 'bold',
          color: 'white'
        }}
      >
        {cluster.count}
      </div>
    </div>
  );
};

/**
 * Group container for pinpoints with automatic clustering
 */
export const TimelinePinpointGroup: React.FC<TimelinePinpointGroupProps> = ({
  row = 0,
  clusterDistance = 30,
  clusterColor,
  clusterSize = 24,
  pinpointSize,
  pinpointLineWidth,
  pinpointLineLength,
  onClusterClick,
  children
}) => {
  const { engine, timeConverter, refreshCounter, refresh } = useTimelineContext();

  // Extract pinpoint data from children and calculate pixel positions
  const pinpoints = useMemo((): PinpointItem[] => {
    if (!engine) return [];

    const items: PinpointItem[] = [];

    React.Children.forEach(children, (child, index) => {
      if (React.isValidElement(child) && child.props.time) {
        const timestamp = timeConverter.toTimestamp(child.props.time);
        const pixelPosition = engine.timeToPixel(timestamp);
        const pinpointId = child.props.id || `pinpoint-${index}`;

        items.push({
          id: pinpointId,
          timestamp,
          pixelPosition,
          data: {
            child,
            originalProps: child.props
          }
        });
      }
    });

    return items;
  }, [engine, timeConverter, children, refreshCounter]);

  // Cluster the pinpoints
  const clusters = useMemo(() => {
    return clusterPinpoints(pinpoints, clusterDistance);
  }, [pinpoints, clusterDistance]);

  // Use row directly - TimelineRow has already adjusted it if we're inside one
  const absoluteRow = row;

  // Handle cluster click - zoom in to separate the pinpoints
  const handleClusterClick = async (cluster: PinpointCluster) => {
    if (onClusterClick) {
      onClusterClick(cluster.timestamp, cluster.items.map(i => i.data?.originalProps));
      return;
    }

    // Default behavior: zoom in to separate the pinpoints with smooth animation
    if (engine) {
      const timestamps = cluster.items.map(item => item.timestamp);
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);

      // Calculate time span and add some padding
      const timeSpan = maxTime - minTime;
      const padding = timeSpan > 0 ? timeSpan * 0.5 : 1000 * 60 * 60; // 1 hour if all same time

      // Animate to the range with smooth transition (600ms duration)
      await engine.animateToRange(minTime - padding, maxTime + padding, 600, () => {
        // Called on each animation frame
        refresh();
      });
    }
  };

  return (
    <>
      {/* Fragment - no wrapper div to avoid positioning issues */}
      {clusters.map(cluster => {
        if (cluster.isClustered) {
          // Render cluster marker - pass absolute row
          return (
            <ClusterMarker
              key={cluster.id}
              cluster={cluster}
              absoluteRow={absoluteRow}
              color={clusterColor}
              size={clusterSize}
              lineWidth={pinpointLineWidth}
              onClick={() => handleClusterClick(cluster)}
            />
          );
        } else {
          // Render single pinpoint - pass absolute row and default props
          const item = cluster.items[0];
          const child = item.data?.child;

          if (!React.isValidElement(child)) return null;

          // Cast child.props to access properties safely
          const childProps = child.props as TimelinePinpointProps;

          // Merge group defaults with individual pinpoint props
          const mergedProps: any = {
            key: cluster.id,
            row: absoluteRow, // Use absolute row position
          };

          // Apply group defaults only if not explicitly set on the pinpoint
          if (pinpointSize !== undefined && childProps.size === undefined) {
            mergedProps.size = pinpointSize;
          }
          if (pinpointLineWidth !== undefined && childProps.lineWidth === undefined) {
            mergedProps.lineWidth = pinpointLineWidth;
          }
          if (pinpointLineLength !== undefined && childProps.lineLength === undefined) {
            mergedProps.lineLength = pinpointLineLength;
          }

          return React.cloneElement(child as React.ReactElement<TimelinePinpointProps>, mergedProps);
        }
      })}
    </>
  );
};
