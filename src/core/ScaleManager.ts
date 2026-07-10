export class ScaleManager {
  private sequences: number[];

  constructor(sequences: number[] = [1, 2, 5]) {
    this.sequences = sequences;
  }

  /**
   * Calculates the best grid step interval based on the current scale (pixels per unit).
   * Ensures grid lines stay between ~50px and ~150px apart visually.
   */
  public getOptimalStep(currentScale: number): number {
    const targetVisualSpacing = 100; // Aim for 100px between major grid lines
    const rawStep = targetVisualSpacing / currentScale;

    // Find the nearest power of 10
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    // Snap to the closest sequence value (1, 2, or 5)
    let bestMatch = this.sequences[0];
    for (const seq of this.sequences) {
      if (normalized <= seq) {
        bestMatch = seq;
        break;
      }
    }

    return bestMatch * magnitude;
  }

  public getMinorStep(majorStep: number, divisions: number = 5): number {
    return majorStep / divisions;
  }
}
