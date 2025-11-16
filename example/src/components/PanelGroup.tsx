import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

interface PanelState {
  id: string;
  isExpanded: boolean;
  rowCount: number;
}

interface PanelGroupContextValue {
  getPanelPosition: (id: string) => number;
  getPanelExpanded: (id: string) => boolean;
  togglePanel: (id: string) => void;
  registerPanel: (id: string, rowCount: number, defaultExpanded: boolean) => void;
}

const PanelGroupContext = createContext<PanelGroupContextValue | undefined>(undefined);

export const usePanelGroup = () => {
  const context = useContext(PanelGroupContext);
  if (!context) {
    throw new Error('usePanelGroup must be used within PanelGroup');
  }
  return context;
};

interface PanelGroupProps {
  children: React.ReactNode;
}

export const PanelGroup: React.FC<PanelGroupProps> = ({ children }) => {
  const [panels, setPanels] = useState<Map<string, PanelState>>(new Map());

  const registerPanel = useCallback((id: string, rowCount: number, defaultExpanded: boolean) => {
    setPanels(prev => {
      // Only update if panel doesn't exist
      if (prev.has(id)) {
        return prev;
      }
      const newMap = new Map(prev);
      newMap.set(id, { id, rowCount, isExpanded: defaultExpanded });
      return newMap;
    });
  }, []);

  const togglePanel = useCallback((id: string) => {
    setPanels(prev => {
      const newMap = new Map(prev);
      const panel = newMap.get(id);
      if (panel) {
        newMap.set(id, { ...panel, isExpanded: !panel.isExpanded });
      }
      return newMap;
    });
  }, []);

  const getPanelExpanded = useCallback((id: string): boolean => {
    return panels.get(id)?.isExpanded ?? true;
  }, [panels]);

  const getPanelPosition = useCallback((id: string): number => {
    const rowHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    const headerHeight = 40;

    let position = 0;
    const panelArray = Array.from(panels.values());

    for (const panel of panelArray) {
      if (panel.id === id) {
        break;
      }

      // Each panel takes: header height + (content height if expanded)
      const headerRows = headerHeight / rowHeight;
      const contentRows = panel.isExpanded ? panel.rowCount : 0;
      position += headerRows + contentRows;
    }

    return position;
  }, [panels]);

  const contextValue = useMemo(
    () => ({
      getPanelPosition,
      getPanelExpanded,
      togglePanel,
      registerPanel
    }),
    [getPanelPosition, getPanelExpanded, togglePanel, registerPanel]
  );

  return (
    <PanelGroupContext.Provider value={contextValue}>
      {children}
    </PanelGroupContext.Provider>
  );
};
