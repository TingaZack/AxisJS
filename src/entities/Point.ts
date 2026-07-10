export class Point {
  public x: number;
  public y: number;
  public color: string;
  public label?: string;
  public showGuides: boolean;

  constructor(
    x: number,
    y: number,
    color: string = "#FF0000",
    label?: string,
    showGuides: boolean = false,
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.label = label;
    this.showGuides = showGuides;
  }
}
