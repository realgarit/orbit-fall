import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { STARFIELD_LAYERS, STARS_PER_LAYER } from '@shared/constants';
import type { Star } from '@shared/types';

interface StarfieldProps {
  app: Application;
  cameraContainer: Container;
  speed?: number;
}

// Simple seeded random number generator for consistent star positions
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate a star at a specific grid position using seeded random
function generateStarAt(gridX: number, gridY: number, layer: number, index: number): { x: number; y: number; size: number; brightness: number } {
  const seed = gridX * 73856093 + gridY * 19349663 + layer * 83492791 + index * 19349669;
  const x = gridX + seededRandom(seed) * 100; // Distribute within grid cell
  const y = gridY + seededRandom(seed + 1) * 100;
  const size = seededRandom(seed + 2) * 2 + 0.5;
  const brightness = seededRandom(seed + 3) * 0.5 + 0.5;
  return { x, y, size, brightness };
}

export function Starfield({ app, cameraContainer, speed = 0.5 }: StarfieldProps) {
  const starsRef = useRef<Map<string, Graphics>[]>([]);
  const containersRef = useRef<Container[]>([]);
  const lastCameraPosRef = useRef({ x: 0, y: 0 });
  const cameraVelocityRef = useRef({ vx: 0, vy: 0 }); // Track camera movement direction
  const generatedGridsRef = useRef<Set<string>[]>([]); // Track which grid cells have been generated
  const gridSizeRef = useRef(150); // Larger grid cells for better performance

  useEffect(() => {
    if (!app) return;

    // Create layers for parallax effect
    const layers: Container[] = [];
    const starMaps: Map<string, Graphics>[] = [];
    const generatedGrids: Set<string>[] = [];

    for (let layer = 0; layer < STARFIELD_LAYERS; layer++) {
      const container = new Container();
      cameraContainer.addChild(container);
      layers.push(container);
      starMaps.push(new Map());
      generatedGrids.push(new Set());
    }

    starsRef.current = starMaps;
    containersRef.current = layers;
    generatedGridsRef.current = generatedGrids;

    // Function to get grid coordinates from world coordinates
    const getGridCoords = (worldX: number, worldY: number) => {
      const gridSize = gridSizeRef.current;
      return {
        gridX: Math.floor(worldX / gridSize) * gridSize,
        gridY: Math.floor(worldY / gridSize) * gridSize,
      };
    };

    // Function to get grid key
    const getGridKey = (gridX: number, gridY: number) => `${gridX},${gridY}`;

    // Function to ensure stars exist in viewport area with predictive padding
    // Generates stars ahead of camera movement to prevent black gaps
    const updateStarsForViewport = (cameraX: number, cameraY: number, velocityX: number, velocityY: number) => {
      const screenWidth = app.screen.width;
      const screenHeight = app.screen.height;
      const gridSize = gridSizeRef.current;
      
      // Calculate base viewport bounds in world space
      const baseViewportLeft = -cameraX;
      const baseViewportRight = -cameraX + screenWidth;
      const baseViewportTop = -cameraY;
      const baseViewportBottom = -cameraY + screenHeight;
      
      // Add large padding in all directions to prevent visible star generation
      // Generate stars well ahead of the viewport so they're always ready
      const padding = Math.max(screenWidth * 0.8, screenHeight * 0.8, 400); // Large padding: 80% of screen or 400px minimum
      
      // Add extra padding in movement direction based on velocity
      const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      const velocityPadding = Math.min(speed * 2, screenWidth); // Up to screen width based on speed
      
      // Apply padding in all directions, with extra in movement direction
      let viewportLeft = baseViewportLeft - padding;
      let viewportRight = baseViewportRight + padding;
      let viewportTop = baseViewportTop - padding;
      let viewportBottom = baseViewportBottom + padding;
      
      // Add extra padding in the direction of movement
      if (Math.abs(velocityX) > 0.1) {
        if (velocityX < 0) {
          viewportLeft -= velocityPadding;
        } else {
          viewportRight += velocityPadding;
        }
      }
      
      if (Math.abs(velocityY) > 0.1) {
        if (velocityY < 0) {
          viewportTop -= velocityPadding;
        } else {
          viewportBottom += velocityPadding;
        }
      }
      
      // Ensure at least 3 grid cells of padding in all directions
      const minGridPadding = gridSize * 3;
      viewportLeft = Math.min(viewportLeft, baseViewportLeft - minGridPadding);
      viewportRight = Math.max(viewportRight, baseViewportRight + minGridPadding);
      viewportTop = Math.min(viewportTop, baseViewportTop - minGridPadding);
      viewportBottom = Math.max(viewportBottom, baseViewportBottom + minGridPadding);

      for (let layer = 0; layer < STARFIELD_LAYERS; layer++) {
        const container = containersRef.current[layer];
        const starMap = starsRef.current[layer];
        const generatedGrids = generatedGridsRef.current[layer];
        const parallaxFactor = 1 - (layer + 1) * 0.15;
        
        // Adjust viewport for parallax
        const layerViewportLeft = viewportLeft * parallaxFactor;
        const layerViewportRight = viewportRight * parallaxFactor;
        const layerViewportTop = viewportTop * parallaxFactor;
        const layerViewportBottom = viewportBottom * parallaxFactor;

        // Generate stars in visible grid cells
        const startGridX = Math.floor(layerViewportLeft / gridSize) * gridSize;
        const endGridX = Math.ceil(layerViewportRight / gridSize) * gridSize;
        const startGridY = Math.floor(layerViewportTop / gridSize) * gridSize;
        const endGridY = Math.ceil(layerViewportBottom / gridSize) * gridSize;

        // Create stars in visible grid cells
        for (let gridX = startGridX; gridX <= endGridX; gridX += gridSize) {
          for (let gridY = startGridY; gridY <= endGridY; gridY += gridSize) {
            const key = getGridKey(gridX, gridY);
            
            if (!generatedGrids.has(key)) {
              // Mark this grid as generated
              generatedGrids.add(key);
              
              // Generate fewer stars per cell for better performance
              // With larger grid cells (150x150), we need fewer stars to maintain density
              const starsPerCell = 4; // Reduced from 8 to 4 stars per grid cell
              
              for (let i = 0; i < starsPerCell; i++) {
                const starData = generateStarAt(gridX, gridY, layer, i);

                const star = new Graphics();
                star.circle(0, 0, starData.size);
                star.fill({ color: 0xffffff, alpha: starData.brightness });

                star.x = starData.x;
                star.y = starData.y;

                container.addChild(star);
                starMap.set(`${key}_${i}`, star);
              }
            }
          }
        }

        // Remove stars that are far outside the visible viewport
        // Keep stars within the expanded viewport bounds (which already includes padding)
        // Only remove stars that are well outside the padded area
        const removalMargin = gridSize * 2; // Small margin beyond the padded viewport
        const keysToRemove: string[] = [];
        const gridsToRemove: string[] = [];
        
        for (const [key, star] of starMap.entries()) {
          // Check if star is outside the padded viewport bounds (with small removal margin)
          const isOutside = 
            star.x < layerViewportLeft - removalMargin ||
            star.x > layerViewportRight + removalMargin ||
            star.y < layerViewportTop - removalMargin ||
            star.y > layerViewportBottom + removalMargin;

          if (isOutside) {
            container.removeChild(star);
            star.destroy();
            keysToRemove.push(key);
            
            // Extract grid key from star key (format: "gridX,gridY_index")
            const gridKey = key.split('_')[0];
            // Check if all stars from this grid are removed
            let allRemoved = true;
            for (let i = 0; i < 4; i++) {
              if (starMap.has(`${gridKey}_${i}`) && !keysToRemove.includes(`${gridKey}_${i}`)) {
                allRemoved = false;
                break;
              }
            }
            if (allRemoved && !gridsToRemove.includes(gridKey)) {
              gridsToRemove.push(gridKey);
            }
          }
        }
        
        // Clean up removed stars from map
        keysToRemove.forEach(key => starMap.delete(key));
        // Clean up removed grids
        gridsToRemove.forEach(key => generatedGrids.delete(key));
      }
    };

    // Animation ticker for parallax effect and procedural generation
    const tickerCallback = () => {
      const cameraX = cameraContainer.x;
      const cameraY = cameraContainer.y;

      // Calculate camera velocity for predictive star generation
      const dx = cameraX - lastCameraPosRef.current.x;
      const dy = cameraY - lastCameraPosRef.current.y;
      
      // Update velocity with less smoothing for more responsive prediction
      const smoothing = 0.5; // Reduced from 0.7 for faster response
      cameraVelocityRef.current.vx = cameraVelocityRef.current.vx * smoothing + dx * (1 - smoothing);
      cameraVelocityRef.current.vy = cameraVelocityRef.current.vy * smoothing + dy * (1 - smoothing);

      // Always update stars every frame to ensure they're always ready
      // Large padding ensures stars are generated well ahead
      updateStarsForViewport(cameraX, cameraY, cameraVelocityRef.current.vx, cameraVelocityRef.current.vy);
      lastCameraPosRef.current = { x: cameraX, y: cameraY };

      // Apply parallax effect
      for (let layer = 0; layer < STARFIELD_LAYERS; layer++) {
        const container = containersRef.current[layer];
        const parallaxFactor = 1 - (layer + 1) * 0.15;

        container.x = -cameraX * (1 - parallaxFactor);
        container.y = -cameraY * (1 - parallaxFactor);
      }
    };

    // Initial star generation
    updateStarsForViewport(cameraContainer.x, cameraContainer.y, 0, 0);
    lastCameraPosRef.current = { x: cameraContainer.x, y: cameraContainer.y };
    cameraVelocityRef.current = { vx: 0, vy: 0 };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      layers.forEach((container, layer) => {
        const starMap = starsRef.current[layer];
        starMap.forEach((star) => {
          star.destroy();
        });
        starMap.clear();
        container.destroy({ children: true });
        cameraContainer.removeChild(container);
      });
    };
  }, [app, cameraContainer, speed]);

  return null;
}

