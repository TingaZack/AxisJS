export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Rounds a number to a specified precision to avoid floating-point artifacts
export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
