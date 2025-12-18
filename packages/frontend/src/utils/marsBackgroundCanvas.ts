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
  // Mars colors - reddish-orange palette
  const baseColor = '#cd5c5c'; // Mars red
  const darkColor = '#8b3a3a'; // Darker red
  const craterColor = '#7a2a2a'; // Deep crater color
  
  // Draw main planet circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();
  
  // Add procedural terrain features (craters, valleys, mountains)
  const numFeatures = 20;
  for (let i = 0; i < numFeatures; i++) {
    const featureSeed = seed + i * 1000;
    const angle = seededRandom(featureSeed) * Math.PI * 2;
    const distance = seededRandom(featureSeed + 1) * radius * 0.7; // Within 70% of radius
    const featureX = x + Math.cos(angle) * distance;
    const featureY = y + Math.sin(angle) * distance;
    
    const featureType = seededRandom(featureSeed + 2);
    
    if (featureType < 0.4) {
      // Crater
      const craterSize = seededRandom(featureSeed + 3) * 15 + 5;
      ctx.beginPath();
      ctx.arc(featureX, featureY, craterSize, 0, Math.PI * 2);
      ctx.fillStyle = craterColor;
      ctx.fill();
      // Crater rim highlight
      ctx.beginPath();
      ctx.arc(featureX, featureY, craterSize * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = darkColor;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    } else if (featureType < 0.7) {
      // Mountain/ridge
      const ridgeLength = seededRandom(featureSeed + 3) * 20 + 10;
      const ridgeWidth = seededRandom(featureSeed + 4) * 3 + 1;
      ctx.beginPath();
      ctx.ellipse(featureX, featureY, ridgeLength, ridgeWidth, 0, 0, Math.PI * 2);
      ctx.fillStyle = darkColor;
      ctx.fill();
    } else {
      // Valley/depression
      const valleySize = seededRandom(featureSeed + 3) * 12 + 4;
      ctx.beginPath();
      ctx.arc(featureX, featureY, valleySize, 0, Math.PI * 2);
      ctx.fillStyle = darkColor;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }
  
  // Add terminator line (day/night boundary) with gradient effect
  // Light source from the right
  const terminatorOffset = radius * 0.3; // 30% of planet in shadow
  for (let i = 0; i < 10; i++) {
    const alpha = 0.1 + (i / 10) * 0.3;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(
      x - radius,
      y - radius + i * (radius * 2 / 10),
      radius * 2,
      radius * 2 / 10
    );
  }
  
  // Add city lights on the dark side (left side)
  const numCityLights = 8;
  for (let i = 0; i < numCityLights; i++) {
    const lightSeed = seed + i * 500;
    const lightAngle = Math.PI + seededRandom(lightSeed) * Math.PI * 0.6; // Left side (180-240 degrees)
    const lightDistance = seededRandom(lightSeed + 1) * radius * 0.6;
    const lightX = x + Math.cos(lightAngle) * lightDistance;
    const lightY = y + Math.sin(lightAngle) * lightDistance;
    
    // Outer glow
    ctx.beginPath();
    ctx.arc(lightX, lightY, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 170, 0.3)';
    ctx.fill();
    // City light glow
    ctx.beginPath();
    ctx.arc(lightX, lightY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 170, 0.9)';
    ctx.fill();
  }
  
  // Add bright rim on the illuminated edge (right side)
  for (let i = 0; i < 5; i++) {
    const rimAngle = -Math.PI / 2 + seededRandom(seed + i) * Math.PI; // Right side
    const rimX = x + Math.cos(rimAngle) * radius;
    const rimY = y + Math.sin(rimAngle) * radius;
    ctx.beginPath();
    ctx.arc(rimX, rimY, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 170, 68, ${0.8 - i * 0.15})`;
    ctx.fill();
  }
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
  const marsRadius = 400;
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
