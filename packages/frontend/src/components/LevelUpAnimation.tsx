import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import '../styles/levelup.css';

export function LevelUpAnimation() {
  const showLevelUpAnimation = useGameStore((state) => state.showLevelUpAnimation);
  const levelUpNewLevel = useGameStore((state) => state.levelUpNewLevel);
  const setShowLevelUpAnimation = useGameStore((state) => state.setShowLevelUpAnimation);
  
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; randomX: number; randomY: number }>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // Generate random particles positioned around center
      const newParticles = Array.from({ length: 50 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 50;
        const distance = 20 + Math.random() * 30;
        return {
          id: i,
          x: 50 + Math.cos(angle) * distance,
          y: 50 + Math.sin(angle) * distance,
          delay: Math.random() * 0.5,
          randomX: 50 + Math.cos(angle) * distance,
          randomY: 50 + Math.sin(angle) * distance,
        };
      });
      setParticles(newParticles);

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
              ['--random-x' as string]: particle.randomX,
              ['--random-y' as string]: particle.randomY,
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

