import type { RenderContext } from "../types";
import { round } from "../utils/mathUtils";

export class AxisRenderer {
  public draw(context: RenderContext, majorStep: number) {
    const { ctx, viewport, canvasWidth, canvasHeight } = context;
    const [originX, originY] = viewport.worldToScreen(0, 0);

    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#333333";

    // Draw main axes lines
    ctx.beginPath();
    if (originY >= 0 && originY <= canvasHeight) {
      ctx.moveTo(0, originY);
      ctx.lineTo(canvasWidth, originY);
    }
    if (originX >= 0 && originX <= canvasWidth) {
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, canvasHeight);
    }
    ctx.stroke();

    // Helper function to draw an arrow
    const drawArrow = (x: number, y: number, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, 5);
      ctx.lineTo(-10, -5);
      ctx.fill();
      ctx.restore();
    };

    // Draw Arrows at screen edges
    if (originY >= 0 && originY <= canvasHeight) {
      drawArrow(canvasWidth, originY, 0); // Right arrow
      drawArrow(0, originY, Math.PI); // Left arrow
    }
    if (originX >= 0 && originX <= canvasWidth) {
      drawArrow(originX, 0, -Math.PI / 2); // Top arrow
      drawArrow(originX, canvasHeight, Math.PI / 2); // Bottom arrow
    }

    ctx.font = "12px sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";

    const [minX, maxY] = viewport.screenToWorld(0, 0);
    const [maxX, minY] = viewport.screenToWorld(canvasWidth, canvasHeight);
    const startX = Math.floor(minX / majorStep) * majorStep;
    const startY = Math.floor(minY / majorStep) * majorStep;

    // X-Axis Numbers & Ticks
    for (let x = startX; x <= maxX; x += majorStep) {
      if (Math.abs(x) < 0.0001) continue;
      const [screenX] = viewport.worldToScreen(x, 0);

      // Draw Tick Mark
      ctx.beginPath();
      ctx.moveTo(screenX, originY - 4);
      ctx.lineTo(screenX, originY + 4);
      ctx.stroke();

      // Draw Number
      ctx.fillText(
        String(round(x, 4)),
        screenX,
        Math.min(Math.max(originY + 8, 8), canvasHeight - 20),
      );
    }

    // Y-Axis Numbers & Ticks
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = startY; y <= maxY; y += majorStep) {
      if (Math.abs(y) < 0.0001) continue;
      const [, screenY] = viewport.worldToScreen(0, y);

      // Draw Tick Mark
      ctx.beginPath();
      ctx.moveTo(originX - 4, screenY);
      ctx.lineTo(originX + 4, screenY);
      ctx.stroke();

      // Draw Number
      ctx.fillText(
        String(round(y, 4)),
        Math.min(Math.max(originX - 8, 20), canvasWidth - 5),
        screenY,
      );
    }
  }
}
