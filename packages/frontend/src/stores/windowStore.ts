import { create } from 'zustand';

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

interface WindowStoreState {
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

const STORAGE_KEY = 'orbit-fall-windows';

// Helper function to persist windows to localStorage
const persistWindows = (windowsMap: Map<string, WindowState>) => {
  try {
    const obj = Object.fromEntries(windowsMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error('Failed to persist window states:', error);
  }
};

// Helper function to load windows from localStorage
const loadWindows = (): Map<string, WindowState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const windowsMap = new Map<string, WindowState>();
      Object.entries(parsed).forEach(([id, state]) => {
        windowsMap.set(id, state as WindowState);
      });
      return windowsMap;
    }
  } catch (error) {
    console.error('Failed to load window states:', error);
  }
  return new Map();
};

export const useWindowStore = create<WindowStoreState>((set, get) => ({
  windows: loadWindows(),

  registerWindow: (state: WindowState) => {
    set((prev) => {
      const next = new Map(prev.windows);
      next.set(state.id, state);
      persistWindows(next);
      return { windows: next };
    });
  },

  updateWindow: (id: string, updates: Partial<WindowState>) => {
    set((prev) => {
      const next = new Map(prev.windows);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, ...updates });
        persistWindows(next);
      }
      return { windows: next };
    });
  },

  minimizeWindow: (id: string) => {
    get().updateWindow(id, { minimized: true });
  },

  restoreWindow: (id: string) => {
    const newZIndex = Date.now();
    get().updateWindow(id, { minimized: false, zIndex: newZIndex });
  },

  closeWindow: (id: string) => {
    set((prev) => {
      const next = new Map(prev.windows);
      next.delete(id);
      persistWindows(next);
      return { windows: next };
    });
  },

  bringToFront: (id: string) => {
    const newZIndex = Date.now();
    get().updateWindow(id, { zIndex: newZIndex });
  },

  getMinimizedWindows: () => {
    return Array.from(get().windows.values()).filter((w) => w.minimized);
  },

  resetWindow: (id: string) => {
    set((prev) => {
      const next = new Map(prev.windows);
      next.delete(id);
      persistWindows(next);
      return { windows: next };
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
  },
}));

