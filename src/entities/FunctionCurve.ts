export class FunctionCurve {
  public fn: (x: number) => number;
  public color: string;
  public thickness: number;

  constructor(
    fn: (x: number) => number,
    color: string = "#007BFF",
    thickness: number = 2,
  ) {
    this.fn = fn;
    this.color = color;
    this.thickness = thickness;
  }
}
