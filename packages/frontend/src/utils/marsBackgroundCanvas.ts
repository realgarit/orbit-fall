import { MAP_WIDTH, MAP_HEIGHT } from '@shared/constants';

// Seeded random number generator for consistent generation
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate Mars planet on canvas
function drawMarsPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  seed: number
) {
  // 1. Atmosphere Glow
  // Outer soft glow
  const outerGlow = ctx.createRadialGradient(x, y, radius, x, y, radius + 25);
  outerGlow.addColorStop(0, 'rgba(205, 92, 92, 0.4)');
  outerGlow.addColorStop(1, 'rgba(205, 92, 92, 0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(x, y, radius + 25, 0, Math.PI * 2);
  ctx.fill();

  // 2. Main Surface
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#cd5c5c'; // Mars Red
  ctx.fill();

  // 3. Procedural Terrain
  const numFeatures = 40;
  for (let i = 0; i < numFeatures; i++) {
    const featureSeed = seed + i * 1000;
    const angle = seededRandom(featureSeed) * Math.PI * 2;
    const distance = seededRandom(featureSeed + 1) * radius * 0.85;
    const fX = x + Math.cos(angle) * distance;
    const fY = y + Math.sin(angle) * distance;

    const featureType = seededRandom(featureSeed + 2);

    if (featureType < 0.45) {
      // Crater
      const size = seededRandom(featureSeed + 3) * 12 + 4;
      ctx.beginPath();
      ctx.arc(fX, fY, size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(122, 42, 42, 0.8)';
      ctx.fill();
    } else {
      // Valley/Ridge
      const length = seededRandom(featureSeed + 3) * 40 + 20;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(139, 58, 58, 0.4)';
      ctx.beginPath();
      ctx.moveTo(fX, fY);
      ctx.lineTo(fX + Math.cos(angle) * length, fY + Math.sin(angle) * length);
      ctx.stroke();
    }
  }

  // 4. City Lights (Left Side)
  const numCityLights = 15;
  for (let i = 0; i < numCityLights; i++) {
    const lightSeed = seed + i * 777;
    const lightAngle = Math.PI * 0.8 + seededRandom(lightSeed) * Math.PI * 0.5;
    const lightDist = seededRandom(lightSeed + 1) * radius * 0.7;
    const lX = x + Math.cos(lightAngle) * lightDist;
    const lY = y + Math.sin(lightAngle) * lightDist;

    ctx.beginPath();
    ctx.arc(lX, lY, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 170, 0.8)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lX, lY, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 170, 0, 0.2)';
    ctx.fill();
  }

  // 5. Cloud Layer (Soft Wispy Clouds)
  for (let i = 0; i < 15; i++) {
    const cloudSeed = seed + i * 888;
    const cAngle = seededRandom(cloudSeed) * Math.PI * 2;
    const cDist = seededRandom(cloudSeed + 1) * radius * 0.85;
    const cX = x + Math.cos(cAngle) * cDist;
    const cY = y + Math.sin(cAngle) * cDist;
    const cSize = seededRandom(cloudSeed + 2) * 100 + 40;

    // Create a soft radial gradient for a "puff" effect
    const gradient = ctx.createRadialGradient(cX, cY, 0, cX, cY, cSize);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cX, cY, cSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Crescent Shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
  ctx.clip();

  ctx.beginPath();
  ctx.arc(x + radius * 0.4, y, radius * 1.2, 0, Math.PI * 2);
  ctx.rect(x + radius * 2, y - radius * 2, -radius * 4, radius * 4); // Invert fill
  ctx.fillStyle = 'rgba(20, 5, 5, 0.5)';
  ctx.fill();
  ctx.restore();
}

// Generate asteroid on canvas
function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  size: number
) {
  const color = '#6b6b6b'; // Grey-brown

  // Create irregular shape
  const points = 8;
  const angles: number[] = [];
  const radii: number[] = [];

  for (let i = 0; i < points; i++) {
    angles.push((i / points) * Math.PI * 2);
    radii.push(size * (0.7 + seededRandom(seed + i) * 0.3));
  }

  ctx.beginPath();
  ctx.moveTo(
    x + Math.cos(angles[0]) * radii[0],
    y + Math.sin(angles[0]) * radii[0]
  );

  for (let i = 1; i < points; i++) {
    ctx.lineTo(
      x + Math.cos(angles[i]) * radii[i],
      y + Math.sin(angles[i]) * radii[i]
    );
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Add some surface detail
  for (let i = 0; i < 3; i++) {
    const detailSeed = seed + i * 100;
    const detailAngle = seededRandom(detailSeed) * Math.PI * 2;
    const detailDistance = seededRandom(detailSeed + 1) * size * 0.5;
    const detailX = x + Math.cos(detailAngle) * detailDistance;
    const detailY = y + Math.sin(detailAngle) * detailDistance;
    ctx.beginPath();
    ctx.arc(detailX, detailY, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 74, 74, 0.8)';
    ctx.fill();
  }
}

// Generate nebula cloud on canvas
function drawNebula(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  width: number,
  height: number
) {
  // Create wispy cloud shape using multiple overlapping circles
  const numClouds = 5;
  for (let i = 0; i < numClouds; i++) {
    const cloudSeed = seed + i * 200;
    const cloudX = x + (seededRandom(cloudSeed) - 0.5) * width;
    const cloudY = y + (seededRandom(cloudSeed + 1) - 0.5) * height;
    const cloudSize = seededRandom(cloudSeed + 2) * 60 + 40;
    const alpha = seededRandom(cloudSeed + 3) * 0.2 + 0.1;

    // Dark grey-blue nebula
    ctx.beginPath();
    ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(42, 58, 74, ${alpha})`;
    ctx.fill();
  }
}

/**
 * Generate Mars background as a canvas image
 * Returns a canvas element with the Mars background rendered at full map scale
 */
export function generateMarsBackgroundCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Mars position (center of map)
  const marsWorldX = MAP_WIDTH * 0.5;
  const marsWorldY = MAP_HEIGHT * 0.5;
  const marsRadius = 450;
  const marsSeed = 12345;

  // Draw Mars planet
  drawMarsPlanet(ctx, marsWorldX, marsWorldY, marsRadius, marsSeed);

  // Draw asteroids
  const numAsteroids = 5;
  for (let i = 0; i < numAsteroids; i++) {
    const asteroidSeed = 5000 + i * 1000;
    const asteroidSize = seededRandom(asteroidSeed) * 15 + 8;
    const asteroidX = MAP_WIDTH * (0.6 + seededRandom(asteroidSeed + 1) * 0.3);
    const asteroidY = MAP_HEIGHT * (0.1 + seededRandom(asteroidSeed + 2) * 0.2);
    drawAsteroid(ctx, asteroidX, asteroidY, asteroidSeed, asteroidSize);
  }

  // Draw nebulae
  const numNebulae = 3;
  for (let i = 0; i < numNebulae; i++) {
    const nebulaSeed = 10000 + i * 2000;
    let nebulaX: number;
    let nebulaY: number;

    if (i === 0) {
      // Upper-left
      nebulaX = MAP_WIDTH * 0.1;
      nebulaY = MAP_HEIGHT * 0.1;
    } else if (i === 1) {
      // Lower-right
      nebulaX = MAP_WIDTH * 0.7;
      nebulaY = MAP_HEIGHT * 0.8;
    } else {
      // Upper-right area
      nebulaX = MAP_WIDTH * (0.6 + seededRandom(nebulaSeed) * 0.2);
      nebulaY = MAP_HEIGHT * (0.1 + seededRandom(nebulaSeed + 1) * 0.2);
    }

    drawNebula(ctx, nebulaX, nebulaY, nebulaSeed, 200, 150);
  }

  return canvas;
}

/**
 * Get Mars background as a data URL (for use as image src)
 */
export function getMarsBackgroundDataURL(): string {
  const canvas = generateMarsBackgroundCanvas();
  return canvas.toDataURL('image/jpeg', 0.8); // Export as JPEG with 80% quality
}
