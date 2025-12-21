import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';

interface RepairRobotProps {
  app: Application;
  cameraContainer: Container;
  shipPosition: { x: number; y: number };
  onRepairComplete: () => void;
  onHealTick?: (amount: number) => void;
  playerHealth: number;
  maxHealth: number;
}

const REPAIR_DURATION = 3000; // 3 seconds repair time
const ORBIT_RADIUS = 40; // Distance from ship
const ORBIT_SPEED = 0.3; // Radians per second (very slow orbit like a mechanic)

export function RepairRobot({ app, cameraContainer, shipPosition, onRepairComplete, onHealTick, playerHealth, maxHealth }: RepairRobotProps) {
  const robotRef = useRef<Graphics | null>(null);
  const sparksRef = useRef<Graphics[]>([]);
  const startTimeRef = useRef(Date.now());
  const angleRef = useRef(0);
  const shipPositionRef = useRef(shipPosition);
  const tickerAddedRef = useRef(false);
  const tickerCallbackRef = useRef<((ticker: any) => void) | null>(null);
  const lastHealTimeRef = useRef(0);
  const playerHealthRef = useRef(playerHealth);
  const maxHealthRef = useRef(maxHealth);

  useEffect(() => {
    shipPositionRef.current = shipPosition;
  }, [shipPosition]);

  useEffect(() => {
    playerHealthRef.current = playerHealth;
  }, [playerHealth]);

  useEffect(() => {
    maxHealthRef.current = maxHealth;
  }, [maxHealth]);

  useEffect(() => {
    if (!app || !cameraContainer) return;

    // Create robot visual - better looking repair robot
    const robot = new Graphics();

    // 1. Main Drone Body (Top-down circular chassis)
    robot.circle(0, 0, 10);
    robot.fill(0x4a9eff); // Blue body
    robot.stroke({ width: 1.5, color: 0x1a3a5f }); // Dark border

    // 2. Inner Detail (Metallic plate)
    robot.circle(0, 0, 7);
    robot.fill(0x2d7dd2);

    // 3. Central Sensor/Dome (The "Head" from above)
    robot.circle(0, -2, 5);
    robot.fill(0x0ea5e9);

    // 4. Glowing Eye/Sensor
    robot.circle(0, -4, 2);
    robot.fill({ color: 0x00ffff, alpha: 0.9 }); // Cyan glow

    // 5. Mechanical Arms (Extended toward ship)
    const drawArm = (side: number) => {
      const startX = 8 * side;
      const startY = 2;

      // Arm segments
      robot.moveTo(startX, startY);
      robot.lineTo(12 * side, -5); // Shoulder to elbow
      robot.lineTo(8 * side, -15); // Elbow to hand
      robot.stroke({ width: 3, color: 0x1e293b });

      // Welder tool at end
      robot.rect(6 * side, -18, 4, 3);
      robot.fill(0x64748b);

      // Welder tip (glow point)
      robot.circle(8 * side, -18, 1);
      robot.fill(0x00ffff);
    };

    drawArm(-1); // Left arm
    drawArm(1);  // Right arm

    // 6. Side Thrusters (for stability)
    robot.ellipse(-10, 5, 3, 5);
    robot.fill(0x1a3a5f);
    robot.ellipse(10, 5, 3, 5);
    robot.fill(0x1a3a5f);

    // 7. Exhaust Ports
    robot.circle(-10, 8, 2);
    robot.fill({ color: 0x00ffff, alpha: 0.3 });
    robot.circle(10, 8, 2);
    robot.fill({ color: 0x00ffff, alpha: 0.3 });

    // Initial position (orbit around ship)
    const initialAngle = Math.random() * Math.PI * 2;
    angleRef.current = initialAngle;
    robot.x = shipPosition.x + Math.cos(initialAngle) * ORBIT_RADIUS;
    robot.y = shipPosition.y + Math.sin(initialAngle) * ORBIT_RADIUS;

    // Face toward ship
    const dx = shipPosition.x - robot.x;
    const dy = shipPosition.y - robot.y;
    robot.rotation = Math.atan2(dy, dx) + Math.PI / 2;

    cameraContainer.addChild(robot);
    robotRef.current = robot;

    // Create electric spark/bolt
    const createSpark = (x: number, y: number) => {
      const spark = new Graphics();

      // Draw a jagged electric bolt
      const segments = 3;
      const size = 6 + Math.random() * 8;
      let curX = 0;
      let curY = 0;

      spark.moveTo(0, 0);
      for (let i = 0; i < segments; i++) {
        curX += (Math.random() - 0.5) * size;
        curY += (Math.random() - 0.5) * size;
        spark.lineTo(curX, curY);
      }

      // Electric blue glow
      spark.stroke({ width: 1.5, color: 0x00ffff, alpha: 0.8 });
      // White core
      spark.stroke({ width: 0.5, color: 0xffffff, alpha: 1.0 });

      spark.x = x;
      spark.y = y;
      cameraContainer.addChild(spark);
      sparksRef.current.push(spark);

      // Remove spark after animation
      setTimeout(() => {
        if (spark.parent) {
          cameraContainer.removeChild(spark);
          spark.destroy();
        }
        const index = sparksRef.current.indexOf(spark);
        if (index > -1) {
          sparksRef.current.splice(index, 1);
        }
      }, 200);
    };

    // Animation ticker
    if (!tickerAddedRef.current) {
      tickerAddedRef.current = true;
      const tickerCallback = (ticker: any) => {
        const robot = robotRef.current;
        if (!robot) return;

        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        const delta = ticker.deltaTime;

        // Heal gradually - repair rate scales with max health
        // Repairs to full health in ~60 seconds (1 minute) regardless of max health
        // Every 200ms, heal 0.333% of max health (60 seconds / 200ms = 300 ticks, 1/300 = 0.333%)
        // Only heal if not at max health
        const currentHealth = playerHealthRef.current;
        const currentMaxHealth = maxHealthRef.current;
        if (now - lastHealTimeRef.current >= 200 && currentHealth < currentMaxHealth) {
          const healAmount = currentMaxHealth / 300; // 1/300 of max health per 200ms = full repair in 60 seconds
          onHealTick?.(healAmount);
          lastHealTimeRef.current = now;
        }

        // Check if repair is complete - repair until HP is at full health
        if (currentHealth >= currentMaxHealth) {
          onRepairComplete();
          return;
        }

        const currentShipPos = shipPositionRef.current;

        // Orbit around ship - use actual time elapsed for consistent slow speed
        // Calculate angle based on elapsed time in seconds
        const elapsedSeconds = elapsed / 1000;
        angleRef.current = (elapsedSeconds * ORBIT_SPEED) % (Math.PI * 2);
        const orbitX = currentShipPos.x + Math.cos(angleRef.current) * ORBIT_RADIUS;
        const orbitY = currentShipPos.y + Math.sin(angleRef.current) * ORBIT_RADIUS;

        robot.x = orbitX;
        robot.y = orbitY;

        // Face toward ship
        const dx = currentShipPos.x - robot.x;
        const dy = currentShipPos.y - robot.y;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          robot.rotation = Math.atan2(dy, dx) + Math.PI / 2;
        }

        // Spawn sparks periodically (every 100ms)
        if (elapsed % 100 < delta * 16) { // Approximate 100ms check
          // Spawn sparks at robot position and near ship
          const sparkCount = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < sparkCount; i++) {
            const sparkAngle = Math.random() * Math.PI * 2;
            const sparkDistance = 5 + Math.random() * 15;
            const sparkX = robot.x + Math.cos(sparkAngle) * sparkDistance;
            const sparkY = robot.y + Math.sin(sparkAngle) * sparkDistance;
            createSpark(sparkX, sparkY);
          }

          // Also spawn sparks near ship (repair effect)
          const shipSparkCount = 1 + Math.floor(Math.random() * 2);
          for (let i = 0; i < shipSparkCount; i++) {
            const sparkAngle = Math.random() * Math.PI * 2;
            const sparkDistance = 10 + Math.random() * 20;
            const sparkX = currentShipPos.x + Math.cos(sparkAngle) * sparkDistance;
            const sparkY = currentShipPos.y + Math.sin(sparkAngle) * sparkDistance;
            createSpark(sparkX, sparkY);
          }
        }

        // Update spark positions (move them slightly)
        sparksRef.current.forEach((spark) => {
          spark.alpha -= 0.02 * delta;
          spark.scale.x -= 0.01 * delta;
          spark.scale.y -= 0.01 * delta;
        });
      };

      tickerCallbackRef.current = tickerCallback;
      if (app?.ticker) {
        app.ticker.add(tickerCallback);
      }
    }

    return () => {
      if (tickerAddedRef.current && tickerCallbackRef.current && app?.ticker) {
        app.ticker.remove(tickerCallbackRef.current);
        tickerAddedRef.current = false;
        tickerCallbackRef.current = null;
      }
      if (robotRef.current) {
        cameraContainer.removeChild(robotRef.current);
        robotRef.current.destroy();
        robotRef.current = null;
      }
      sparksRef.current.forEach((spark) => {
        if (spark.parent) {
          cameraContainer.removeChild(spark);
          spark.destroy();
        }
      });
      sparksRef.current = [];
    };
  }, [app, cameraContainer, onRepairComplete, playerHealth, maxHealth]);

  return null;
}

