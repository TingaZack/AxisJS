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

    // Pass logical dimensions to Viewport to prevent coordinate stretching
    this.viewport = new Viewport(
      this.canvas.clientWidth,
      this.canvas.clientHeight,
    );
    this.scaleManager = new ScaleManager(config.stepSequences);
    this.inputController = new InputController(this.canvas, this.viewport);

    this.gridRenderer = new GridRenderer();
    this.axisRenderer = new AxisRenderer();
    this.plotRenderer = new PlotRenderer();

    // Defaults to true — set { autoFit: false } in config to opt out
    this.autoFit = config.autoFit ?? true;

    this.inputController.onInteraction = () => {
      // Intercept and break programmatic animations if the user manually pans or zooms
      this.isAnimatingToFit = false;
      this.isDirty = true;
    };

    this.startLoop();
  }

  private setupCanvasResolution() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Scale the context. Because canvas.width was just set, the context resets,
    // so calling scale() here is safe and does NOT compound across resizes.
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Recalculates canvas dimensions and triggers a re-render.
   * Call this inside a ResizeObserver when the container size changes.
   */
  public resize() {
    this.setupCanvasResolution();
    // Do NOT reset offsets here. Let the user's current pan remain intact.
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
   *
   * @param coords Optional custom point arrays. Defaults to all internal plotted entities.
   * @param duration Transition runtime in milliseconds. Defaults to 750ms.
   */
  public animateToFit(
    coords?: { x: number; y: number }[],
    duration = 750,
  ): void {
    const targetCoords = coords || this.getAllCoords();
    if (!targetCoords || targetCoords.length === 0) return;

    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;

    // 🚀 SAFETY SHIELD: If app is launching cold and layout dims are 0, defer to next paint frame
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

    // Provide safe dimension boundaries if processing a singular coordinate node
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

    // Define structural safety margins (22.5% uniform inner window padding offset)
    const paddingMultiplier = 0.225;
    const availableWidth = canvasWidth * (1 - paddingMultiplier * 2);
    const availableHeight = canvasHeight * (1 - paddingMultiplier * 2);

    // Map strict ratio scale locks
    const scaleX = availableWidth / worldWidth;
    const scaleY = availableHeight / worldHeight;

    // ENFORCE MIN/MAX SCALE LIMITS (e.g., 1 to 5000) to prevent crashing on micro-coordinates
    this.fitTargetScale = Math.max(1, Math.min(Math.min(scaleX, scaleY), 5000));

    // Extract exact coordinate target centers
    const midWorldX = (minX + maxX) / 2;
    const midWorldY = (minY + maxY) / 2;

    // Calculate alignment projections across viewport offsets
    this.fitTargetOffsetX = canvasWidth / 2 - midWorldX * this.fitTargetScale;
    this.fitTargetOffsetY = canvasHeight / 2 + midWorldY * this.fitTargetScale;

    // Snapshot animation state origins
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
  ) {
    this.points.push(new Point(x, y, color, label, showGuides));
    this.isDirty = true;
    this.scheduleAutoFit();
  }

  public addCurve(fn: (x: number) => number, color?: string) {
    this.curves.push(new FunctionCurve(fn, color));
    this.isDirty = true;
    // Curves represent infinite functions and don't trigger auto-fit bounds
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

    // Draw base grid layers
    this.gridRenderer.draw(renderContext, majorStep, minorStep);
    this.axisRenderer.draw(renderContext, majorStep);

    // Draw data layers (bottom to top)
    this.plotRenderer.drawPolygons(renderContext, this.polygons);
    this.plotRenderer.drawSegments(renderContext, this.segments);
    this.plotRenderer.drawCurves(renderContext, this.curves);
    this.plotRenderer.drawPoints(renderContext, this.points);
  }

  private startLoop() {
    const loop = (now?: number) => {
      const timestamp = now ?? performance.now();
      let needsRender = this.isDirty;

      // Handle active Auto-Fit smooth coordinate animation updates
      if (this.isAnimatingToFit) {
        const elapsed = timestamp - this.fitStartTime;
        const progress = Math.min(elapsed / this.fitDuration, 1);

        // Smooth Cubic Ease Out calculation mapping: 1 - (1 - x)^3
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
          // CRITICAL FIX: Sync Viewport targets so manual panning resumes from the new location!
          this.viewport.scale = this.fitTargetScale;
          this.viewport.offsetX = this.fitTargetOffsetX;
          this.viewport.offsetY = this.fitTargetOffsetY;
        }
      }

      // CRITICAL FIX: Update viewport easing ONLY if we are not overriding it with animateToFit
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
    loop();
  }

  public destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.inputController.destroy();
  }
}
