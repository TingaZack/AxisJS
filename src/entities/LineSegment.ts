export class LineSegment {
  public x1: number;
  public y1: number;
  public x2: number;
  public y2: number;
  public color: string;
  public thickness: number;

  constructor(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string = "#333333",
    thickness: number = 2,
  ) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    this.thickness = thickness;
  }
}
