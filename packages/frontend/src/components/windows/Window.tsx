import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWindowManager, type WindowState } from '../../hooks/useWindowManager';

interface WindowProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  children: React.ReactNode;
  onMinimize?: (id: string) => void;
  onRestore?: (id: string) => void;
  onClose?: (id: string) => void;
  minWidth?: number;
  minHeight?: number;
  borderGap?: number;
}

export function Window({
  id,
  title,
  icon,
  initialX = 100,
  initialY = 100,
  initialWidth = 300,
  initialHeight = 200,
  children,
  onMinimize,
  onRestore,
  onClose,
  minWidth = 200,
  minHeight = 150,
  borderGap = 10,
}: WindowProps) {
  const { windows, registerWindow, updateWindow } = useWindowManager();
  const savedState = windows.get(id);
  
  const [position, setPosition] = useState({ 
    x: savedState?.x ?? initialX, 
    y: savedState?.y ?? initialY 
  });
  const [size, setSize] = useState({ 
    width: savedState?.width ?? initialWidth, 
    height: savedState?.height ?? initialHeight 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [zIndex, setZIndex] = useState(savedState?.zIndex ?? 1000);
  const [minimized, setMinimized] = useState(savedState?.minimized ?? false);
  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Sync with WindowManager state (for restore from minimized)
  useEffect(() => {
    const currentState = windows.get(id);
    if (currentState) {
      if (currentState.minimized !== minimized) {
        setMinimized(currentState.minimized);
      }
      if (currentState.zIndex !== zIndex && currentState.zIndex > zIndex) {
        setZIndex(currentState.zIndex);
      }
    }
  }, [windows, id, minimized, zIndex]);

  // Constrain position to viewport
  const constrainPosition = useCallback((x: number, y: number, width: number, height: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const minX = borderGap;
    const minY = borderGap;
    const maxX = viewportWidth - width - borderGap;
    const maxY = viewportHeight - height - borderGap;
    
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }, [borderGap]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const constrained = constrainPosition(position.x, position.y, size.width, size.height);
      setPosition(constrained);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, size, constrainPosition]);

  // Bring window to front on click
  const handleWindowClick = useCallback(() => {
    const newZIndex = Date.now();
    setZIndex(newZIndex);
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== headerRef.current && !headerRef.current?.contains(e.target as Node)) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    handleWindowClick();
  }, [handleWindowClick]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const constrained = constrainPosition(newX, newY, size.width, size.height);
      setPosition(constrained);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, size, constrainPosition]);

  // Resize handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      });
    }
    handleWindowClick();
  }, [handleWindowClick]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(minWidth, resizeStart.width + deltaX);
      const newHeight = Math.max(minHeight, resizeStart.height + deltaY);
      
      // Constrain position if window would go outside viewport
      const constrained = constrainPosition(position.x, position.y, newWidth, newHeight);
      setPosition(constrained);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, minWidth, minHeight, position, constrainPosition]);

  // Minimize handler
  const handleMinimize = useCallback(() => {
    setMinimized(true);
    onMinimize?.(id);
  }, [id, onMinimize]);

  // Restore handler
  const handleRestore = useCallback(() => {
    const newZIndex = Date.now();
    setZIndex(newZIndex);
    setMinimized(false);
    onRestore?.(id);
  }, [id, onRestore]);

  // Notify WindowManager of state changes
  useEffect(() => {
    registerWindow({
      id,
      title,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      minimized,
      zIndex,
    });
  }, [id, title, position, size, minimized, zIndex, registerWindow]);

  if (minimized) {
    return null; // Window is handled by TopBar when minimized
  }

  return (
    <div
      ref={windowRef}
      className="game-window"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={handleWindowClick}
    >
      {/* Window Header */}
      <div
        ref={headerRef}
        className="game-window-header"
        onMouseDown={handleMouseDown}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <div className="game-window-header-content">
          {icon && <span className="game-window-icon">{icon}</span>}
          <span className="game-window-title">{title}</span>
        </div>
        <div className="game-window-controls">
          <button
            className="game-window-button minimize"
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            title="Minimize"
          >
            −
          </button>
          {onClose && (
            <button
              className="game-window-button close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(id);
              }}
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Window Content */}
      <div className="game-window-content">{children}</div>

      {/* Resize Handle */}
      <div
        className="game-window-resize-handle"
        onMouseDown={handleResizeMouseDown}
        style={{
          cursor: 'nwse-resize',
        }}
      />
    </div>
  );
}
