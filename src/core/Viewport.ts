export class Viewport {
  public scale: number;
  public offsetX: number;
  public offsetY: number;

  // Animation targets for smooth zooming/panning
  private targetScale: number;
  private targetOffsetX: number;
  private targetOffsetY: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.scale = 50;
    this.targetScale = 50;

    this.offsetX = canvasWidth / 2;
    this.targetOffsetX = this.offsetX;

    this.offsetY = canvasHeight / 2;
    this.targetOffsetY = this.offsetY;
  }

  public worldToScreen(x: number, y: number): [number, number] {
    return [
      x * this.scale + this.offsetX,
      this.offsetY - y * this.scale, // Inverted Y
    ];
  }

  public screenToWorld(px: number, py: number): [number, number] {
    return [
      (px - this.offsetX) / this.scale,
      (this.offsetY - py) / this.scale, // Inverted Y
    ];
  }

  public pan(dx: number, dy: number) {
    this.targetOffsetX += dx;
    this.targetOffsetY += dy;
  }

  public zoom(factor: number, screenX: number, screenY: number) {
    const [worldX, worldY] = this.screenToWorld(screenX, screenY);

    this.targetScale *= factor;
    this.targetScale = Math.max(1, Math.min(this.targetScale, 5000));

    this.targetOffsetX = screenX - worldX * this.targetScale;
    this.targetOffsetY = screenY + worldY * this.targetScale;
  }

  /**
   * NEW: Allows external controllers (like animateToFit) to update the
   * internal targets so the viewport doesn't fight the programmatic animation.
   */
  public setTarget(scale: number, offsetX: number, offsetY: number) {
    this.targetScale = scale;
    this.targetOffsetX = offsetX;
    this.targetOffsetY = offsetY;
  }

  public update(): boolean {
    let isAnimating = false;
    const lerpSpeed = 0.2;

    if (Math.abs(this.scale - this.targetScale) > 0.01) {
      this.scale += (this.targetScale - this.scale) * lerpSpeed;
      isAnimating = true;
    } else {
      this.scale = this.targetScale;
    }

    if (
      Math.abs(this.offsetX - this.targetOffsetX) > 0.1 ||
      Math.abs(this.offsetY - this.targetOffsetY) > 0.1
    ) {
      this.offsetX += (this.targetOffsetX - this.offsetX) * lerpSpeed;
      this.offsetY += (this.targetOffsetY - this.offsetY) * lerpSpeed;
      isAnimating = true;
    } else {
      this.offsetX = this.targetOffsetX;
      this.offsetY = this.targetOffsetY;
    }

    return isAnimating;
  }
}
