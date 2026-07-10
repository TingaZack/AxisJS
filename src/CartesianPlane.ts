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

  // Data State Arrays
  private points: Point[] = [];
  private curves: FunctionCurve[] = [];
  private segments: LineSegment[] = [];
  private polygons: Polygon[] = [];

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

    // Trigger re-renders only on user input
    this.inputController.onInteraction = () => {
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
    const loop = () => {
      // Update viewport easing. If it returns true, we are currently animating.
      const isAnimating = this.viewport.update();

      if (this.isDirty || isAnimating) {
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
