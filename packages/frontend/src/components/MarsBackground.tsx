import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { MAP_WIDTH, MAP_HEIGHT } from '@shared/constants';

interface MarsBackgroundProps {
  app: Application;
  cameraContainer: Container;
}

// Seeded random number generator for consistent generation
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate Mars planet with procedural terrain
function generateMarsPlanet(radius: number, seed: number): Graphics {
  const planet = new Graphics();
  
  // Mars colors - reddish-orange palette
  const baseColor = 0xcd5c5c; // Mars red
  const darkColor = 0x8b3a3a; // Darker red
  const lightColor = 0xff6b6b; // Lighter red
  const craterColor = 0x7a2a2a; // Deep crater color
  
  // Draw main planet circle
  planet.circle(0, 0, radius);
  planet.fill(baseColor);
  
  // Add procedural terrain features (craters, valleys, mountains)
  const numFeatures = 20;
  for (let i = 0; i < numFeatures; i++) {
    const featureSeed = seed + i * 1000;
    const angle = seededRandom(featureSeed) * Math.PI * 2;
    const distance = seededRandom(featureSeed + 1) * radius * 0.7; // Within 70% of radius
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    
    const featureType = seededRandom(featureSeed + 2);
    
    if (featureType < 0.4) {
      // Crater
      const craterSize = seededRandom(featureSeed + 3) * 15 + 5;
      planet.circle(x, y, craterSize);
      planet.fill(craterColor);
      // Crater rim highlight
      planet.circle(x, y, craterSize * 0.7);
      planet.fill({ color: darkColor, alpha: 0.5 });
    } else if (featureType < 0.7) {
      // Mountain/ridge
      const ridgeLength = seededRandom(featureSeed + 3) * 20 + 10;
      const ridgeWidth = seededRandom(featureSeed + 4) * 3 + 1;
      planet.ellipse(x, y, ridgeLength, ridgeWidth);
      planet.fill(darkColor);
    } else {
      // Valley/depression
      const valleySize = seededRandom(featureSeed + 3) * 12 + 4;
      planet.circle(x, y, valleySize);
      planet.fill({ color: darkColor, alpha: 0.6 });
    }
  }
  
  // Add terminator line (day/night boundary) with gradient effect
  // Light source from the right
  const terminatorOffset = radius * 0.3; // 30% of planet in shadow
  for (let i = 0; i < 10; i++) {
    const alpha = 0.1 + (i / 10) * 0.3;
    const offset = terminatorOffset - i * 2;
    planet.rect(-radius, -radius + i * (radius * 2 / 10), radius * 2, radius * 2 / 10);
    planet.fill({ color: 0x000000, alpha: alpha });
  }
  
  // Add city lights on the dark side (left side)
  const numCityLights = 8;
  for (let i = 0; i < numCityLights; i++) {
    const lightSeed = seed + i * 500;
    const lightAngle = Math.PI + seededRandom(lightSeed) * Math.PI * 0.6; // Left side (180-240 degrees)
    const lightDistance = seededRandom(lightSeed + 1) * radius * 0.6;
    const lightX = Math.cos(lightAngle) * lightDistance;
    const lightY = Math.sin(lightAngle) * lightDistance;
    
    // City light glow
    planet.circle(lightX, lightY, 3);
    planet.fill({ color: 0xffffaa, alpha: 0.9 });
    // Outer glow
    planet.circle(lightX, lightY, 5);
    planet.fill({ color: 0xffffaa, alpha: 0.3 });
  }
  
  // Add bright rim on the illuminated edge (right side)
  for (let i = 0; i < 5; i++) {
    const rimAngle = -Math.PI / 2 + seededRandom(seed + i) * Math.PI; // Right side
    const rimX = Math.cos(rimAngle) * radius;
    const rimY = Math.sin(rimAngle) * radius;
    planet.circle(rimX, rimY, 2);
    planet.fill({ color: 0xffaa44, alpha: 0.8 - i * 0.15 });
  }
  
  return planet;
}

// Generate asteroid
function generateAsteroid(seed: number, size: number): Graphics {
  const asteroid = new Graphics();
  const color = 0x6b6b6b; // Grey-brown
  
  // Create irregular shape
  const points = 8;
  const angles: number[] = [];
  const radii: number[] = [];
  
  for (let i = 0; i < points; i++) {
    angles.push((i / points) * Math.PI * 2);
    radii.push(size * (0.7 + seededRandom(seed + i) * 0.3));
  }
  
  asteroid.moveTo(
    Math.cos(angles[0]) * radii[0],
    Math.sin(angles[0]) * radii[0]
  );
  
  for (let i = 1; i < points; i++) {
    asteroid.lineTo(
      Math.cos(angles[i]) * radii[i],
      Math.sin(angles[i]) * radii[i]
    );
  }
  asteroid.closePath();
  asteroid.fill(color);
  
  // Add some surface detail
  for (let i = 0; i < 3; i++) {
    const detailSeed = seed + i * 100;
    const detailAngle = seededRandom(detailSeed) * Math.PI * 2;
    const detailDistance = seededRandom(detailSeed + 1) * size * 0.5;
    const detailX = Math.cos(detailAngle) * detailDistance;
    const detailY = Math.sin(detailAngle) * detailDistance;
    asteroid.circle(detailX, detailY, 2);
    asteroid.fill({ color: 0x4a4a4a, alpha: 0.8 });
  }
  
  return asteroid;
}

// Generate nebula cloud
function generateNebula(seed: number, width: number, height: number): Graphics {
  const nebula = new Graphics();
  
  // Create wispy cloud shape using multiple overlapping circles
  const numClouds = 5;
  for (let i = 0; i < numClouds; i++) {
    const cloudSeed = seed + i * 200;
    const x = (seededRandom(cloudSeed) - 0.5) * width;
    const y = (seededRandom(cloudSeed + 1) - 0.5) * height;
    const cloudSize = seededRandom(cloudSeed + 2) * 60 + 40;
    const alpha = seededRandom(cloudSeed + 3) * 0.2 + 0.1;
    
    // Dark grey-blue nebula
    nebula.circle(x, y, cloudSize);
    nebula.fill({ color: 0x2a3a4a, alpha });
  }
  
  return nebula;
}

export function MarsBackground({ app, cameraContainer }: MarsBackgroundProps) {
  const backgroundContainerRef = useRef<Container | null>(null);
  const marsRef = useRef<Graphics | null>(null);
  const asteroidsRef = useRef<Graphics[]>([]);
  const nebulaeRef = useRef<Graphics[]>([]);
  const lastCameraPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!app) return;

    // Create background container (behind everything else)
    const backgroundContainer = new Container();
    cameraContainer.addChildAt(backgroundContainer, 0); // Add at the back
    backgroundContainerRef.current = backgroundContainer;

    // Fixed world position for Mars (center of map)
    // This creates the "giant Mars in background" effect
    const marsWorldX = MAP_WIDTH * 0.5; // Center horizontally
    const marsWorldY = MAP_HEIGHT * 0.5; // Center vertically
    const marsRadius = 400; // Large planet
    const marsSeed = 12345; // Fixed seed for consistent generation

    // Generate Mars planet
    const mars = generateMarsPlanet(marsRadius, marsSeed);
    mars.x = marsWorldX;
    mars.y = marsWorldY;
    backgroundContainer.addChild(mars);
    marsRef.current = mars;

    // Generate asteroids (scattered in space)
    const numAsteroids = 5;
    for (let i = 0; i < numAsteroids; i++) {
      const asteroidSeed = 5000 + i * 1000;
      const asteroidSize = seededRandom(asteroidSeed) * 15 + 8;
      const asteroid = generateAsteroid(asteroidSeed, asteroidSize);
      
      // Position asteroids in upper-right area
      asteroid.x = MAP_WIDTH * (0.6 + seededRandom(asteroidSeed + 1) * 0.3);
      asteroid.y = MAP_HEIGHT * (0.1 + seededRandom(asteroidSeed + 2) * 0.2);
      
      backgroundContainer.addChild(asteroid);
      asteroidsRef.current.push(asteroid);
    }

    // Generate nebulae (background clouds)
    const numNebulae = 3;
    for (let i = 0; i < numNebulae; i++) {
      const nebulaSeed = 10000 + i * 2000;
      const nebula = generateNebula(nebulaSeed, 200, 150);
      
      // Position nebulae in various locations (around centered Mars)
      if (i === 0) {
        // Upper-left
        nebula.x = MAP_WIDTH * 0.1;
        nebula.y = MAP_HEIGHT * 0.1;
      } else if (i === 1) {
        // Lower-right
        nebula.x = MAP_WIDTH * 0.7;
        nebula.y = MAP_HEIGHT * 0.8;
      } else {
        // Upper-right area
        nebula.x = MAP_WIDTH * (0.6 + seededRandom(nebulaSeed) * 0.2);
        nebula.y = MAP_HEIGHT * (0.1 + seededRandom(nebulaSeed + 1) * 0.2);
      }
      
      backgroundContainer.addChild(nebula);
      nebulaeRef.current.push(nebula);
    }

    // Parallax effect - background moves slower than foreground
    // Using same formula as Starfield: container.x = -cameraX * (1 - parallaxFactor)
    // parallaxFactor of 0.7 means background moves at 30% of camera speed (far background)
    const parallaxFactor = 0.7;
    
    const tickerCallback = () => {
      const cameraX = cameraContainer.x;
      const cameraY = cameraContainer.y;
      
      // Apply parallax to background container (same formula as Starfield)
      // Elements are in world space, container offset creates parallax effect
      backgroundContainer.x = -cameraX * (1 - parallaxFactor);
      backgroundContainer.y = -cameraY * (1 - parallaxFactor);
      
      lastCameraPosRef.current = { x: cameraX, y: cameraY };
    };

    if (!app?.ticker) return;

    app.ticker.add(tickerCallback);

    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
      if (backgroundContainerRef.current) {
        cameraContainer.removeChild(backgroundContainerRef.current);
        backgroundContainerRef.current.destroy({ children: true });
      }
    };
  }, [app, cameraContainer]);

  return null;
}
