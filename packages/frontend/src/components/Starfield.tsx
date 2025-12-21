import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { STARFIELD_LAYERS } from '@shared/constants';

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
// Stars are deterministic (same position when revisiting same grid) but appear randomized
function generateStarAt(gridX: number, gridY: number, layer: number, index: number): { x: number; y: number; size: number; brightness: number } {
  const seed = gridX * 73856093 + gridY * 19349663 + layer * 83492791 + index * 19349669;
  // More random distribution within the entire grid cell
  const x = gridX + seededRandom(seed) * 200; // Use full grid cell size (200px)
  const y = gridY + seededRandom(seed + 1) * 200;
  const size = seededRandom(seed + 2) * 1.5 + 0.3; // Smaller stars on average
  const brightness = seededRandom(seed + 3) * 0.4 + 0.3; // Lower brightness range
  return { x, y, size, brightness };
}

export function Starfield({ app, cameraContainer, speed = 0.5 }: StarfieldProps) {
  const starsRef = useRef<Map<string, Graphics>[]>([]);
  const containersRef = useRef<Container[]>([]);
  const lastCameraPosRef = useRef({ x: 0, y: 0 });
  const cameraVelocityRef = useRef({ vx: 0, vy: 0 }); // Track camera movement direction
  const generatedGridsRef = useRef<Set<string>[]>([]); // Track which grid cells have been generated
  const gridSizeRef = useRef(200); // Larger grid cells for sparser distribution

  useEffect(() => {
    if (!app || !cameraContainer) return;

    // Store app in local variable to avoid stale closure issues during hot reload
    const currentApp = app;

    // Create layers for parallax effect
    // Add layers in reverse order: farthest first (back), nearest last (front)
    // This allows Mars to be inserted between far and near layers
    const layers: Container[] = [];
    const starMaps: Map<string, Graphics>[] = [];
    const generatedGrids: Set<string>[] = [];

    // First, add the farthest layers (1 and 2) at the back
    for (let layer = STARFIELD_LAYERS - 1; layer >= 1; layer--) {
      const container = new Container();
      cameraContainer.addChild(container);
      layers[layer] = container;
      starMaps[layer] = new Map();
      generatedGrids[layer] = new Set();
    }
    
    // Layer 0 (nearest) - add it now, we'll reorder it after Mars is added
    const nearestContainer = new Container();
    cameraContainer.addChild(nearestContainer);
    layers[0] = nearestContainer;
    starMaps[0] = new Map();
    generatedGrids[0] = new Set();

    starsRef.current = starMaps;
    containersRef.current = layers;
    generatedGridsRef.current = generatedGrids;

    // Function to get grid key
    const getGridKey = (gridX: number, gridY: number) => `${gridX},${gridY}`;

    // Function to ensure stars exist in viewport area with predictive padding
    // Generates stars ahead of camera movement to prevent black gaps
    // Use currentApp from closure to avoid stale references during hot reload
    const updateStarsForViewport = (cameraX: number, cameraY: number, velocityX: number, velocityY: number) => {
      if (!currentApp) return;
      if (!currentApp.screen) return;
      const screenWidth = currentApp.screen.width;
      const screenHeight = currentApp.screen.height;
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
        if (!container) continue;
        
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
              
              // Use probabilistic star generation for sparser, more randomized distribution
              // Each grid cell has a chance to have 0-2 stars, making it more sparse
              const seed = gridX * 73856093 + gridY * 19349663 + layer * 83492791;
              const starProbability = seededRandom(seed);
              
              // Determine how many stars in this cell (0, 1, or 2) based on probability
              let starsInCell = 0;
              if (starProbability > 0.4) {
                // 60% chance of having at least 1 star
                starsInCell = starProbability > 0.75 ? 2 : 1; // 25% chance of 2 stars, 35% chance of 1 star
              }
              
              // Generate stars for this cell
              for (let i = 0; i < starsInCell; i++) {
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
            // Check up to 2 stars per cell (max we generate now)
            let allRemoved = true;
            for (let i = 0; i < 2; i++) {
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

    // Track if we've ensured layer 0 is above Mars
    let hasEnsuredOrder = false;

    // Animation ticker for parallax effect and procedural generation
    // Use currentApp from closure to avoid stale references during hot reload
    const tickerCallback = () => {
      if (!cameraContainer || !currentApp) return;
      if (!currentApp.screen) return;
      const cameraX = cameraContainer.x;
      const cameraY = cameraContainer.y;

      // Ensure layer 0 (nearest) is above Mars (only check once after initial setup)
      if (!hasEnsuredOrder && nearestContainer && cameraContainer.children.includes(nearestContainer)) {
        const layer1Container = containersRef.current[1];
        const layer2Container = containersRef.current[2];
        if (layer1Container && layer2Container) {
          const layer1Index = cameraContainer.getChildIndex(layer1Container);
          const layer2Index = cameraContainer.getChildIndex(layer2Container);
          const maxStarLayerIndex = Math.max(layer1Index, layer2Index);
          const nearestIndex = cameraContainer.getChildIndex(nearestContainer);
          
          // Find Mars container (should be the first container after star layers)
          // Look for a container that has children (Mars background container has Mars graphics)
          let marsIndex = -1;
          for (let i = maxStarLayerIndex + 1; i < cameraContainer.children.length; i++) {
            const child = cameraContainer.children[i];
            if (child !== nearestContainer && child.children.length > 0) {
              // Check if it looks like Mars container (has a large graphics object)
              // Mars graphics has width/height around 800 (radius 400 * 2)
              const hasLargeGraphics = child.children.some((c: any) => {
                if (c.width && c.height) {
                  const size = Math.max(c.width, c.height);
                  return size > 500; // Mars is large (radius 400, so diameter ~800)
                }
                return false;
              });
              if (hasLargeGraphics) {
                marsIndex = i;
                break;
              }
            }
          }
          
          // If we found Mars, ensure layer 0 is right after it
          if (marsIndex >= 0) {
            if (nearestIndex !== marsIndex + 1) {
              cameraContainer.setChildIndex(nearestContainer, marsIndex + 1);
            }
            hasEnsuredOrder = true;
          } else {
            hasEnsuredOrder = true; // Couldn't find Mars, skip reordering
          }
        }
      }

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
        if (!container) continue;
        
        const parallaxFactor = 1 - (layer + 1) * 0.15;

        container.x = -cameraX * (1 - parallaxFactor);
        container.y = -cameraY * (1 - parallaxFactor);
      }
    };


    // Initial star generation
    // Double-check currentApp is still valid (handles hot reload stale closures)
    if (!cameraContainer || !currentApp) return;
    if (!currentApp.screen) return;
    updateStarsForViewport(cameraContainer.x, cameraContainer.y, 0, 0);
    lastCameraPosRef.current = { x: cameraContainer.x, y: cameraContainer.y };
    cameraVelocityRef.current = { vx: 0, vy: 0 };

    if (!app?.ticker) return;

    app.ticker.add(tickerCallback);

    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
      layers.forEach((container, layer) => {
        if (!container) return;
        const starMap = starsRef.current[layer];
        starMap.forEach((star) => {
          star.destroy();
        });
        starMap.clear();
        container.destroy({ children: true });
        if (cameraContainer && cameraContainer.children.includes(container)) {
          cameraContainer.removeChild(container);
        }
      });
    };
  }, [app, cameraContainer, speed]);

  return null;
}

