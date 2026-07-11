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

  private points: Point[] = [];
  private curves: FunctionCurve[] = [];
  private segments: LineSegment[] = [];
  private polygons: Polygon[] = [];

  private isAnimatingToFit = false;
  private fitStartTime = 0;
  private fitDuration = 0;
  private fitStartScale = 1;
  private fitTargetScale = 1;
  private fitStartOffsetX = 0;
  private fitTargetOffsetX = 0;
  private fitStartOffsetY = 0;
  private fitTargetOffsetY = 0;

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

    this.inputController.onInteraction = () => {
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
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Recalculates canvas dimensions and triggers a re-render.
   * Call this inside a ResizeObserver when the container size changes.
   */
  public resize() {
    this.setupCanvasResolution();
    // Update viewport dimensions to match the new canvas size
    this.viewport.offsetX = this.canvas.clientWidth / 2;
    this.viewport.offsetY = this.canvas.clientHeight / 2;
    this.isDirty = true;
  }

  /**
   * Computes the bounding coordinates of target metrics and glides the canvas layout
   * smoothly to encompass all targets with natural, responsive breathing space padding.
   *
   * @param coords Optional custom point arrays. Defaults to all internal plotted points.
   * @param duration Transition runtime in milliseconds. Defaults to 750ms.
   */
  public animateToFit(
    coords?: { x: number; y: number }[],
    duration = 750,
  ): void {
    const targetCoords = coords || this.points;
    if (!targetCoords || targetCoords.length === 0) return;

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

    // Provide default dimension boundaries if processing a singular coordinate node
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

    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;

    // Define structural safety margins (22.5% uniform inner window padding offset)
    const paddingMultiplier = 0.225;
    const availableWidth = canvasWidth * (1 - paddingMultiplier * 2);
    const availableHeight = canvasHeight * (1 - paddingMultiplier * 2);

    // Map strict ratio scale locks
    const scaleX = availableWidth / worldWidth;
    const scaleY = availableHeight / worldHeight;
    this.fitTargetScale = Math.min(scaleX, scaleY);

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
  }

  public addCurve(fn: (x: number) => number, color?: string) {
    this.curves.push(new FunctionCurve(fn, color));
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
  }

  public addPolygon(
    points: { x: number; y: number }[],
    fillColor?: string,
    strokeColor?: string,
    thickness?: number,
  ) {
    this.polygons.push(new Polygon(points, fillColor, strokeColor, thickness));
    this.isDirty = true;
  }

  // --- RENDERING ENGINE ---

  private render() {
    const renderContext = {
      ctx: this.ctx,
      viewport: this.viewport,
      // Pass logical dimensions, not physical pixel dimensions
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

    // Draw base layers
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
        }
      }

      // Update viewport easing. If it returns true, we are currently animating.
      const isAnimating = this.viewport.update();

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
    // Prevent memory leaks when component unmounts
    this.inputController.destroy();
  }
}
