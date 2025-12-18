import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';

interface UsePixiAppOptions {
  width?: number;
  height?: number;
  backgroundColor?: number;
  onAppReady?: (app: Application) => void;
}

export function usePixiApp(options: UsePixiAppOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const onAppReadyRef = useRef(options.onAppReady);

  // Update callback ref when it changes
  useEffect(() => {
    onAppReadyRef.current = options.onAppReady;
  }, [options.onAppReady]);

  useEffect(() => {
    if (!containerRef.current) return;

    const {
      width = window.innerWidth,
      height = window.innerHeight,
      backgroundColor = 0x000000,
    } = options;

    const app = new Application();
    
    app.init({
      width,
      height,
      backgroundColor,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    }).then(() => {
      if (containerRef.current) {
        const canvas = app.canvas as HTMLCanvasElement;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        containerRef.current.appendChild(canvas);
        appRef.current = app;
        onAppReadyRef.current?.(app);
      }
    }).catch((error) => {
      console.error('Failed to initialize PixiJS:', error);
    });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, {
          children: true,
          texture: true,
        });
        appRef.current = null;
      }
    };
  }, []);

  return { containerRef, app: appRef.current };
}

