// Interactive Experiment Engine (ADR-0004). Zero-dependency canvas/DOM runtime.
// Every experiment type reads its parameters from the Learning Object's experiment config.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function slider(labelText, { min, max, step, value }, onInput) {
  const wrap = el("label", "experiment-slider");
  const caption = el("span", "experiment-slider-label", labelText);
  const input = el("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  const valueEl = el("span", "experiment-slider-value", String(value));
  input.addEventListener("input", () => {
    valueEl.textContent = input.value;
    onInput(Number(input.value));
  });
  wrap.append(caption, input, valueEl);
  return { wrap, input, valueEl };
}

function button(text, onClick) {
  const node = el("button", "experiment-button", text);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

function readout() {
  const node = el("p", "experiment-readout");
  node.setAttribute("data-testid", "experiment-readout");
  node.setAttribute("aria-live", "polite");
  return node;
}

function makeCanvas(width = 460, height = 260) {
  const canvas = el("canvas", "experiment-canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") };
}

function makePlot(ctx, width, height, xMin, xMax, yMin, yMax) {
  const sx = (x) => ((x - xMin) / (xMax - xMin)) * (width - 40) + 20;
  const sy = (y) => height - 20 - ((y - yMin) / (yMax - yMin)) * (height - 40);
  const axes = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx(xMin), sy(0));
    ctx.lineTo(sx(xMax), sy(0));
    ctx.moveTo(sx(0), sy(yMin));
    ctx.lineTo(sx(0), sy(yMax));
    ctx.stroke();
  };
  const line = (x1, y1, x2, y2, color, lineWidth = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(sx(x1), sy(y1));
    ctx.lineTo(sx(x2), sy(y2));
    ctx.stroke();
  };
  const dot = (x, y, color, radius = 5) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx(x), sy(y), radius, 0, Math.PI * 2);
    ctx.fill();
  };
  const curve = (fn, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = xMin + ((xMax - xMin) * i) / 120;
      const y = fn(x);
      if (i === 0) ctx.moveTo(sx(x), sy(y));
      else ctx.lineTo(sx(x), sy(y));
    }
    ctx.stroke();
  };
  return { sx, sy, axes, line, dot, curve };
}

function leastSquares(points) {
  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p[0], 0) / n;
  const meanY = points.reduce((sum, p) => sum + p[1], 0) / n;
  const slope = points.reduce((sum, p) => sum + (p[0] - meanX) * (p[1] - meanY), 0)
    / points.reduce((sum, p) => sum + (p[0] - meanX) ** 2, 0);
  return { slope, intercept: meanY - slope * meanX };
}

function mse(points, w, b) {
  return points.reduce((sum, p) => sum + (w * p[0] + b - p[1]) ** 2, 0) / points.length;
}

const registry = {
  "unit-compare": (frame, config) => {
    const a = config.a ?? { label: "Table A revenue", value: 1.2, unit: "millions USD", factor: 1000000 };
    const b = config.b ?? { label: "Table B revenue", value: 900, unit: "thousands USD", factor: 1000 };
    const { canvas, ctx } = makeCanvas(460, 200);
    const out = readout();
    let normalized = false;
    const draw = () => {
      const valueA = normalized ? a.value * a.factor : a.value;
      const valueB = normalized ? b.value * b.factor : b.value;
      const max = Math.max(valueA, valueB);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(40, 130 - 100 * (valueA / max), 140, 100 * (valueA / max) + 20);
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(260, 130 - 100 * (valueB / max), 140, 100 * (valueB / max) + 20);
      ctx.fillStyle = "#0f172a";
      ctx.font = "13px system-ui";
      ctx.fillText(`${a.label}: ${valueA.toLocaleString()} ${normalized ? "USD" : a.unit}`, 30, 175);
      ctx.fillText(`${b.label}: ${valueB.toLocaleString()} ${normalized ? "USD" : b.unit}`, 250, 195);
      const winner = valueA > valueB ? a.label : b.label;
      out.textContent = normalized
        ? `Same unit now. ${winner} is actually larger. The raw digits lied because the units differed.`
        : `Raw digits: ${b.value} looks bigger than ${a.value} — but the units are different, so this comparison is not yet valid.`;
    };
    frame.append(canvas, button("Normalize the units", () => { normalized = !normalized; draw(); }), out);
    draw();
  },

  "balance-solve": (frame, config) => {
    const { coefficient = 1, offset = 3, target = 7, min = 0, max = 10 } = config;
    const { canvas, ctx } = makeCanvas(460, 180);
    const out = readout();
    const draw = (x) => {
      const left = coefficient * x + offset;
      const tilt = Math.max(-0.25, Math.min(0.25, (target - left) * 0.06));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(230, 110);
      ctx.rotate(tilt);
      ctx.fillStyle = "#475569";
      ctx.fillRect(-170, -6, 340, 12);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(-160, -46, 70, 40);
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(90, -46, 70, 40);
      ctx.restore();
      ctx.fillStyle = "#0f172a";
      ctx.font = "14px system-ui";
      ctx.fillText(`${coefficient === 1 ? "" : coefficient}x + ${offset} = ${left}`, 60, 160);
      ctx.fillText(String(target), 330, 160);
      out.textContent = left === target
        ? `Balanced! x = ${x} makes both sides equal ${target}. That is what "solving" means.`
        : `Left side is ${left}, right side is ${target}. The scale tips toward the heavier side — adjust x.`;
    };
    const control = slider("x", { min, max, step: 1, value: min }, draw);
    frame.append(control.wrap, canvas, out);
    draw(min);
  },

  "function-machine": (frame, config) => {
    const { m = 2, b = 3, xMin = -5, xMax = 5 } = config;
    const { canvas, ctx } = makeCanvas();
    const yPad = Math.abs(m) * Math.max(Math.abs(xMin), Math.abs(xMax)) + Math.abs(b) + 2;
    const plot = makePlot(ctx, canvas.width, canvas.height, xMin, xMax, -yPad, yPad);
    const out = readout();
    const draw = (x) => {
      plot.axes();
      plot.line(xMin, m * xMin + b, xMax, m * xMax + b, "#2563eb");
      plot.dot(x, m * x + b, "#ea580c", 7);
      out.textContent = `Input x = ${x} → the machine computes f(x) = ${m}·${x} + ${b} = ${m * x + b}. Same rule, every time.`;
    };
    const control = slider("x (input)", { min: xMin, max: xMax, step: 1, value: 1 }, draw);
    frame.append(control.wrap, canvas, out);
    draw(1);
  },

  "vector-drag": (frame, config) => {
    const range = config.range ?? 6;
    const { canvas, ctx } = makeCanvas(400, 300);
    const plot = makePlot(ctx, canvas.width, canvas.height, -range, range, -range, range);
    const out = readout();
    let vx = 3, vy = 2;
    const draw = () => {
      plot.axes();
      plot.line(0, 0, vx, vy, "#2563eb", 3);
      plot.dot(vx, vy, "#ea580c", 7);
      plot.line(0, 0, vx, 0, "#94a3b8", 1);
      plot.line(vx, 0, vx, vy, "#94a3b8", 1);
      out.textContent = `Vector = (${vx.toFixed(1)}, ${vy.toFixed(1)}). Magnitude = ${Math.hypot(vx, vy).toFixed(2)}. Direction and length in two numbers.`;
    };
    const toWorld = (event) => {
      const rect = canvas.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const py = ((event.clientY - rect.top) / rect.height) * canvas.height;
      vx = Math.max(-range, Math.min(range, ((px - 20) / (canvas.width - 40)) * 2 * range - range));
      vy = Math.max(-range, Math.min(range, range - ((py - 20) / (canvas.height - 40)) * 2 * range));
      draw();
    };
    let dragging = false;
    canvas.addEventListener("pointerdown", (event) => { dragging = true; toWorld(event); });
    canvas.addEventListener("pointermove", (event) => { if (dragging) toWorld(event); });
    window.addEventListener("pointerup", () => { dragging = false; });
    frame.append(canvas, out);
    draw();
  },

  "matrix-transform": (frame, config) => {
    const start = config.start ?? { a: 1, b: 0, c: 0, d: 1 };
    const matrix = { ...start };
    const { canvas, ctx } = makeCanvas(400, 300);
    const plot = makePlot(ctx, canvas.width, canvas.height, -3, 3, -3, 3);
    const out = readout();
    const draw = () => {
      plot.axes();
      const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
      const image = square.map(([x, y]) => [matrix.a * x + matrix.b * y, matrix.c * x + matrix.d * y]);
      const path = (points, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(plot.sx(x), plot.sy(y)) : ctx.lineTo(plot.sx(x), plot.sy(y))));
        ctx.closePath();
        ctx.stroke();
      };
      path(square, "#94a3b8");
      path(image, "#ea580c");
      const det = matrix.a * matrix.d - matrix.b * matrix.c;
      out.textContent = `Matrix [[${matrix.a}, ${matrix.b}], [${matrix.c}, ${matrix.d}]] reshapes the grey unit square into the orange shape. Determinant = ${det.toFixed(2)} (area scale factor).`;
    };
    for (const key of ["a", "b", "c", "d"]) {
      frame.append(slider(key, { min: -2, max: 2, step: 0.1, value: matrix[key] }, (value) => { matrix[key] = value; draw(); }).wrap);
    }
    frame.append(canvas, out);
    draw();
  },

  "dice-histogram": (frame) => {
    const counts = new Array(13).fill(0);
    let total = 0;
    const { canvas, ctx } = makeCanvas(460, 220);
    const out = readout();
    const roll = (times) => {
      for (let i = 0; i < times; i++) {
        counts[Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6)]++;
        total++;
      }
      draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const max = Math.max(1, ...counts);
      for (let sum = 2; sum <= 12; sum++) {
        const height = (counts[sum] / max) * 160;
        ctx.fillStyle = sum === 7 ? "#ea580c" : "#2563eb";
        ctx.fillRect(30 + (sum - 2) * 38, 180 - height, 30, height);
        ctx.fillStyle = "#0f172a";
        ctx.font = "12px system-ui";
        ctx.fillText(String(sum), 40 + (sum - 2) * 38, 198);
      }
      const observed = total ? ((counts[7] / total) * 100).toFixed(1) : "0.0";
      out.textContent = total === 0
        ? "Roll the dice. Before data, every sum feels equally likely — is it?"
        : `${total} rolls. Sum 7 observed ${observed}% of the time; theory says 16.7%. More rolls → closer to theory.`;
    };
    frame.append(button("Roll once", () => roll(1)), button("Roll 100 times", () => roll(100)), canvas, out);
    draw();
  },

  "sampling-mean": (frame, config) => {
    const trueMean = config.trueMean ?? 52;
    const sampleSize = config.sampleSize ?? 10;
    const means = [];
    const { canvas, ctx } = makeCanvas(460, 200);
    const out = readout();
    const drawSample = () => {
      let sum = 0;
      for (let i = 0; i < sampleSize; i++) {
        // Skewed population: most values small, a few large (like incomes).
        sum += trueMean * 0.6 + Math.random() * trueMean * 0.4 + (Math.random() < 0.15 ? trueMean * Math.random() * 1.5 : 0);
      }
      means.push(sum / sampleSize);
      draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const plot = makePlot(ctx, canvas.width, canvas.height, 0, Math.max(20, means.length + 2), trueMean * 0.5, trueMean * 1.8);
      plot.axes();
      plot.line(0, trueMean, Math.max(20, means.length + 2), trueMean, "#16a34a", 1);
      means.forEach((value, index) => plot.dot(index + 1, value, "#2563eb", 4));
      const runningMean = means.length ? means.reduce((sum, value) => sum + value, 0) / means.length : 0;
      out.textContent = means.length === 0
        ? "Draw a sample. Each dot will be one sample's average from a messy, skewed population."
        : `${means.length} samples of ${sampleSize}. Mean of sample means = ${runningMean.toFixed(1)}; the green line is the true mean ${trueMean}. Single samples wobble — averages of averages settle.`;
    };
    frame.append(button(`Draw a sample of ${sampleSize}`, drawSample), button("Draw 20 samples", () => { for (let i = 0; i < 20; i++) drawSample(); }), canvas, out);
    draw();
  },

  "slope-explorer": (frame, config) => {
    const a = config.a ?? 1;
    const { canvas, ctx } = makeCanvas();
    const plot = makePlot(ctx, canvas.width, canvas.height, -3, 3, -1, 10);
    const out = readout();
    const draw = (x) => {
      plot.axes();
      plot.curve((t) => a * t * t, "#2563eb");
      const slope = 2 * a * x;
      const y = a * x * x;
      plot.line(x - 1.2, y - slope * 1.2, x + 1.2, y + slope * 1.2, "#ea580c");
      plot.dot(x, y, "#ea580c", 6);
      out.textContent = `At x = ${x.toFixed(1)}, the curve's instant slope is ${slope.toFixed(1)}. Slide along: the slope itself changes — that changing slope is the derivative 2x.`;
    };
    frame.append(slider("x (position on the curve)", { min: -3, max: 3, step: 0.1, value: 2 }, draw).wrap, canvas, out);
    draw(2);
  },

  "gradient-descent": (frame, config) => {
    const startW = config.start ?? 4;
    let w = startW;
    let steps = 0;
    let learningRate = config.learningRate ?? 0.2;
    const { canvas, ctx } = makeCanvas();
    const plot = makePlot(ctx, canvas.width, canvas.height, -5, 5, -1, 26);
    const out = readout();
    const draw = () => {
      plot.axes();
      plot.curve((t) => t * t, "#2563eb");
      if (Math.abs(w) <= 5) plot.dot(w, w * w, "#ea580c", 8);
      const diverging = Math.abs(w) > Math.abs(startW) + 0.001;
      out.textContent = steps === 0
        ? `The ball sits at w = ${w.toFixed(2)}, loss = ${(w * w).toFixed(2)}. Take a step: w ← w − learningRate × gradient(2w).`
        : diverging
          ? `After ${steps} steps: w = ${w.toFixed(2)}, loss = ${(w * w).toFixed(2)} — DIVERGING! The learning rate is too large; each step overshoots the valley.`
          : `After ${steps} steps: w = ${w.toFixed(2)}, loss = ${(w * w).toFixed(2)}. The gradient shrinks near the bottom, so the steps shrink too.`;
    };
    frame.append(
      slider("learning rate", { min: 0.05, max: 1.2, step: 0.05, value: learningRate }, (value) => { learningRate = value; }).wrap,
      button("Take a gradient step", () => { w = w - learningRate * 2 * w; steps++; draw(); }),
      button("Reset the ball", () => { w = startW; steps = 0; draw(); }),
      canvas,
      out
    );
    draw();
  },

  "outlier-fit": (frame, config) => {
    const points = config.points ?? [[1, 2.1], [2, 2.9], [3, 4.2], [4, 4.8], [5, 6.1], [6, 7.0], [7, 7.8]];
    const outlier = config.outlier ?? [6, 30];
    const { canvas, ctx } = makeCanvas();
    const out = readout();
    let includeOutlier = false;
    const draw = () => {
      const data = includeOutlier ? [...points, outlier] : points;
      const clean = leastSquares(points);
      const fit = leastSquares(data);
      const yMax = includeOutlier ? outlier[1] + 4 : 10;
      const plot = makePlot(ctx, canvas.width, canvas.height, 0, 8, 0, yMax);
      plot.axes();
      points.forEach(([x, y]) => plot.dot(x, y, "#2563eb", 5));
      if (includeOutlier) plot.dot(outlier[0], outlier[1], "#dc2626", 7);
      plot.line(0, fit.intercept, 8, fit.slope * 8 + fit.intercept, "#ea580c");
      out.textContent = includeOutlier
        ? `With the corrupted point (a value logged in the wrong unit), the fitted slope jumps from ${clean.slope.toFixed(2)} to ${fit.slope.toFixed(2)}. One bad row bends the whole model.`
        : `Clean data: fitted slope ${fit.slope.toFixed(2)}, intercept ${fit.intercept.toFixed(2)}. Now include the corrupted point and watch the line.`;
    };
    frame.append(button("Toggle the corrupted data point", () => { includeOutlier = !includeOutlier; draw(); }), canvas, out);
    draw();
  },

  "fit-line": (frame, config) => {
    const points = config.points ?? [[1, 2.3], [2, 2.8], [3, 4.1], [4, 4.6], [5, 6.2], [6, 6.7], [7, 8.1], [8, 8.4]];
    const learningRate = config.learningRate ?? 0.01;
    const best = leastSquares(points);
    const bestError = mse(points, best.slope, best.intercept);
    let w = config.startW ?? 0;
    let b = config.startB ?? 0;
    const { canvas, ctx } = makeCanvas();
    const plot = makePlot(ctx, canvas.width, canvas.height, 0, 9, 0, 10);
    const out = readout();
    let wControl, bControl;
    const draw = () => {
      plot.axes();
      points.forEach(([x, y]) => plot.dot(x, y, "#2563eb", 5));
      plot.line(0, b, 9, w * 9 + b, "#ea580c");
      const error = mse(points, w, b);
      const nearBest = error <= bestError * 1.05 + 0.01;
      out.textContent = nearBest
        ? `MSE = ${error.toFixed(3)} — excellent fit! Best possible is ${bestError.toFixed(3)}. You just did what training a model means.`
        : `w = ${w.toFixed(2)}, b = ${b.toFixed(2)}, MSE = ${error.toFixed(3)}. Best possible is ${bestError.toFixed(3)} — lower the error by hand or take a gradient step.`;
    };
    wControl = slider("w (slope)", { min: -2, max: 4, step: 0.05, value: w }, (value) => { w = value; draw(); });
    bControl = slider("b (intercept)", { min: -5, max: 10, step: 0.1, value: b }, (value) => { b = value; draw(); });
    const step = () => {
      // The exact update rule from the lesson: dw = mean(2x(ŷ−y)), db = mean(2(ŷ−y)).
      const dw = points.reduce((sum, [x, y]) => sum + 2 * x * (w * x + b - y), 0) / points.length;
      const db = points.reduce((sum, [x, y]) => sum + 2 * (w * x + b - y), 0) / points.length;
      w -= learningRate * dw;
      b -= learningRate * db;
      wControl.input.value = w;
      bControl.input.value = b;
      wControl.valueEl.textContent = w.toFixed(2);
      bControl.valueEl.textContent = b.toFixed(2);
      draw();
    };
    frame.append(wControl.wrap, bControl.wrap, button("Take one gradient step", step), button("Take 25 gradient steps", () => { for (let i = 0; i < 25; i++) step(); }), canvas, out);
    draw();
  }
};

export function mountExperiment(container, spec) {
  container.replaceChildren();
  const build = registry[spec?.type];
  const frame = el("div", "experiment-frame");
  if (!build) {
    frame.append(el("p", "experiment-readout", "This experiment is not available yet. Continue with the written prompt."));
    container.append(frame);
    return;
  }
  frame.append(el("h3", "experiment-title", spec.title));
  frame.append(el("p", "experiment-instructions", spec.instructions));
  build(frame, spec.config ?? {});
  container.append(frame);
}
