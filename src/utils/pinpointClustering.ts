/**
 * Pinpoint clustering utilities for timeline markers
 *
 * This module provides utilities to cluster timeline pinpoints that are too close
 * together at the current zoom level, similar to map marker clustering.
 */

/**
 * Represents a single pinpoint with its position information
 */
export interface PinpointItem {
  /** Unique identifier for the pinpoint */
  id: string | number;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Horizontal position in pixels (calculated from timestamp) */
  pixelPosition: number;
  /** Optional data associated with the pinpoint */
  data?: any;
}

/**
 * Represents a cluster of pinpoints
 */
export interface PinpointCluster {
  /** Unique identifier for the cluster */
  id: string;
  /** Center position in pixels */
  pixelPosition: number;
  /** Average timestamp of all pinpoints in the cluster */
  timestamp: number;
  /** Number of pinpoints in this cluster */
  count: number;
  /** The individual pinpoints in this cluster */
  items: PinpointItem[];
  /** Whether this is a cluster (count > 1) or a single pinpoint */
  isClustered: boolean;
}

/**
 * Clusters pinpoints that are within a certain pixel distance of each other
 *
 * @param pinpoints - Array of pinpoints with pixel positions
 * @param clusterDistance - Pixel distance threshold for clustering (default: 30)
 * @returns Array of clusters
 */
export function clusterPinpoints(
  pinpoints: PinpointItem[],
  clusterDistance: number = 30
): PinpointCluster[] {
  if (pinpoints.length === 0) {
    return [];
  }

  // Sort pinpoints by pixel position
  const sorted = [...pinpoints].sort((a, b) => a.pixelPosition - b.pixelPosition);

  const clusters: PinpointCluster[] = [];
  let currentCluster: PinpointItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];

    // Check if current pinpoint is close enough to the previous one
    if (current.pixelPosition - previous.pixelPosition <= clusterDistance) {
      // Add to current cluster
      currentCluster.push(current);
    } else {
      // Save current cluster and start a new one
      clusters.push(createCluster(currentCluster));
      currentCluster = [current];
    }
  }

  // Don't forget the last cluster
  if (currentCluster.length > 0) {
    clusters.push(createCluster(currentCluster));
  }

  return clusters;
}

/**
 * Creates a cluster object from an array of pinpoints
 */
function createCluster(items: PinpointItem[]): PinpointCluster {
  const count = items.length;
  const isClustered = count > 1;

  // Calculate average position and timestamp
  const totalPosition = items.reduce((sum, item) => sum + item.pixelPosition, 0);
  const totalTimestamp = items.reduce((sum, item) => sum + item.timestamp, 0);

  const avgPosition = totalPosition / count;
  const avgTimestamp = totalTimestamp / count;

  // Generate cluster ID
  const id = isClustered
    ? `cluster-${items.map(i => i.id).join('-')}`
    : `single-${items[0].id}`;

  return {
    id,
    pixelPosition: avgPosition,
    timestamp: avgTimestamp,
    count,
    items,
    isClustered
  };
}

/**
 * Filters pinpoints to only those visible in the current viewport
 *
 * @param pinpoints - Array of pinpoints
 * @param viewportStart - Viewport start in pixels
 * @param viewportEnd - Viewport end in pixels
 * @returns Filtered array of visible pinpoints
 */
export function filterVisiblePinpoints(
  pinpoints: PinpointItem[],
  viewportStart: number,
  viewportEnd: number
): PinpointItem[] {
  return pinpoints.filter(
    p => p.pixelPosition >= viewportStart && p.pixelPosition <= viewportEnd
  );
}
