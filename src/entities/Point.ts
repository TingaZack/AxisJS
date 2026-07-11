export class Point {
  public x: number;
  public y: number;
  public color: string;
  public label?: string;
  public showGuides: boolean;
  public radius: number;

  constructor(
    x: number,
    y: number,
    color: string = "#FF0000",
    label?: string,
    showGuides: boolean = false,
    radius: number = 5,
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.label = label;
    this.showGuides = showGuides;
    this.radius = radius;
  }
}
