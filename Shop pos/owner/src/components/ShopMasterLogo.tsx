import React, { useId } from 'react';

export interface ShopMasterLogoProps {
  /**
   * Width & height in pixels (or CSS unit)
   * Defaults to 48
   */
  size?: number | string;
  /**
   * Optional custom className for outer SVG
   */
  className?: string;
  /**
   * Whether to run the progressive reveal loading animation sequence
   */
  animated?: boolean;
}

/**
 * ShopMaster Blue & White Vector Logo
 * Faithfully recreated from original geometry:
 * - Two horizontal speed lines (pill capsules)
 * - Main blue shopping-cart faceted shape (trapezoid body + bright cyan wing + lower fold)
 * - Circular blue wheel element
 */
export const ShopMasterLogo: React.FC<ShopMasterLogoProps> = ({
  size = 48,
  className = '',
  animated = false,
}) => {
  const rawId = useId();
  const id = `sm-${rawId.replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 500 500"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 overflow-visible select-none ${className}`}
      aria-label="ShopMaster"
      role="img"
    >
      <defs>
        {/* Gradients matching original vibrant blue palette */}
        <linearGradient id={`${id}-speed1`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0099FF" />
          <stop offset="100%" stopColor="#0052FF" />
        </linearGradient>

        <linearGradient id={`${id}-speed2`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0088FF" />
          <stop offset="100%" stopColor="#0048FF" />
        </linearGradient>

        <linearGradient id={`${id}-cart-left`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0058FF" />
          <stop offset="100%" stopColor="#0038E8" />
        </linearGradient>

        <linearGradient id={`${id}-cart-right`} x1="20%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0092FF" />
          <stop offset="50%" stopColor="#006EFF" />
          <stop offset="100%" stopColor="#0048FF" />
        </linearGradient>

        <linearGradient id={`${id}-cart-fin`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0044FA" />
          <stop offset="100%" stopColor="#0026D4" />
        </linearGradient>

        <linearGradient id={`${id}-wheel`} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#0094FF" />
          <stop offset="50%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#003DEF" />
        </linearGradient>

        {animated && (
          <style>{`
            @keyframes smRevealSpeed1 {
              0% {
                -webkit-clip-path: inset(0 100% 0 0 round 18px);
                clip-path: inset(0 100% 0 0 round 18px);
                opacity: 0;
              }
              15% {
                opacity: 1;
              }
              100% {
                -webkit-clip-path: inset(0 0% 0 0 round 18px);
                clip-path: inset(0 0% 0 0 round 18px);
                opacity: 1;
              }
            }

            @keyframes smRevealSpeed2 {
              0% {
                -webkit-clip-path: inset(0 100% 0 0 round 18px);
                clip-path: inset(0 100% 0 0 round 18px);
                opacity: 0;
              }
              15% {
                opacity: 1;
              }
              100% {
                -webkit-clip-path: inset(0 0% 0 0 round 18px);
                clip-path: inset(0 0% 0 0 round 18px);
                opacity: 1;
              }
            }

            @keyframes smRevealCart {
              0% {
                -webkit-clip-path: inset(0 100% 0 0);
                clip-path: inset(0 100% 0 0);
                opacity: 0;
              }
              20% {
                opacity: 1;
              }
              100% {
                -webkit-clip-path: inset(0 0% 0 0);
                clip-path: inset(0 0% 0 0);
                opacity: 1;
              }
            }

            @keyframes smRevealWheel {
              0% {
                -webkit-clip-path: inset(0 100% 0 0 round 50%);
                clip-path: inset(0 100% 0 0 round 50%);
                opacity: 0;
                transform: scale(0.65);
              }
              25% {
                opacity: 1;
              }
              100% {
                -webkit-clip-path: inset(0 0% 0 0 round 50%);
                clip-path: inset(0 0% 0 0 round 50%);
                opacity: 1;
                transform: scale(1);
              }
            }

            .${id}-speed1 {
              -webkit-clip-path: inset(0 100% 0 0 round 18px);
              clip-path: inset(0 100% 0 0 round 18px);
              opacity: 0;
              animation: smRevealSpeed1 0.42s cubic-bezier(0.16, 1, 0.3, 1) 0.08s forwards;
            }

            .${id}-speed2 {
              -webkit-clip-path: inset(0 100% 0 0 round 18px);
              clip-path: inset(0 100% 0 0 round 18px);
              opacity: 0;
              animation: smRevealSpeed2 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.32s forwards;
            }

            .${id}-cart {
              -webkit-clip-path: inset(0 100% 0 0);
              clip-path: inset(0 100% 0 0);
              opacity: 0;
              animation: smRevealCart 0.62s cubic-bezier(0.2, 1, 0.3, 1) 0.58s forwards;
            }

            .${id}-wheel {
              -webkit-clip-path: inset(0 100% 0 0 round 50%);
              clip-path: inset(0 100% 0 0 round 50%);
              opacity: 0;
              transform-box: fill-box;
              transform-origin: center;
              animation: smRevealWheel 0.38s cubic-bezier(0.34, 1.45, 0.64, 1) 1.1s forwards;
            }

            @media (prefers-reduced-motion: reduce) {
              .${id}-speed1,
              .${id}-speed2,
              .${id}-cart,
              .${id}-wheel {
                -webkit-clip-path: none !important;
                clip-path: none !important;
                opacity: 1 !important;
                transform: none !important;
                animation: none !important;
              }
            }
          `}</style>
        )}
      </defs>

      {/* Scaled & Centered Geometry: viewBox 500x500 with generous presence */}
      <g transform="translate(250, 250) scale(1.18) translate(-250, -250)">
        {/* 1. Horizontal Speed Line 1 (Upper Pill) */}
        <rect
          x="36"
          y="156"
          width="132"
          height="36"
          rx="18"
          fill={`url(#${id}-speed1)`}
          className={animated ? `${id}-speed1` : undefined}
        />

        {/* 2. Horizontal Speed Line 2 (Lower Pill) */}
        <rect
          x="88"
          y="216"
          width="118"
          height="36"
          rx="18"
          fill={`url(#${id}-speed2)`}
          className={animated ? `${id}-speed2` : undefined}
        />

        {/* 3. Main Blue Shopping-Cart-Like Geometric Shape */}
        <g className={animated ? `${id}-cart` : undefined}>
          {/* 3a. Lower Fin / Fold */}
          <path
            d="M 252 270 C 255 292 268 328 288 357 C 291 361 297 364 302 361 C 304 360 306 357 308 354 L 362 270 Z"
            fill={`url(#${id}-cart-fin)`}
          />

          {/* 3b. Left Trapezoid Body */}
          <path
            d="M 198 132 L 332 132 L 362 270 L 254 270 L 184 148 C 182 144 182 139 185 135 C 188 132 193 132 198 132 Z"
            fill={`url(#${id}-cart-left)`}
          />

          {/* 3c. Right Cyan-Blue Triangular Wing */}
          <path
            d="M 332 132 L 416 132 C 423 132 429 137 430 144 C 431 148 429 152 426 156 L 362 270 Z"
            fill={`url(#${id}-cart-right)`}
          />
        </g>

        {/* 4. Circular Blue Element (Wheel) */}
        <circle
          cx="206"
          cy="309"
          r="40"
          fill={`url(#${id}-wheel)`}
          className={animated ? `${id}-wheel` : undefined}
        />
      </g>
    </svg>
  );
};
