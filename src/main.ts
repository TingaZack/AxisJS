import { CartesianPlane } from "./CartesianPlane";

// 1. Grab the canvas element from the DOM (matches the updated index.html)
const canvas = document.getElementById("plane-canvas") as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Could not find canvas element with id "plane-canvas"');
}

// 2. Initialize the AxisJS Plane
const plane = new CartesianPlane(canvas, {
  stepSequences: [1, 2, 5],
});

// 3. Plot some Mathematical Functions (Curves)
// A classic parabola: y = x^2
plane.addCurve((x) => Math.pow(x, 2), "#ff4757");

// A sine wave: y = sin(x)
plane.addCurve((x) => Math.sin(x), "#2ed573");

// 4. Plot Polygons (Recreating the triangle from the worksheet)
plane.addPolygon(
  [
    { x: -6, y: 3 },
    { x: -2, y: 1 },
    { x: -3, y: 8 },
  ],
  "rgba(100, 100, 150, 0.4)",
  "#444466",
  2,
);

// 5. Plot Line Segments (e.g., drawing a distinct vector/line)
plane.addLine(0, 0, 4, -4, "#feca57", 3);

// 6. Plot Points of Interest (with labels and dashed guides)
plane.addPoint(0, 0, "#ff4757", "Origin");
plane.addPoint(-3, 2, "blue", "(-3, 2)", true); // Point with dashed guide matching your image!
plane.addPoint(4, -4, "#feca57", "A(4, -4)", false);

// 7. Handle Window Resizing gracefully
const resizeObserver = new ResizeObserver(() => {
  // Just tell the plane to handle its own math!
  plane.resize();
});

// Start observing the canvas container
resizeObserver.observe(canvas);

// Optional: Expose the plane to the window object so you can play with it in the console!
(window as any).plane = plane;
