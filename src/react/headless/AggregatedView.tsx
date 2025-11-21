import React, { useMemo } from 'react';
import type { AggregatedPeriod, AggregatedPeriodRenderParams } from '../types';
import { useTimelineContext } from './TimelineContext';

export interface AggregatedViewProps {
  /** Aggregated periods to render */
  periods: AggregatedPeriod[];
  /** Row number for vertical positioning */
  row: number;
  /** Height of the row in pixels */
  rowHeight?: number;
  /** Function to get style for a given type */
  getTypeStyle?: (type: string) => { backgroundColor?: string; color?: string };
  /** Custom renderer for periods (optional) */
  renderPeriod?: (params: AggregatedPeriodRenderParams) => React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Component for rendering aggregated timeline data as stacked bars
 */
export const AggregatedView: React.FC<AggregatedViewProps> = ({
  periods,
  row,
  rowHeight = 60,
  getTypeStyle,
  renderPeriod,
  className
}) => {
  const { engine } = useTimelineContext();

  const rowTop = useMemo(() => {
    // TimelineRow already passes absolute row position, so just use it directly
    return row * rowHeight;
  }, [row, rowHeight]);

  if (!engine) {
    return null;
  }

  return (
    <>
      {periods.map((period, periodIndex) => {
        const position = engine.timeToPixel(period.start);
        const width = engine.durationToPixels(period.end - period.start);
        const height = rowHeight - 8; // Leave some padding

        // If custom renderer provided, use it
        if (renderPeriod) {
          return (
            <div
              key={`period-${periodIndex}`}
              style={{
                position: 'absolute',
                left: position,
                top: rowTop + 4,
                width,
                height,
                zIndex: 10
              }}
            >
              {renderPeriod({ period, position, width, height })}
            </div>
          );
        }

        // Default rendering: stacked bars by type
        const types = Object.keys(period.byType).sort((a, b) =>
          period.byType[b].duration - period.byType[a].duration
        );

        let accumulatedHeight = 0;

        return (
          <div
            key={`period-${periodIndex}`}
            className={className}
            style={{
              position: 'absolute',
              left: position,
              top: rowTop + 4,
              width,
              height,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
            title={`Occupancy: ${period.occupancyPercent.toFixed(1)}%\n${types.map(type =>
              `${type}: ${period.byType[type].count} items (${period.byType[type].percentage.toFixed(1)}%)`
            ).join('\n')}`}
          >
            {types.map((type, typeIndex) => {
              const typeData = period.byType[type];
              const segmentHeight = (typeData.percentage / 100) * height;

              const style = getTypeStyle
                ? getTypeStyle(type)
                : {
                    backgroundColor: `hsl(${(typeIndex * 360) / types.length}, 70%, 60%)`,
                    color: 'white'
                  };

              const segment = (
                <div
                  key={`${periodIndex}-${type}`}
                  style={{
                    height: segmentHeight,
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 500,
                    opacity: 0.9
                  }}
                >
                  {segmentHeight > 15 && typeData.percentage > 10 && (
                    <span style={{ textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>
                      {typeData.count}
                    </span>
                  )}
                </div>
              );

              accumulatedHeight += segmentHeight;

              return segment;
            })}

            {/* Empty space for unoccupied time */}
            {period.occupancyPercent < 100 && (
              <div
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(200, 200, 200, 0.2)',
                  minHeight: ((100 - period.occupancyPercent) / 100) * height
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
};
