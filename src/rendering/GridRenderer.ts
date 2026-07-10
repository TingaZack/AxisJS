import type { RenderContext } from "../types";

export class GridRenderer {
  public draw(context: RenderContext, majorStep: number, minorStep: number) {
    const { ctx, viewport, canvasWidth, canvasHeight } = context;

    const [minX, maxY] = viewport.screenToWorld(0, 0);
    const [maxX, minY] = viewport.screenToWorld(canvasWidth, canvasHeight);

    const startX = Math.floor(minX / minorStep) * minorStep;
    const startY = Math.floor(minY / minorStep) * minorStep;

    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;

    ctx.beginPath();

    for (let x = startX; x <= maxX; x += minorStep) {
      // Safe floating-point check
      const ratio = x / majorStep;
      const isMajorLine = Math.abs(ratio - Math.round(ratio)) < 0.001;

      if (!isMajorLine) {
        const [screenX] = viewport.worldToScreen(x, 0);
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvasHeight);
      }
    }

    for (let y = startY; y <= maxY; y += minorStep) {
      // Safe floating-point check
      const ratio = y / majorStep;
      const isMajorLine = Math.abs(ratio - Math.round(ratio)) < 0.001;

      if (!isMajorLine) {
        const [, screenY] = viewport.worldToScreen(0, y);
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvasWidth, screenY);
      }
    }
    ctx.stroke();

    ctx.strokeStyle = "#b0b0b0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const majorStartX = Math.floor(minX / majorStep) * majorStep;
    const majorStartY = Math.floor(minY / majorStep) * majorStep;

    for (let x = majorStartX; x <= maxX; x += majorStep) {
      const [screenX] = viewport.worldToScreen(x, 0);
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvasHeight);
    }

    for (let y = majorStartY; y <= maxY; y += majorStep) {
      const [, screenY] = viewport.worldToScreen(0, y);
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvasWidth, screenY);
    }
    ctx.stroke();
  }
}
