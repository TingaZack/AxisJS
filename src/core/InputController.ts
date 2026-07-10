import { Viewport } from "./Viewport";

export class InputController {
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  private canvas: HTMLCanvasElement;
  private viewport: Viewport;

  public onInteraction: () => void;

  constructor(canvas: HTMLCanvasElement, viewport: Viewport) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.onInteraction = () => {};
    this.bindEvents();
  }

  // Bind methods to 'this' to allow for clean removal later
  private handleMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.style.cursor = "grabbing";
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.viewport.pan(dx, dy);
    this.onInteraction();
  };

  private handleMouseUp = () => {
    this.isDragging = false;
    this.canvas.style.cursor = "grab";
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.viewport.zoom(zoomFactor, x, y);
    this.onInteraction();
  };

  private bindEvents() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  public destroy() {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("wheel", this.handleWheel);
  }
}
