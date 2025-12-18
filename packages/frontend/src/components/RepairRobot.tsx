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
    
    // Robot body (main chassis - larger and more detailed)
    robot.roundRect(-8, -6, 16, 14, 3);
    robot.fill(0x4a9eff); // Blue body
    
    // Body detail - chest panel
    robot.roundRect(-6, -4, 12, 8, 2);
    robot.fill(0x2d7dd2); // Darker blue panel
    
    // Robot head (rounded top)
    robot.roundRect(-6, -14, 12, 10, 2);
    robot.fill(0x0ea5e9); // Cyan head
    
    // Head visor/face
    robot.roundRect(-4, -12, 8, 6, 1);
    robot.fill(0x1a3a5f); // Dark visor
    
    // Robot eyes (glowing)
    robot.circle(-2.5, -10, 1.2);
    robot.fill(0x00ff88); // Green glowing eye
    robot.circle(2.5, -10, 1.2);
    robot.fill(0x00ff88); // Green glowing eye
    
    // Robot shoulders
    robot.circle(-10, -2, 3);
    robot.fill(0x4a9eff); // Left shoulder
    robot.circle(10, -2, 3);
    robot.fill(0x4a9eff); // Right shoulder
    
    // Robot arms (extended for repair work)
    robot.roundRect(-12, -2, 4, 10, 1.5);
    robot.fill(0x2d7dd2); // Left arm
    robot.roundRect(8, -2, 4, 10, 1.5);
    robot.fill(0x2d7dd2); // Right arm
    
    // Robot hands/tools (repair tools)
    robot.circle(-10, 6, 2);
    robot.fill(0x0ea5e9); // Left tool
    robot.circle(10, 6, 2);
    robot.fill(0x0ea5e9); // Right tool
    
    // Robot legs (sturdy base)
    robot.roundRect(-5, 8, 4, 8, 1.5);
    robot.fill(0x2d7dd2); // Left leg
    robot.roundRect(1, 8, 4, 8, 1.5);
    robot.fill(0x2d7dd2); // Right leg
    
    // Robot feet
    robot.roundRect(-6, 15, 3, 2, 0.5);
    robot.fill(0x1a3a5f); // Left foot
    robot.roundRect(3, 15, 3, 2, 0.5);
    robot.fill(0x1a3a5f); // Right foot
    
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

    // Create sparks container
    const createSpark = (x: number, y: number) => {
      const spark = new Graphics();
      const sparkSize = 2 + Math.random() * 2;
      spark.circle(0, 0, sparkSize);
      spark.fill({ color: 0xffff00, alpha: 0.8 }); // Yellow spark
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
      }, 300);
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

        // Heal gradually - every 200ms heal 1.33 HP (20 HP over 3 seconds)
        // Only heal if not at max health
        const currentHealth = playerHealthRef.current;
        const currentMaxHealth = maxHealthRef.current;
        if (now - lastHealTimeRef.current >= 200 && currentHealth < currentMaxHealth) {
          onHealTick?.(1.33);
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
      app.ticker.add(tickerCallback);
    }

    return () => {
      if (tickerAddedRef.current && tickerCallbackRef.current) {
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

