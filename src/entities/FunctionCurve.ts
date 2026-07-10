export class FunctionCurve {
  // Declare the properties explicitly
  public fn: (x: number) => number;
  public color: string;

  // Remove 'public' from the parameters
  constructor(fn: (x: number) => number, color: string = "#007BFF") {
    // Assign them manually
    this.fn = fn;
    this.color = color;
  }
}
