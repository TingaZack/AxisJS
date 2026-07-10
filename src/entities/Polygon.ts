export class Polygon {
  public points: { x: number; y: number }[];
  public fillColor: string;
  public strokeColor: string;
  public thickness: number;

  constructor(
    points: { x: number; y: number }[],
    fillColor: string = "rgba(0, 0, 255, 0.2)",
    strokeColor: string = "#0000FF",
    thickness: number = 2,
  ) {
    this.points = points;
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
    this.thickness = thickness;
  }
}
