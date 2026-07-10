export interface TextStyle {
  font: string;
  color: string;
  size: number;
}

export interface PlaneConfig {
  stepSequences?: number[];
  minorDivisions?: number;
  animationDuration?: number;
  gridColor?: string;
  axisColor?: string;
  backgroundColor?: string;
  textStyle?: TextStyle;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  viewport: import("./core/Viewport").Viewport;
  canvasWidth: number;
  canvasHeight: number;
}
