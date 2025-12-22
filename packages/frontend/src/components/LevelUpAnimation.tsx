import { useEffect, useState, useRef, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import '../styles/levelup.css';

export function LevelUpAnimation() {
  const showLevelUpAnimation = useGameStore((state) => state.showLevelUpAnimation);
  const levelUpNewLevel = useGameStore((state) => state.levelUpNewLevel);
  const setShowLevelUpAnimation = useGameStore((state) => state.setShowLevelUpAnimation);
  
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoize particles generation to avoid recalculation
  const particles = useMemo(() => {
    if (!showLevelUpAnimation || levelUpNewLevel === null) return [];
    
    return Array.from({ length: 25 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 25;
      const distance = 20 + Math.random() * 30;
      const startX = 50 + Math.cos(angle) * distance;
      const startY = 50 + Math.sin(angle) * distance;
      // Calculate direction vector for animation (in viewport units)
      const dx = Math.cos(angle) * 15; // 15vw movement
      const dy = Math.sin(angle) * 15; // 15vh movement
      return {
        id: i,
        x: startX,
        y: startY,
        delay: Math.random() * 0.3,
        dx,
        dy,
      };
    });
  }, [showLevelUpAnimation, levelUpNewLevel]);

  useEffect(() => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (fadeOutTimerRef.current) {
      clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }

    if (showLevelUpAnimation && levelUpNewLevel !== null) {
      setIsVisible(true);

      // Auto-hide after animation completes
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        fadeOutTimerRef.current = setTimeout(() => {
          // Hide the animation in Zustand store
          setShowLevelUpAnimation(false, null);
        }, 500); // Wait for fade-out animation
      }, 3000); // Total animation duration
    } else {
      // If show becomes false, immediately hide and cleanup
      setIsVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
    };
  }, [showLevelUpAnimation, levelUpNewLevel, setShowLevelUpAnimation]);

  if (!showLevelUpAnimation || levelUpNewLevel === null) {
    return null;
  }

  return (
    <div className={`level-up-overlay ${isVisible ? 'visible' : ''}`}>
      {/* Particle background */}
      <div className="level-up-particles">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="level-up-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              ['--dx' as string]: `${particle.dx}vw`,
              ['--dy' as string]: `${particle.dy}vh`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="level-up-content">
        <div className="level-up-text-container">
          <div className="level-up-title">LEVEL UP!</div>
          <div className="level-up-level">
            <span className="level-up-level-label">You are now</span>
            <span className="level-up-level-number">{levelUpNewLevel}</span>
          </div>
        </div>

        {/* Glow rings */}
        <div className="level-up-glow-ring ring-1" />
        <div className="level-up-glow-ring ring-2" />
        <div className="level-up-glow-ring ring-3" />
      </div>
    </div>
  );
}

