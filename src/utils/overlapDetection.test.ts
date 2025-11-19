import { describe, it, expect } from 'vitest';
import { hasTimeOverlap, assignSubRows, detectOverlapsAndAssignSubRows, type TimeRangeItem } from './overlapDetection';

describe('overlapDetection', () => {
  describe('hasTimeOverlap', () => {
    it('should detect true overlap', () => {
      // Item 1: 0-100, Item 2: 50-150 -> overlaps
      expect(hasTimeOverlap(0, 100, 50, 150)).toBe(true);
    });

    it('should detect overlap when one contains the other', () => {
      // Item 1: 0-200, Item 2: 50-150 -> overlaps
      expect(hasTimeOverlap(0, 200, 50, 150)).toBe(true);
      // Item 1: 50-150, Item 2: 0-200 -> overlaps
      expect(hasTimeOverlap(50, 150, 0, 200)).toBe(true);
    });

    it('should not detect overlap when items just touch', () => {
      // Item 1: 0-100, Item 2: 100-200 -> no overlap (touching)
      expect(hasTimeOverlap(0, 100, 100, 200)).toBe(false);
      // Item 1: 100-200, Item 2: 0-100 -> no overlap (touching)
      expect(hasTimeOverlap(100, 200, 0, 100)).toBe(false);
    });

    it('should not detect overlap when items are separate', () => {
      // Item 1: 0-50, Item 2: 100-200 -> no overlap
      expect(hasTimeOverlap(0, 50, 100, 200)).toBe(false);
      // Item 1: 100-200, Item 2: 0-50 -> no overlap
      expect(hasTimeOverlap(100, 200, 0, 50)).toBe(false);
    });

    it('should handle identical ranges', () => {
      // Item 1: 0-100, Item 2: 0-100 -> overlaps
      expect(hasTimeOverlap(0, 100, 0, 100)).toBe(true);
    });

    it('should handle zero duration items', () => {
      // Item 1: 50-50 (zero duration point), Item 2: 0-100 -> overlaps (point is within range)
      expect(hasTimeOverlap(50, 50, 0, 100)).toBe(true);
      // Item 1: 0-100, Item 2: 50-50 (zero duration point) -> overlaps (point is within range)
      expect(hasTimeOverlap(0, 100, 50, 50)).toBe(true);
      // Both zero duration at same point -> no overlap (two points, no range to overlap)
      expect(hasTimeOverlap(50, 50, 50, 50)).toBe(false);
      // Zero duration at edge (exactly at start) -> no overlap (touching at boundary)
      expect(hasTimeOverlap(0, 0, 0, 100)).toBe(false);
      // Zero duration at edge (exactly at end) -> no overlap (touching at boundary)
      expect(hasTimeOverlap(100, 100, 0, 100)).toBe(false);
    });
  });

  describe('assignSubRows', () => {
    it('should handle empty array', () => {
      const items: TimeRangeItem[] = [];
      const result = assignSubRows(items);
      expect(result.size).toBe(0);
    });

    it('should handle single item', () => {
      const items: TimeRangeItem[] = [
        { id: 'item1', startTime: 0, endTime: 100 }
      ];
      const result = assignSubRows(items);
      expect(result.size).toBe(1);
      expect(result.get('item1')).toEqual({
        id: 'item1',
        subRow: 0,
        subRowCount: 1
      });
    });

    it('should handle non-overlapping items', () => {
      const items: TimeRangeItem[] = [
        { id: 'item1', startTime: 0, endTime: 50 },
        { id: 'item2', startTime: 50, endTime: 100 },
        { id: 'item3', startTime: 100, endTime: 150 }
      ];
      const result = assignSubRows(items);

      expect(result.size).toBe(3);
      // All items should be in the same sub-row (0)
      expect(result.get('item1')?.subRow).toBe(0);
      expect(result.get('item2')?.subRow).toBe(0);
      expect(result.get('item3')?.subRow).toBe(0);
      // All items should have subRowCount of 1
      expect(result.get('item1')?.subRowCount).toBe(1);
      expect(result.get('item2')?.subRowCount).toBe(1);
      expect(result.get('item3')?.subRowCount).toBe(1);
    });

    it('should handle two overlapping items', () => {
      const items: TimeRangeItem[] = [
        { id: 'item1', startTime: 0, endTime: 100 },
        { id: 'item2', startTime: 50, endTime: 150 }
      ];
      const result = assignSubRows(items);

      expect(result.size).toBe(2);
      // Items should be in different sub-rows
      expect(result.get('item1')?.subRow).toBe(0);
      expect(result.get('item2')?.subRow).toBe(1);
      // Both should have subRowCount of 2
      expect(result.get('item1')?.subRowCount).toBe(2);
      expect(result.get('item2')?.subRowCount).toBe(2);
    });

    it('should handle three overlapping items', () => {
      const items: TimeRangeItem[] = [
        { id: 'item1', startTime: 0, endTime: 150 },
        { id: 'item2', startTime: 50, endTime: 200 },
        { id: 'item3', startTime: 100, endTime: 250 }
      ];
      const result = assignSubRows(items);

      expect(result.size).toBe(3);
      // All items should have subRowCount of 3
      expect(result.get('item1')?.subRowCount).toBe(3);
      expect(result.get('item2')?.subRowCount).toBe(3);
      expect(result.get('item3')?.subRowCount).toBe(3);
      // Items should be in different sub-rows
      const subRows = [
        result.get('item1')?.subRow,
        result.get('item2')?.subRow,
        result.get('item3')?.subRow
      ];
      // All sub-rows should be different
      expect(new Set(subRows).size).toBe(3);
      // Sub-rows should be 0, 1, 2
      expect(subRows.sort()).toEqual([0, 1, 2]);
    });

    it('should handle nested overlapping items', () => {
      // Large item contains two smaller items
      const items: TimeRangeItem[] = [
        { id: 'large', startTime: 0, endTime: 300 },
        { id: 'small1', startTime: 50, endTime: 100 },
        { id: 'small2', startTime: 200, endTime: 250 }
      ];
      const result = assignSubRows(items);

      expect(result.size).toBe(3);
      // Large item should be in sub-row 0 (starts first)
      expect(result.get('large')?.subRow).toBe(0);
      // small1 should be in sub-row 1 (overlaps with large)
      expect(result.get('small1')?.subRow).toBe(1);
      // small2 could be in sub-row 1 (doesn't overlap with small1)
      expect(result.get('small2')?.subRow).toBe(1);
      // Should need 2 sub-rows total
      expect(result.get('large')?.subRowCount).toBe(2);
      expect(result.get('small1')?.subRowCount).toBe(2);
      expect(result.get('small2')?.subRowCount).toBe(2);
    });

    it('should handle complex overlap pattern', () => {
      // Pattern: 1 overlaps 2, 2 overlaps 3, but 1 and 3 don't overlap
      const items: TimeRangeItem[] = [
        { id: 'item1', startTime: 0, endTime: 100 },
        { id: 'item2', startTime: 50, endTime: 150 },
        { id: 'item3', startTime: 100, endTime: 200 }
      ];
      const result = assignSubRows(items);

      expect(result.size).toBe(3);
      // item1 should be in sub-row 0
      expect(result.get('item1')?.subRow).toBe(0);
      // item2 should be in sub-row 1 (overlaps with item1)
      expect(result.get('item2')?.subRow).toBe(1);
      // item3 could be in sub-row 0 (doesn't overlap with item1, only touches)
      expect(result.get('item3')?.subRow).toBe(0);
      // Should need 2 sub-rows total
      expect(result.get('item1')?.subRowCount).toBe(2);
      expect(result.get('item2')?.subRowCount).toBe(2);
      expect(result.get('item3')?.subRowCount).toBe(2);
    });

    it('should handle items with same start time', () => {
      const items: TimeRangeItem[] = [
        { id: 'item1', startTime: 0, endTime: 100 },
        { id: 'item2', startTime: 0, endTime: 150 },
        { id: 'item3', startTime: 0, endTime: 200 }
      ];
      const result = assignSubRows(items);

      expect(result.size).toBe(3);
      // All items overlap, so need 3 sub-rows
      expect(result.get('item1')?.subRowCount).toBe(3);
      expect(result.get('item2')?.subRowCount).toBe(3);
      expect(result.get('item3')?.subRowCount).toBe(3);
      // All should be in different sub-rows
      const subRows = [
        result.get('item1')?.subRow,
        result.get('item2')?.subRow,
        result.get('item3')?.subRow
      ];
      expect(new Set(subRows).size).toBe(3);
    });

    it('should handle many items with minimal overlap', () => {
      // Pattern: items slightly overlap like shingles
      const items: TimeRangeItem[] = [
        { id: 'item1', startTime: 0, endTime: 60 },
        { id: 'item2', startTime: 50, endTime: 110 },
        { id: 'item3', startTime: 100, endTime: 160 },
        { id: 'item4', startTime: 150, endTime: 210 }
      ];
      const result = assignSubRows(items);

      expect(result.size).toBe(4);
      // Should need 2 sub-rows (items 1&3 in one, items 2&4 in another)
      expect(result.get('item1')?.subRowCount).toBe(2);
      expect(result.get('item2')?.subRowCount).toBe(2);
      expect(result.get('item3')?.subRowCount).toBe(2);
      expect(result.get('item4')?.subRowCount).toBe(2);

      // item1 and item3 should be in same sub-row (no overlap)
      expect(result.get('item1')?.subRow).toBe(result.get('item3')?.subRow);
      // item2 and item4 should be in same sub-row (no overlap)
      expect(result.get('item2')?.subRow).toBe(result.get('item4')?.subRow);
      // item1 and item2 should be in different sub-rows
      expect(result.get('item1')?.subRow).not.toBe(result.get('item2')?.subRow);
    });

    it('should handle real-world scenario from screenshot', () => {
      // Based on the screenshot: multiple items in same time range
      const items: TimeRangeItem[] = [
        { id: 'fire-alarm', startTime: 0, endTime: 100 },
        { id: 'industrial-motor', startTime: 0, endTime: 100 },
        { id: 'another-task', startTime: 0, endTime: 100 }
      ];
      const result = assignSubRows(items);

      expect(result.size).toBe(3);
      // All overlap completely, need 3 sub-rows
      expect(result.get('fire-alarm')?.subRowCount).toBe(3);
      expect(result.get('industrial-motor')?.subRowCount).toBe(3);
      expect(result.get('another-task')?.subRowCount).toBe(3);
      // Each should be in different sub-row
      const subRows = [
        result.get('fire-alarm')?.subRow,
        result.get('industrial-motor')?.subRow,
        result.get('another-task')?.subRow
      ];
      expect(new Set(subRows).size).toBe(3);
      expect(subRows.sort()).toEqual([0, 1, 2]);
    });
  });

  describe('detectOverlapsAndAssignSubRows', () => {
    it('should be an alias for assignSubRows', () => {
      const items: TimeRangeItem[] = [
        { id: 'item1', startTime: 0, endTime: 100 },
        { id: 'item2', startTime: 50, endTime: 150 }
      ];
      const result1 = assignSubRows(items);
      const result2 = detectOverlapsAndAssignSubRows(items);

      expect(result1).toEqual(result2);
    });
  });
});
