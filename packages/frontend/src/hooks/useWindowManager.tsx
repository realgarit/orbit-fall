import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type WindowState = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  zIndex: number;
};

interface WindowManagerContextType {
  windows: Map<string, WindowState>;
  registerWindow: (state: WindowState) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  getMinimizedWindows: () => WindowState[];
  resetWindow: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

const STORAGE_KEY = 'orbit-fall-windows';

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Map<string, WindowState>>(new Map());

  // Load persisted window states from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const windowsMap = new Map<string, WindowState>();
        Object.entries(parsed).forEach(([id, state]) => {
          windowsMap.set(id, state as WindowState);
        });
        setWindows(windowsMap);
      }
    } catch (error) {
      console.error('Failed to load window states:', error);
    }
  }, []);

  // Persist window states to localStorage
  const persistWindows = useCallback((windowsMap: Map<string, WindowState>) => {
    try {
      const obj = Object.fromEntries(windowsMap);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error('Failed to persist window states:', error);
    }
  }, []);

  const registerWindow = useCallback((state: WindowState) => {
    setWindows((prev) => {
      const next = new Map(prev);
      next.set(state.id, state);
      persistWindows(next);
      return next;
    });
  }, [persistWindows]);

  const updateWindow = useCallback((id: string, updates: Partial<WindowState>) => {
    setWindows((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, ...updates });
        persistWindows(next);
      }
      return next;
    });
  }, [persistWindows]);

  const minimizeWindow = useCallback((id: string) => {
    updateWindow(id, { minimized: true });
  }, [updateWindow]);

  const restoreWindow = useCallback((id: string) => {
    const newZIndex = Date.now();
    updateWindow(id, { minimized: false, zIndex: newZIndex });
  }, [updateWindow]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const next = new Map(prev);
      next.delete(id);
      persistWindows(next);
      return next;
    });
  }, [persistWindows]);

  const bringToFront = useCallback((id: string) => {
    const newZIndex = Date.now();
    updateWindow(id, { zIndex: newZIndex });
  }, [updateWindow]);

  const getMinimizedWindows = useCallback(() => {
    return Array.from(windows.values()).filter((w) => w.minimized);
  }, [windows]);

  const resetWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const next = new Map(prev);
      next.delete(id);
      persistWindows(next);
      return next;
    });
    // Also remove from localStorage directly
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        delete parsed[id];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Failed to reset window state:', error);
    }
  }, [persistWindows]);

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        registerWindow,
        updateWindow,
        minimizeWindow,
        restoreWindow,
        closeWindow,
        bringToFront,
        getMinimizedWindows,
        resetWindow,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within WindowManagerProvider');
  }
  return context;
}
