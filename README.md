# @zakq/axisjs

A high-performance, layout-defensive 2D Cartesian coordinate graphing workspace built on HTML5 Canvas with React + TypeScript. Built on top of a React + TypeScript + Vite foundation, with Hot Module Replacement (HMR) for fast local development.

## Key Features

- **Dual-Track Rendering Engine** — manage and render standalone data coordinates (with crosshair alignment guides) and isolated multi-vertex geometric polygons independently.
- **Layout-Defensive Resizing** — the canvas tracks the dimensions of its parent bounding container rather than hardcoded metrics, preventing inline-style layout locks or rendering voids during fullscreen toggles.
- **Full Styling Control** — every entity layer (points, curves, lines, polygons) accepts independent color, thickness, and radius parameters, with safe framework defaults when omitted.
- **Programmatic Camera Control** — smooth camera transitions via `animateToFit()`, using an internal frame-batch scheduler and a cubic ease-out interpolation curve: `1 - (1 - x)^3`.
- **Encapsulated Viewport Physics** — synchronizes programmatic animation targets with interactive user-driven kinetic pans and scroll-wheel zooming.

---

## Installation

```bash
npm install @zakq/axisjs
```

---

## UI Workspace Integration (`AxisWorkspace.tsx`)

The companion React component partitions coordinate entry into two separate state tracks, so users aren't locked into a rigid all-or-nothing configuration.

> **Note:** `points` and `shapes` are maintained as completely isolated arrays in the component's state schema, letting you fine-tune visual properties (color, radius, thickness) independently per track.

```tsx
import React, { useState } from "react";
import AxisWorkspace, { PointRow, ShapeItem } from "./components/AxisWorkspace";

const App = () => {
  const [data, setData] = useState<{ points: PointRow[]; shapes: ShapeItem[] }>(
    {
      points: [{ x: 5, y: 5 }],
      shapes: [],
    },
  );

  return (
    <AxisWorkspace
      value={data}
      onChange={(newData) => setData(newData)}
      readOnly={false}
    />
  );
};

export default App;
```

---

## 📖 Library Core API Reference (`CartesianPlane`)

### Instantiation

```typescript
import { CartesianPlane } from "@zakq/axisjs";

const plane = new CartesianPlane(canvasElement, {
  stepSequences: [1, 2, 5],
  autoFit: false, // disabled in UI inputs to prevent camera jitter on keystroke edits
});
```

### Methods

| Method                             | Signature                                        | Description                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addPoint`                         | `(x, y, color?, label?, showGuides?, radius?)`   | Plots a discrete point marker. Set `showGuides` to `true` to render dynamic crosshair projection lines back to the axes. `radius` defaults to `5`. |
| `addCurve`                         | `(fn, color?, thickness?)`                       | Plots a mathematical function `y = fn(x)` as a continuous curve across the visible viewport. `thickness` defaults to `2`.                          |
| `addLine`                          | `(x1, y1, x2, y2, color?, thickness?)`           | Draws a straight vector line segment between two points. `thickness` defaults to `2`.                                                              |
| `addPolygon`                       | `(points, fillColor?, strokeColor?, thickness?)` | Renders a connected boundary loop across sequential vertices, with optional fill and stroke. `thickness` defaults to `2`.                          |
| `clear()`                          | —                                                | Wipes all internal geometry layers, instantly emptying the graph view without destroying the canvas context.                                       |
| `resize()`                         | —                                                | Re-samples fluid parent container dimensions and applies high-DPI context scale multipliers. Ideal for binding directly into a `ResizeObserver`.   |
| `animateToFit(coords?, duration?)` | —                                                | Computes view boundaries and smoothly glides the camera to fit target markers inside the workspace view padding.                                   |
| `destroy()`                        | —                                                | Tears down the plane instance and releases its canvas context / listeners. Call on unmount.                                                        |

### Extended Styling Engine

Every entity layer — points, curves, lines, and polygons — accepts independent visual properties (color, thickness, radius), falling back to sensible defaults if unspecified. Color strings accept Hex, RGB, RGBA, or standard CSS color names.

```typescript
// Discrete point with a custom color
plane.addPoint(5, -5, "#ef4444");

// Small guide point with a custom radius
plane.addPoint(2, 3, "#ef4444", "Node A", true, 2);

// Infinite curve, thick blue line
plane.addCurve((x) => Math.sin(x), "blue", 3);

// Straight vector line segment, translucent black
plane.addLine(0, 0, 10, 10, "rgba(0,0,0,0.5)", 2);

// Geometric polygon with translucent fill and solid stroke
plane.addPolygon(coords, "rgba(37, 99, 235, 0.12)", "#2563eb", 2);
```

Internally, `PlotRenderer.ts` binds these properties directly to the canvas context before each draw call — e.g. `ctx.fillStyle = point.color`, `ctx.lineWidth = curve.thickness` — so there's no intermediate style resolution layer to worry about.

---

## Local Development & Build Scripts

This repository uses [Vite](https://vite.dev/) with Hot Module Replacement (HMR) for fast component and engine development.

Two official HMR plugins are available upstream:

- [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) — uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [`@vitejs/plugin-react-swc`](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) — uses [SWC](https://swc.rs/) for Fast Refresh

### Running the Dev Workspace

```bash
npm run dev
```

### Compiling and Bundling the Library

```bash
npm run build
```

### Local Integration Testing (Tarball Pack)

To test library updates locally inside a consumer application without publishing to a registry:

```bash
# 1. Inside the AxisJS directory:
npm run build && npm pack

# 2. Inside your consumer application directory:
npm install /absolute/path/to/AxisJS/zakq-axisjs-X.X.X.tgz --force
npm run dev -- --force
```

### React Compiler

The React Compiler is **not enabled** on this template due to its impact on dev/build performance. To add it, see [the official installation guide](https://react.dev/learn/react-compiler/installation).

---

## Expanding the ESLint Configuration

For strict, type-aware production environments, update `eslint.config.js`:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [`eslint-plugin-react-x`](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [`eslint-plugin-react-dom`](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
