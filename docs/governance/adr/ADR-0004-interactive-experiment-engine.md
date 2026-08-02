# ADR-0004 — Interactive Experiment Engine (Phase 6 of the Source Roadmap)

- **Status:** Accepted (owner directive, 2026-08-02)
- **Date:** 2026-08-02
- **EDM impact:** None. Implements the Experience and Platform model responsibilities already frozen in EDM v1.0.

## Problem

The source vision mandates: "Visualization isn't enough. Everything should be playable…
They literally feel optimization. Now they don't forget." The current renderer is text prompts
plus a reflection textarea — zero interactivity. This is the largest fidelity gap between the
implementation and the vision, and Phase 6 (Interactive Engine) of the frozen implementation order.

## Decision

Build a zero-dependency, canvas/DOM experiment runtime (`assets/experiments.js`) with a registry of
experiment types. Learning Objects declare experiments as data (`learning.experiments`, LOS v2.0);
the renderer mounts the matching type when the learner reaches an `experiment` step.

First experiment catalogue (one playable experiment per lesson):

| Concept | Type | The learner plays with |
|---|---|---|
| numbers | `unit-compare` | Two metrics in mismatched units; normalizing flips the comparison |
| variables-algebra | `balance-solve` | A slider for the unknown until the balance scale levels |
| functions-graphs | `function-machine` | An input slider driving a point along f(x) = mx + b |
| coordinates-vectors | `vector-drag` | Dragging an arrowhead; components and magnitude update live |
| matrices-transformations | `matrix-transform` | Four sliders for a 2×2 matrix warping the unit square |
| probability-uncertainty | `dice-histogram` | Rolling two dice; the histogram converges on theory |
| statistics-distributions | `sampling-mean` | Drawing samples; sample means converge to the true mean |
| derivatives-gradients | `slope-explorer` | Sliding a point along a curve; the tangent slope updates |
| loss-optimization | `gradient-descent` | Learning-rate slider + step button; the ball descends or diverges |
| data-features-targets | `outlier-fit` | Toggling a corrupted point; the fitted line visibly shifts |
| linear-regression | `fit-line` | w/b sliders with live MSE, plus a real gradient-descent step |

## Constraints

- No dependencies; vanilla ES modules; CSP (`script-src 'self'`) unchanged.
- Every experiment ends in a readout the learner can reason about in the reflection box
  (the experiment feeds the Fail → Discover steps that follow it).

## Consequences

- `index.html` gains an experiment region; renderer shows it only on `experiment` steps.
- E2E coverage extends to at least one playable interaction.
