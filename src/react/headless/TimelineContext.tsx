import { createContext, useContext } from 'react';
import type { TimelineEngine } from '../../core/TimelineEngine';
import type { TimeConverter } from '../../utils/timeTypes';

export interface TimelineContextValue {
  engine: TimelineEngine | null;
  refresh: () => void;
  timeConverter: TimeConverter;
  refreshCounter: number;
}

export const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

export const useTimelineContext = () => {
  const context = useContext(TimelineContext);
  if (context === undefined) {
    throw new Error('useTimelineContext must be used within TimelineCalendar');
  }
  return context;
};
