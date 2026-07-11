import { Viewport } from "./core/Viewport";
import { ScaleManager } from "./core/ScaleManager";
import { InputController } from "./core/InputController";
import { GridRenderer } from "./rendering/GridRenderer";
import { AxisRenderer } from "./rendering/AxisRenderer";
import { PlotRenderer } from "./rendering/PlotRenderer";
import { Point } from "./entities/Point";
import { FunctionCurve } from "./entities/FunctionCurve";
import { LineSegment } from "./entities/LineSegment";
import { Polygon } from "./entities/Polygon";
import type { PlaneConfig } from "./types";

export class CartesianPlane {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewport: Viewport;
  private scaleManager: ScaleManager;
  private inputController: InputController;

  private gridRenderer: GridRenderer;
  private axisRenderer: AxisRenderer;
  private plotRenderer: PlotRenderer;

  private isDirty = true;
  private animationFrameId: number | null = null;

  // Data Layer Arrays
  private points: Point[] = [];
  private curves: FunctionCurve[] = [];
  private segments: LineSegment[] = [];
  private polygons: Polygon[] = [];

  // Smooth Viewport Transition Mechanics (for animateToFit)
  private isAnimatingToFit = false;
  private fitStartTime = 0;
  private fitDuration = 0;
  private fitStartScale = 1;
  private fitTargetScale = 1;
  private fitStartOffsetX = 0;
  private fitTargetOffsetX = 0;
  private fitStartOffsetY = 0;
  private fitTargetOffsetY = 0;

  // Auto-Fit State Management
  private autoFit: boolean;
  private fitScheduled = false;

  constructor(canvas: HTMLCanvasElement, config: PlaneConfig = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    // Scale for high-DPI displays (Retina screens)
    this.setupCanvasResolution();

    this.viewport = new Viewport(
      this.canvas.clientWidth,
      this.canvas.clientHeight,
    );
    this.scaleManager = new ScaleManager(config.stepSequences);
    this.inputController = new InputController(this.canvas, this.viewport);

    this.gridRenderer = new GridRenderer();
    this.axisRenderer = new AxisRenderer();
    this.plotRenderer = new PlotRenderer();

    this.autoFit = config.autoFit ?? true;

    this.inputController.onInteraction = () => {
      this.isAnimatingToFit = false;
      this.isDirty = true;
    };

    this.startLoop();
  }

  private setupCanvasResolution() {
    const dpr = window.devicePixelRatio || 1;

    const parent = this.canvas.parentElement || this.canvas;
    const rect = parent.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    this.ctx.scale(dpr, dpr);
  }

  /**
   * Recalculates canvas dimensions and triggers a re-render.
   * Call this inside a ResizeObserver when the container size changes.
   */
  public resize() {
    this.setupCanvasResolution();

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    const v = this.viewport as any;
    if (typeof v.resize === "function") {
      v.resize(w, h);
    } else {
      if ("width" in v) v.width = w;
      if ("height" in v) v.height = h;
      if ("_width" in v) v._width = w;
      if ("_height" in v) v._height = h;
    }

    this.isDirty = true;
  }

  /**
   * Clears all plotted entities (points, curves, shapes) from the plane.
   */
  public clear() {
    this.points = [];
    this.curves = [];
    this.segments = [];
    this.polygons = [];
    this.isDirty = true;
  }

  /**
   * Collects coordinates from every currently plotted entity (points, line
   * endpoints, polygon vertices) so auto-fit can compute a bounding box that
   * covers everything on the plane at once. Curves are excluded since they
   * represent infinite/unbounded functions with no natural bounding box.
   */
  private getAllCoords(): { x: number; y: number }[] {
    const coords: { x: number; y: number }[] = this.points.map((p) => ({
      x: p.x,
      y: p.y,
    }));

    this.segments.forEach((s) => {
      coords.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 });
    });

    this.polygons.forEach((poly) => {
      coords.push(...poly.points);
    });

    return coords;
  }

  /**
   * Batches auto-fit triggers safely across animation frames. This guarantees
   * that the browser has fully completed its layout pass and computed CSS
   * dimensions before the camera moves.
   */
  private scheduleAutoFit() {
    if (!this.autoFit || this.fitScheduled) return;
    this.fitScheduled = true;

    requestAnimationFrame(() => {
      this.fitScheduled = false;
      const coords = this.getAllCoords();
      if (coords.length > 0) {
        this.animateToFit(coords);
      }
    });
  }

  /**
   * Computes the bounding coordinates of target metrics and glides the canvas layout
   * smoothly to encompass all targets with natural, responsive breathing space padding.
   */
  public animateToFit(
    coords?: { x: number; y: number }[],
    duration = 750,
  ): void {
    const targetCoords = coords || this.getAllCoords();
    if (!targetCoords || targetCoords.length === 0) return;

    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;

    if (canvasWidth === 0 || canvasHeight === 0) {
      if (!this.fitScheduled) {
        this.fitScheduled = true;
        requestAnimationFrame(() => {
          this.fitScheduled = false;
          this.animateToFit(targetCoords, duration);
        });
      }
      return;
    }

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    targetCoords.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    if (minX === maxX) {
      minX -= 4;
      maxX += 4;
    }
    if (minY === maxY) {
      minY -= 4;
      maxY += 4;
    }

    const worldWidth = maxX - minX;
    const worldHeight = maxY - minY;

    const paddingMultiplier = 0.225;
    const availableWidth = canvasWidth * (1 - paddingMultiplier * 2);
    const availableHeight = canvasHeight * (1 - paddingMultiplier * 2);

    const scaleX = availableWidth / worldWidth;
    const scaleY = availableHeight / worldHeight;

    this.fitTargetScale = Math.max(
      0.0001,
      Math.min(Math.min(scaleX, scaleY), 5000),
    );

    const midWorldX = (minX + maxX) / 2;
    const midWorldY = (minY + maxY) / 2;

    this.fitTargetOffsetX = canvasWidth / 2 - midWorldX * this.fitTargetScale;
    this.fitTargetOffsetY = canvasHeight / 2 + midWorldY * this.fitTargetScale;

    this.fitStartScale = this.viewport.scale;
    this.fitStartOffsetX = this.viewport.offsetX;
    this.fitStartOffsetY = this.viewport.offsetY;

    this.fitStartTime = performance.now();
    this.fitDuration = duration;
    this.isAnimatingToFit = true;
    this.isDirty = true;
  }

  // --- PUBLIC API FOR DRAWING ---

  public addPoint(
    x: number,
    y: number,
    color?: string,
    label?: string,
    showGuides: boolean = false,
    radius?: number, // 🚀 Added customizable size
  ) {
    this.points.push(new Point(x, y, color, label, showGuides, radius));
    this.isDirty = true;
    this.scheduleAutoFit();
  }

  public addCurve(
    fn: (x: number) => number,
    color?: string,
    thickness?: number, // 🚀 Added customizable thickness
  ) {
    this.curves.push(new FunctionCurve(fn, color, thickness));
    this.isDirty = true;
  }

  public addLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color?: string,
    thickness?: number,
  ) {
    this.segments.push(new LineSegment(x1, y1, x2, y2, color, thickness));
    this.isDirty = true;
    this.scheduleAutoFit();
  }

  public addPolygon(
    points: { x: number; y: number }[],
    fillColor?: string,
    strokeColor?: string,
    thickness?: number,
  ) {
    this.polygons.push(new Polygon(points, fillColor, strokeColor, thickness));
    this.isDirty = true;
    this.scheduleAutoFit();
  }

  // --- RENDERING ENGINE ---

  private render() {
    const renderContext = {
      ctx: this.ctx,
      viewport: this.viewport,
      canvasWidth: this.canvas.clientWidth,
      canvasHeight: this.canvas.clientHeight,
    };

    this.ctx.clearRect(
      0,
      0,
      renderContext.canvasWidth,
      renderContext.canvasHeight,
    );

    const majorStep = this.scaleManager.getOptimalStep(this.viewport.scale);
    const minorStep = this.scaleManager.getMinorStep(majorStep);

    this.gridRenderer.draw(renderContext, majorStep, minorStep);
    this.axisRenderer.draw(renderContext, majorStep);

    this.plotRenderer.drawPolygons(renderContext, this.polygons);
    this.plotRenderer.drawSegments(renderContext, this.segments);
    this.plotRenderer.drawCurves(renderContext, this.curves);
    this.plotRenderer.drawPoints(renderContext, this.points);
  }

  private startLoop() {
    const loop = (now?: number) => {
      const timestamp = now ?? performance.now();
      let needsRender = this.isDirty;

      if (this.isAnimatingToFit) {
        const elapsed = timestamp - this.fitStartTime;
        const progress = Math.min(elapsed / this.fitDuration, 1);
        const easeOutFactor = 1 - Math.pow(1 - progress, 3);

        this.viewport.scale =
          this.fitStartScale +
          (this.fitTargetScale - this.fitStartScale) * easeOutFactor;
        this.viewport.offsetX =
          this.fitStartOffsetX +
          (this.fitTargetOffsetX - this.fitStartOffsetX) * easeOutFactor;
        this.viewport.offsetY =
          this.fitStartOffsetY +
          (this.fitTargetOffsetY - this.fitStartOffsetY) * easeOutFactor;

        needsRender = true;

        if (progress >= 1) {
          this.isAnimatingToFit = false;

          this.viewport.scale = this.fitTargetScale;
          this.viewport.offsetX = this.fitTargetOffsetX;
          this.viewport.offsetY = this.fitTargetOffsetY;

          this.viewport.setTarget(
            this.fitTargetScale,
            this.fitTargetOffsetX,
            this.fitTargetOffsetY,
          );
        }
      }

      let isAnimating = false;
      if (!this.isAnimatingToFit) {
        isAnimating = this.viewport.update();
      }

      if (needsRender || isAnimating) {
        this.render();
        this.isDirty = false;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.inputController.destroy();
  }
}
