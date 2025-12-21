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
function generateMarsPlanet(radius: number, seed: number): Container {
  const planet = new Container();
  const surface = new Graphics();
  const atmosphere = new Graphics();
  const clouds = new Graphics();

  planet.addChild(atmosphere);
  planet.addChild(surface);
  planet.addChild(clouds);

  // 1. Atmosphere Glow (Soft outer aura)
  atmosphere.circle(0, 0, radius + 20);
  atmosphere.fill({ color: 0xff6b6b, alpha: 0.1 });
  atmosphere.circle(0, 0, radius + 10);
  atmosphere.fill({ color: 0xcd5c5c, alpha: 0.2 });

  // 2. Surface Terrain
  surface.circle(0, 0, radius);
  surface.fill(0xcd5c5c); // Base Mars red

  const numFeatures = 35;
  for (let i = 0; i < numFeatures; i++) {
    const featureSeed = seed + i * 1000;
    const angle = seededRandom(featureSeed) * Math.PI * 2;
    const distance = seededRandom(featureSeed + 1) * radius * 0.85;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    const featureType = seededRandom(featureSeed + 2);

    if (featureType < 0.45) {
      // Detailed Crater
      const size = seededRandom(featureSeed + 3) * 12 + 4;
      surface.circle(x, y, size);
      surface.fill({ color: 0x7a2a2a, alpha: 0.8 }); // Depth
      surface.circle(x - 1, y - 1, size * 0.8);
      surface.fill({ color: 0x8b3a3a, alpha: 0.5 }); // Rim shadow
    } else if (featureType < 0.8) {
      // Valleys & Ridges
      const length = seededRandom(featureSeed + 3) * 40 + 20;
      surface.ellipse(x, y, length, 2);
      surface.rotation = seededRandom(featureSeed + 4) * Math.PI;
      surface.fill({ color: 0x8b3a3a, alpha: 0.6 });
      surface.rotation = 0; // Reset for next draw
    }
  }

  // 3. Clouds (Top layer, partially transparent)
  const drawClouds = (g: Graphics) => {
    g.clear();
    const numClouds = 15;
    for (let i = 0; i < numClouds; i++) {
      const cloudSeed = seed + i * 333;
      const angle = seededRandom(cloudSeed) * Math.PI * 2;
      const distance = seededRandom(cloudSeed + 1) * radius * 0.9;
      const cloudWidth = seededRandom(cloudSeed + 2) * 100 + 40;
      const cloudHeight = seededRandom(cloudSeed + 3) * 15 + 5;

      g.ellipse(Math.cos(angle) * distance, Math.sin(angle) * distance, cloudWidth, cloudHeight);
      g.fill({ color: 0xffffff, alpha: 0.12 });
    }
  };
  drawClouds(clouds);

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
  const marsContainerRef = useRef<Container | null>(null);
  const asteroidsRef = useRef<Graphics[]>([]);
  const nebulaeRef = useRef<Graphics[]>([]);

  useEffect(() => {
    if (!app) return;

    // Create background container (on top of starfield)
    const backgroundContainer = new Container();
    cameraContainer.addChild(backgroundContainer);
    backgroundContainerRef.current = backgroundContainer;

    // Fixed world position for Mars
    const marsWorldX = MAP_WIDTH * 0.5;
    const marsWorldY = MAP_HEIGHT * 0.5;
    const marsRadius = 450;
    const marsSeed = 12345;

    // Generate Mars planet
    const mars = generateMarsPlanet(marsRadius, marsSeed);
    mars.x = marsWorldX;
    mars.y = marsWorldY;
    backgroundContainer.addChild(mars);
    marsContainerRef.current = mars;

    // Shadow Layer (on top of planet)
    const planetShadow = new Graphics();
    // Dark crescent shadow
    planetShadow.circle(0, 0, marsRadius + 1);
    planetShadow.fill({ color: 0x1a0a0a, alpha: 0.4 }); // Very dark reddish shadow

    // Mask for the crescent
    const shadowMask = new Graphics();
    shadowMask.circle(marsRadius * 0.4, 0, marsRadius * 1.2);
    shadowMask.fill(0xffffff);
    planetShadow.mask = shadowMask;

    mars.addChild(planetShadow);
    mars.addChild(shadowMask);

    // City lights on the dark side
    const lightsContainer = new Container();
    mars.addChildAt(lightsContainer, 2); // Above surface, below clouds/shadow

    const numCityLights = 12;
    for (let i = 0; i < numCityLights; i++) {
      const g = new Graphics();
      const lightSeed = 999 + i * 77;
      const angle = Math.PI * 0.8 + seededRandom(lightSeed) * Math.PI * 0.5;
      const dist = seededRandom(lightSeed + 1) * marsRadius * 0.7;

      g.circle(Math.cos(angle) * dist, Math.sin(angle) * dist, 2);
      g.fill({ color: 0xffffaa, alpha: 0.6 });
      g.circle(Math.cos(angle) * dist, Math.sin(angle) * dist, 4);
      g.fill({ color: 0xffaa00, alpha: 0.2 });
      lightsContainer.addChild(g);
    }

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

    const tickerCallback = (ticker: any) => {
      const cameraX = cameraContainer.x;
      const cameraY = cameraContainer.y;
      const delta = ticker.deltaTime;

      backgroundContainer.x = -cameraX * (1 - parallaxFactor);
      backgroundContainer.y = -cameraY * (1 - parallaxFactor);

      // Rotate Mars layers
      const mars = marsContainerRef.current;
      if (mars) {
        const surface = mars.children[1] as Container;
        const clouds = mars.children[2] as Graphics;
        const lights = mars.children[4] as Container;

        if (surface) surface.rotation += 0.0002 * delta;
        if (clouds) clouds.rotation += 0.0004 * delta;
        if (lights) lights.rotation += 0.0002 * delta;
      }

      // Rotate asteroids
      asteroidsRef.current.forEach((ast, i) => {
        ast.rotation += (0.005 + (i * 0.002)) * delta;
      });
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
