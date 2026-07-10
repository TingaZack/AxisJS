export const Easing = {
  // Smooth deceleration
  easeOutExpo: (x: number): number => {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
  },
  // Linear fallback
  linear: (x: number): number => x,
};
