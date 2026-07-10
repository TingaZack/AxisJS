import { Point } from "../entities/Point";
import { FunctionCurve } from "../entities/FunctionCurve";
import type { RenderContext } from "../types";
import type { LineSegment } from "../entities/LineSegment";
import type { Polygon } from "../entities/Polygon";

export class PlotRenderer {
  public drawPoints(context: RenderContext, points: Point[]) {
    const { ctx, viewport } = context;
    const [originX, originY] = viewport.worldToScreen(0, 0);

    points.forEach((point) => {
      const [sx, sy] = viewport.worldToScreen(point.x, point.y);

      // Draw Dashed Guides if requested
      if (point.showGuides) {
        ctx.save();
        ctx.setLineDash([5, 5]); // 5px dash, 5px space
        ctx.strokeStyle = point.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, originY); // Line to X axis
        ctx.moveTo(sx, sy);
        ctx.lineTo(originX, sy); // Line to Y axis
        ctx.stroke();
        ctx.restore(); // Clear the dash setting
      }

      // Draw the point
      ctx.fillStyle = point.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw the floating label if it exists
      if (point.label) {
        ctx.fillStyle = "#333333";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        // Offset the text slightly up and to the right of the point
        ctx.fillText(point.label, sx + 8, sy - 8);
      }
    });
  }

  public drawPolygons(context: RenderContext, polygons: Polygon[]) {
    const { ctx, viewport } = context;

    polygons.forEach((poly) => {
      if (poly.points.length < 3) return; // Need at least 3 points for a shape

      ctx.fillStyle = poly.fillColor;
      ctx.strokeStyle = poly.strokeColor;
      ctx.lineWidth = poly.thickness;
      ctx.beginPath();

      poly.points.forEach((p, index) => {
        const [sx, sy] = viewport.worldToScreen(p.x, p.y);
        if (index === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });

      ctx.closePath();
      if (poly.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
    });
  }

  public drawSegments(context: RenderContext, segments: LineSegment[]) {
    const { ctx, viewport } = context;

    segments.forEach((segment) => {
      const [sx1, sy1] = viewport.worldToScreen(segment.x1, segment.y1);
      const [sx2, sy2] = viewport.worldToScreen(segment.x2, segment.y2);

      ctx.strokeStyle = segment.color;
      ctx.lineWidth = segment.thickness;

      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    });
  }

  public drawCurves(context: RenderContext, curves: FunctionCurve[]) {
    const { ctx, viewport, canvasWidth, canvasHeight } = context;

    curves.forEach((curve) => {
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      let prevPy = 0;
      for (let px = 0; px <= canvasWidth; px += 2) {
        const [worldX] = viewport.screenToWorld(px, 0);
        const worldY = curve.fn(worldX);
        const [, py] = viewport.worldToScreen(worldX, worldY);

        if (px !== 0 && Math.abs(py - prevPy) > canvasHeight * 1.5) {
          ctx.moveTo(px, py);
        } else if (px === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
        prevPy = py;
      }
      ctx.stroke();
    });
  }
}
