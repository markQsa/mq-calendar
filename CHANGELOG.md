# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-07-30

### Added

- `compressClosedHours` on `<TimelineCalendar>`: compresses the parts of the
  time axis that fall outside opening hours, so a week/month view gives the
  working hours the space. A workshop open 06:00–18:00 renders each day column
  as a narrow 00:00–06:00 strip, a full-width 06:00–18:00 block, and a narrow
  18:00–24:00 strip
- Options object (`factor`, `maxViewportSpan`, `compressFullyClosedDays`,
  `availability`) for tuning how hard closed periods are compressed, when
  compression switches off, and whether fully closed days collapse
- Piecewise-linear time axis in the core: `TimeScale`, `createTimeScale`,
  `identityTimeScale`, `virtualMidpoint`, plus `TimelineConfig.compression`,
  `TimelineEngine.setCompression()` / `getTimeScale()` and the new
  `TimelineEngine.rangeToPixels(start, end)`
- New helpers exported from `mq-timeline-calendar/react`:
  `closedRangesInWindow`, `openRangesForDay`, `mergeRanges`
- `isCompressed` on `GridLine` and `HeaderCell`, plus `mergedCellCount` on
  `HeaderCell`, so custom renderers can style compressed strips
- New exported types: `CompressClosedHoursOptions`, `TimeCompressionConfig`,
  `CompressedRange`, `TimeScale`, `ClosedRangesOptions`

### Changed

- Zoom, scroll, drag & drop, grid lines, header cells, items, pinpoint
  clustering and the current-time line all position through the time scale, so
  they stay aligned when part of the axis is compressed. With compression off
  the math is unchanged
- Header cells that are too narrow to label inside a compressed strip are merged
  into one labelled cell (and left blank when even the merged cell is too
  narrow), and grid lines closer than 24px inside a strip are dropped so a
  compressed night doesn't render as a barcode

### Notes

- Compression requires an `AvailabilityConfig` with a `weekly` or `simple`
  pattern, and is skipped for viewports wider than `maxViewportSpan`
  (default 62 days), where closed periods would be sub-pixel anyway
- `TimeConverter.durationToPixels()` is unaware of compression by design; use
  `rangeToPixels(start, end)` for anything drawn on the timeline

## [0.5.0] - 2026-05-12

### Added

- New `<DayCalendar>` component: vertical day-view scheduler with mechanic
  columns, opening-hours-constrained time axis, side-by-side layout for
  overlapping events, current-time line, and `onSlotClick` / `onEventClick`
  handlers
- Optional `showNavigation` toolbar on `<DayCalendar>` with prev / today /
  next buttons and a localized date label; component stays controlled via
  `onDateChange`
- Override points on `<DayCalendar>`: `renderEvent`, `renderMechanicHeader`,
  `renderTimeLabel`, `renderDateLabel`, plus `navigationLabels`
- New helper `openingHoursRangeForDate(date, availability)` exported from
  `mq-timeline-calendar/react` — derives the visible hour range as the union
  of all ranges that apply to the target day across `weekly`, `simple`, and
  `specific` sources
- New exported types: `DayCalendarProps`, `DayCalendarClassNames`,
  `DayCalendarStyles`, `DayCalendarRenderEventParams`,
  `DayCalendarNavigationLabels`, `Mechanic`, `ScheduleEvent`,
  `OpeningHoursRange`

### Notes

- `<DayCalendar>` is independent of `<TimelineCalendar>` (no shared engine)
  but reuses `AvailabilityConfig`, themes, and the `useCurrentTime` hook
- Drag & drop and week view are intentionally out of scope for this release
  and tracked as follow-ups

## [0.2.0] - 2025-12-10

### Added

- Individual row height support via `height` prop on Row, TimelineRow, and CollapsibleRow components
- Variable row heights with automatic cumulative positioning
- Midpoint threshold for drag behavior across variable-height rows
- `getRowAtPixelY` reverse lookup function for accurate drag detection with variable heights
- `rowHeight` field added to all row context interfaces

### Changed

- Position calculation functions now use cumulative pixel heights instead of uniform row units
- TimelineItem drag behavior now respects individual row heights
- Falls back to `--timeline-row-height` CSS variable when `height` prop is not specified

### Technical Details

- Fully backward compatible - no breaking changes
- All existing code continues to work without modifications
- Enhanced drag experience with midpoint threshold prevents jittery behavior

## [0.1.5] - 2025-12-05

### Added

- Smooth scroll and zoom animation when `startDate` or `endDate` props change
- New `animateDateChanges` prop (default: `true`) to enable/disable animation
- New `animationDuration` prop (default: `500`) to control animation duration in milliseconds
- Demo app date range preset buttons to showcase animation feature

## [0.1.4] - 2025-12-04

### Changed

- Updated README with StackBlitz demo link

## [0.1.3] - 2025-12-04

### Added

- Smooth CSS animations for dynamic overlap detection during drag operations
- Items now animate smoothly when repositioning due to overlaps

## [0.1.2] - 2025-12-04

### Fixed

- Static overlap detection ID mismatch - ensure consistent item IDs between renders

## [0.1.1] - 2025-12-04

### Fixed

- Dynamic overlap detection during drag operations

## [0.1.0] - 2025-12-04

### Added

- Dynamic overlap detection during drag - items automatically reposition when they would overlap
- Comprehensive test coverage for overlap detection

### Changed

- First stable release after beta period

## [0.1.0-beta.43] - 2025-12-03

### Fixed

- Double-counting bug in row positioning

## [0.1.0-beta.41] - 2025-12-03

### Fixed

- Parallel items overlap in render prop pattern

### Added

- Render prop pattern for optimized performance with large datasets
- Viewport filtering to TimelineRow for performance

## [0.1.0-beta.35] - 2025-12-02

### Added

- `useVisibleItems` hook for critical performance improvement
- Performance optimization documentation

## [0.1.0-beta.34] - 2025-12-02

### Added

- Performance optimizations for large item counts

## Earlier Releases

For changes in earlier beta releases, see the [GitHub commit history](https://github.com/markQsa/mq-calendar/commits/main).

[0.2.0]: https://github.com/markQsa/mq-calendar/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/markQsa/mq-calendar/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/markQsa/mq-calendar/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/markQsa/mq-calendar/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/markQsa/mq-calendar/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/markQsa/mq-calendar/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/markQsa/mq-calendar/compare/v0.1.0-beta.43...v0.1.0
[0.1.0-beta.43]: https://github.com/markQsa/mq-calendar/compare/v0.1.0-beta.41...v0.1.0-beta.43
[0.1.0-beta.41]: https://github.com/markQsa/mq-calendar/compare/v0.1.0-beta.35...v0.1.0-beta.41
[0.1.0-beta.35]: https://github.com/markQsa/mq-calendar/compare/v0.1.0-beta.34...v0.1.0-beta.35
[0.1.0-beta.34]: https://github.com/markQsa/mq-calendar/releases/tag/v0.1.0-beta.34
