import React, { useEffect, useState, useRef } from 'react';
import { ShopMasterLogo } from './ShopMasterLogo';

export interface ShopMasterLoaderProps {
  /**
   * External loading state (e.g. from PosContext fetchAllData)
   */
  isLoading?: boolean;
  /**
   * Callback fired when the exit transition finishes
   */
  onComplete?: () => void;
  /**
   * Duration in ms for the progressive reveal sequence + hold (default: 1800ms)
   */
  minDuration?: number;
}

/**
 * Premium ShopMaster Progressive Reveal Loading Animation
 *
 * Sequence:
 * 1. Two horizontal speed lines reveal one by one (0.08s - 0.70s)
 * 2. Main blue shopping-cart faceted geometric shape reveals from left to right (0.58s - 1.20s)
 * 3. Circular blue element reveals last (1.10s - 1.48s)
 * 4. Briefly holds the fully assembled logo (1.48s - 1.85s)
 * 5. Smoothly dissolves/exits from the loading page into the dashboard
 */
export const ShopMasterLoader: React.FC<ShopMasterLoaderProps> = ({
  isLoading = true,
  onComplete,
  minDuration = 1800,
}) => {
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const completionCalledRef = useRef(false);

  useEffect(() => {
    // Respect user's reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Immediate quick exit for users who prefer reduced motion
      const quickExitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 300);
      return () => clearTimeout(quickExitTimer);
    }

    // Run progressive reveal sequence and brief assembled display
    const animTimer = setTimeout(() => {
      setAnimationFinished(true);
    }, minDuration);

    return () => clearTimeout(animTimer);
  }, [minDuration]);

  // "Loading animation ses hole loading page teke ber hobe"
  // When animation finishes, immediately begin exit!
  // If background data loading is still running, allow max 300ms, then exit unconditionally.
  useEffect(() => {
    if (!animationFinished || isExiting || isRemoved) return;

    if (!isLoading) {
      setIsExiting(true);
    } else {
      const fallbackTimer = setTimeout(() => {
        setIsExiting(true);
      }, 300);
      return () => clearTimeout(fallbackTimer);
    }
  }, [animationFinished, isLoading, isExiting, isRemoved]);

  // Smooth cross-dissolve fade-out
  useEffect(() => {
    if (isExiting && !isRemoved) {
      const exitTimer = setTimeout(() => {
        setIsRemoved(true);
        if (!completionCalledRef.current) {
          completionCalledRef.current = true;
          onComplete?.();
        }
      }, 450); // 450ms smooth fade-out

      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, isRemoved, onComplete]);

  if (isRemoved) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center select-none transition-opacity duration-450 ease-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading ShopMaster"
    >
      <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center p-2">
        <ShopMasterLogo
          size="100%"
          className="w-full h-full drop-shadow-sm"
          animated={!isExiting}
        />
      </div>
    </div>
  );
};
