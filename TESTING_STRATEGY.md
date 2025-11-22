# Testing Strategy for Timeline Calendar

## Current Situation

**Test Results**: 12/53 tests failing (77% pass rate)

**Issues**:
- Viewport filtering optimization broke existing tests (items outside viewport don't render)
- No integration tests for critical features
- Missing test coverage for recent features (aggregation, parallel items, render props)
- Tests don't catch regressions when adding new features

## Root Causes of Regressions

1. **Performance optimizations** (viewport filtering) changed rendering behavior without updating tests
2. **No integration tests** - unit tests don't catch component interaction issues
3. **Missing feature coverage** - aggregation, overlap detection, row positioning not tested
4. **Test setup issues** - viewport not configured in tests, causing items to be filtered out

## Testing Strategy

### 1. Fix Existing Tests (Priority: HIGH)

**Issue**: Items outside viewport don't render due to performance optimization

**Solution**: Update test setup to ensure items are within viewport

```typescript
// Before
<TimelineCalendar startDate={startDate} endDate={endDate}>
  <TimelineItem startTime="2025-03-15" ... />
</TimelineCalendar>

// After - ensure item is in default viewport
<TimelineCalendar
  startDate={new Date('2025-01-01')}
  endDate={new Date('2025-12-31')}
  initialViewport={{
    start: new Date('2025-03-01'),
    end: new Date('2025-04-01')
  }}
>
  <TimelineItem startTime="2025-03-15" ... />
</TimelineCalendar>
```

### 2. Integration Tests for Critical Features

#### A. Parallel Items / Overlap Detection
```typescript
describe('Parallel Items (Overlap Detection)', () => {
  it('should stack overlapping items in sub-rows', () => {
    // Test that two overlapping items don't overlap visually
    // Verify subRow and subRowCount are applied correctly
  });

  it('should work with render prop pattern', () => {
    // Test overlap detection with items + renderItem props
  });

  it('should work with children pattern', () => {
    // Test overlap detection with children
  });

  it('should handle complex overlaps (4+ items)', () => {
    // Test the example from the demo
  });
});
```

#### B. Row Positioning
```typescript
describe('Row Positioning', () => {
  it('should position items in correct rows', () => {
    // Verify items appear at expected Y coordinates
  });

  it('should handle collapsible rows correctly', () => {
    // Test header offset calculation
  });

  it('should not double-count row positions', () => {
    // Regression test for the bug we just fixed
  });

  it('should update positions when rows collapse/expand', () => {
    // Test dynamic positioning
  });
});
```

#### C. Aggregation
```typescript
describe('Aggregation', () => {
  it('should aggregate when viewport exceeds threshold', () => {
    // Verify aggregation kicks in at the right zoom level
  });

  it('should show individual items when zoomed in', () => {
    // Verify aggregation turns off when zoomed in
  });

  it('should aggregate by correct granularity', () => {
    // Test week/month/year grouping
  });

  it('should work with render prop pattern', () => {
    // Test with items + renderItem
  });
});
```

#### D. Viewport Filtering (Performance)
```typescript
describe('Viewport Filtering', () => {
  it('should only render items in viewport', () => {
    // Verify items outside viewport are not rendered
  });

  it('should update rendered items when scrolling', () => {
    // Test that items appear/disappear as viewport changes
  });

  it('should preserve item IDs when filtering', () => {
    // Regression test for index mismatch bug
  });
});
```

### 3. Snapshot Tests for Visual Regressions

```typescript
describe('Visual Regression', () => {
  it('should match snapshot for basic timeline', () => {
    const { container } = render(<BasicTimeline />);
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot for overlapping items', () => {
    const { container } = render(<OverlappingItemsDemo />);
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot for aggregated view', () => {
    const { container } = render(<AggregatedViewDemo />);
    expect(container).toMatchSnapshot();
  });
});
```

### 4. Test Utilities

Create helper functions for common test scenarios:

```typescript
// test/utils.tsx

/**
 * Renders timeline with items guaranteed to be in viewport
 */
export function renderTimeline(options: {
  items: TimelineItemData[];
  viewport?: { start: Date; end: Date };
}) {
  // Calculate appropriate viewport based on items
  // Render with proper setup
}

/**
 * Asserts item positions match expected coordinates
 */
export function expectItemsAtPositions(
  container: HTMLElement,
  expectations: Array<{ testId: string; top: number; left: number }>
) {
  // Verify pixel positions
}

/**
 * Simulates zoom/scroll to test viewport changes
 */
export function simulateViewportChange(
  container: HTMLElement,
  newViewport: { start: Date; end: Date }
) {
  // Trigger viewport update
}
```

### 5. Test Coverage Goals

| Feature | Current Coverage | Target Coverage |
|---------|-----------------|-----------------|
| Core Engine | 93% (1 failing) | 100% |
| TimelineItem | 0% (8 failing) | 90% |
| TimelineRow | 0% (3 failing) | 90% |
| Overlap Detection | 100% | 100% ✓ |
| Aggregation | 0% | 80% |
| Viewport Filtering | 0% | 80% |
| Row Positioning | 0% | 90% |

## Implementation Plan

### Phase 1: Fix Broken Tests (1-2 hours)
1. Update TimelineItem tests to use proper viewport
2. Update TimelineRow tests to use proper viewport
3. Fix zoom test in TimelineEngine
4. Get to 100% passing tests

### Phase 2: Add Integration Tests (3-4 hours)
1. Parallel items tests (high priority - just fixed this)
2. Row positioning tests (high priority - just fixed this)
3. Viewport filtering tests
4. Aggregation tests

### Phase 3: Add Regression Prevention (2-3 hours)
1. Snapshot tests for common scenarios
2. Test utilities for easier test writing
3. CI/CD integration to run tests on every commit

### Phase 4: Performance Tests (Optional)
1. Test rendering performance with 1000+ items
2. Test scroll performance
3. Test zoom performance

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

## Key Principles

1. **Tests should match reality** - If viewport filtering is enabled in production, tests should account for it
2. **Test user-facing behavior** - Focus on what users see, not implementation details
3. **Catch regressions early** - Every bug fix should include a test to prevent regression
4. **Make tests easy to write** - Good utilities encourage more test coverage
5. **Integration over isolation** - Component interaction bugs are more common than isolated component bugs

## Next Steps

1. ✅ Create this strategy document
2. ⏭️ Fix all broken tests (Phase 1)
3. ⏭️ Add integration tests for recently fixed bugs (Phase 2)
4. ⏭️ Set up CI/CD (Phase 3)
5. ⏭️ Gradually increase coverage to 90%+ (Ongoing)
