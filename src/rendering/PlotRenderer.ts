import type { RenderContext } from "../types";
import type { Point } from "../entities/Point";
import type { FunctionCurve } from "../entities/FunctionCurve";
import type { LineSegment } from "../entities/LineSegment";
import type { Polygon } from "../entities/Polygon";

export class PlotRenderer {
  public drawPoints(context: RenderContext, points: Point[]) {
    const { ctx, viewport } = context;
    const [originX, originY] = viewport.worldToScreen(0, 0);

    points.forEach((point) => {
      const [sx, sy] = viewport.worldToScreen(point.x, point.y);

      if (point.showGuides) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = point.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, originY);
        ctx.moveTo(sx, sy);
        ctx.lineTo(originX, sy);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = point.color;
      ctx.beginPath();
      // Dynamically rendered based on custom or fallback point radius configuration
      ctx.arc(sx, sy, point.radius, 0, Math.PI * 2);
      ctx.fill();

      if (point.label) {
        // Automatically scales offset buffers proportionally to prevent coordinate textual overlapping
        const offset = point.radius + 3;
        ctx.fillStyle = "#333333";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(point.label, sx + offset, sy - offset);
      }
    });
  }

  public drawCurves(context: RenderContext, curves: FunctionCurve[]) {
    const { ctx, viewport, canvasWidth, canvasHeight } = context;

    curves.forEach((curve) => {
      ctx.save();
      ctx.strokeStyle = curve.color;
      // Applies custom line path weights directly from signature definitions
      ctx.lineWidth = curve.thickness;
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
      ctx.restore();
    });
  }

  public drawSegments(context: RenderContext, segments: LineSegment[]) {
    const { ctx, viewport } = context;
    segments.forEach((s) => {
      const [sx1, sy1] = viewport.worldToScreen(s.x1, s.y1);
      const [sx2, sy2] = viewport.worldToScreen(s.x2, s.y2);
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.thickness;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      ctx.restore();
    });
  }

  public drawPolygons(context: RenderContext, polygons: Polygon[]) {
    const { ctx, viewport } = context;
    polygons.forEach((poly) => {
      if (poly.points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      const [startSx, startSy] = viewport.worldToScreen(
        poly.points[0].x,
        poly.points[0].y,
      );
      ctx.moveTo(startSx, startSy);

      for (let i = 1; i < poly.points.length; i++) {
        const [sx, sy] = viewport.worldToScreen(
          poly.points[i].x,
          poly.points[i].y,
        );
        ctx.lineTo(sx, sy);
      }
      ctx.closePath();

      if (poly.fillColor) {
        ctx.fillStyle = poly.fillColor;
        ctx.fill();
      }
      if (poly.strokeColor) {
        ctx.strokeStyle = poly.strokeColor;
        ctx.lineWidth = poly.thickness;
        ctx.stroke();
      }
      ctx.restore();
    });
  }
}
