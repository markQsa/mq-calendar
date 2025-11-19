/**
 * Overlap detection and sub-row assignment for timeline items
 *
 * This module provides utilities to detect overlapping timeline items and assign
 * them to sub-rows so they can be displayed without visual overlap.
 */

/**
 * Represents a timeline item with time range information
 */
export interface TimeRangeItem {
  /** Unique identifier for the item */
  id: string | number;
  /** Start timestamp in milliseconds */
  startTime: number;
  /** End timestamp in milliseconds */
  endTime: number;
}

/**
 * Result of sub-row assignment for a single item
 */
export interface SubRowAssignment {
  /** The item's unique identifier */
  id: string | number;
  /** The assigned sub-row index (0-based) */
  subRow: number;
  /** The total number of sub-rows needed for this group */
  subRowCount: number;
}

/**
 * Checks if two time ranges have true overlap (not just touching edges)
 *
 * @param start1 - Start time of first range
 * @param end1 - End time of first range
 * @param start2 - Start time of second range
 * @param end2 - End time of second range
 * @returns true if ranges overlap, false if they don't overlap or just touch
 */
export function hasTimeOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // True overlap means: start of one is before end of other AND vice versa
  // Touching edges (end1 === start2) is NOT considered overlap
  return start1 < end2 && start2 < end1;
}

/**
 * Assigns sub-row indices to items using an interval scheduling algorithm
 * to minimize the number of sub-rows needed.
 *
 * Algorithm:
 * 1. Sort items by start time
 * 2. Maintain a list of active sub-rows (each tracks the end time of its last item)
 * 3. For each item, find the first sub-row where item can fit (no overlap)
 * 4. If no sub-row is available, create a new one
 *
 * @param items - Array of items with time ranges
 * @returns Map of item ID to sub-row assignment
 */
export function assignSubRows(items: TimeRangeItem[]): Map<string | number, SubRowAssignment> {
  const assignments = new Map<string | number, SubRowAssignment>();

  // Handle empty or single item case
  if (items.length === 0) {
    return assignments;
  }

  if (items.length === 1) {
    assignments.set(items[0].id, {
      id: items[0].id,
      subRow: 0,
      subRowCount: 1
    });
    return assignments;
  }

  // Sort items by start time (and by end time as tiebreaker for stability)
  const sortedItems = [...items].sort((a, b) => {
    if (a.startTime !== b.startTime) {
      return a.startTime - b.startTime;
    }
    return a.endTime - b.endTime;
  });

  // Track the end time of the last item placed in each sub-row
  const subRowEndTimes: number[] = [];

  // Assign each item to a sub-row
  for (const item of sortedItems) {
    let assignedSubRow = -1;

    // Try to find an existing sub-row where this item fits
    for (let subRow = 0; subRow < subRowEndTimes.length; subRow++) {
      // Item fits if its start time is >= end time of last item in this sub-row
      // This ensures no overlap (touching is OK)
      if (item.startTime >= subRowEndTimes[subRow]) {
        assignedSubRow = subRow;
        subRowEndTimes[subRow] = item.endTime;
        break;
      }
    }

    // If no existing sub-row works, create a new one
    if (assignedSubRow === -1) {
      assignedSubRow = subRowEndTimes.length;
      subRowEndTimes.push(item.endTime);
    }

    // Store the assignment (subRowCount will be updated later)
    assignments.set(item.id, {
      id: item.id,
      subRow: assignedSubRow,
      subRowCount: 0 // Will be set after all items are assigned
    });
  }

  // Update all assignments with the final sub-row count
  const totalSubRows = subRowEndTimes.length;
  for (const [, assignment] of assignments.entries()) {
    assignment.subRowCount = totalSubRows;
  }

  return assignments;
}

/**
 * Detects overlaps and assigns sub-rows for items in the same row
 *
 * This is the main function to use for timeline row layout.
 *
 * @param items - Array of items with time ranges
 * @returns Map of item ID to sub-row assignment
 */
export function detectOverlapsAndAssignSubRows(
  items: TimeRangeItem[]
): Map<string | number, SubRowAssignment> {
  return assignSubRows(items);
}
