'use client';

import { useCallback } from 'react';

/**
 * Returns a `fireConfetti` function that launches a themed celebratory confetti
 * burst. The colors match the app's forest-green / warm-cream palette.
 *
 * Usage:
 *   const fireConfetti = useConfetti();
 *   fireConfetti(); // call inside a useEffect or event handler
 */
export function useConfetti() {
  const fireConfetti = useCallback(async () => {
    // Dynamically import so the ~6 KB bundle is not included in every page.
    const confetti = (await import('canvas-confetti')).default;

    // Brand-matched colours: forest green, mint, amber, warm cream, sage
    const colors = ['#4a7c59', '#c8e8d0', '#f8e0a8', '#f0e8db', '#78a886', '#ffffff'];

    // First burst — wide spread from bottom-centre
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { x: 0.5, y: 0.65 },
      colors,
      startVelocity: 45,
      gravity: 0.9,
      scalar: 1.1,
    });

    // Second burst slightly delayed — two side cannons for drama
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        startVelocity: 40,
        scalar: 1.0,
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        startVelocity: 40,
        scalar: 1.0,
      });
    }, 150);
  }, []);

  return fireConfetti;
}
