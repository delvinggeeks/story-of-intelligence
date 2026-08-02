// One-time LOS v1.0 → v2.0 migration (ADR-0003). Reads each v1 Learning Object,
// merges the authored v2 augmentation, inserts the Experiment → Fail → Discover arc
// after the first predict step, and writes <id>.v2.json.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const objectDir = resolve(root, "content/learning-objects");
const graph = JSON.parse(await readFile(resolve(root, "content/knowledge-graph.v1.json"), "utf8"));

const AUGMENTATIONS = {
  "numbers": {
    stability: "timeless",
    nextConcept: "variables-algebra",
    history: "Numbers began as tally marks and Sumerian accounting tokens five thousand years ago — invented not for mathematics but so people could trust records of grain and debts. Positional notation and zero later made large quantities writable, and that same trust problem (what does this figure represent?) is exactly today's data-quality problem.",
    mentalModels: [
      { name: "Label on a box", description: "A number is a label describing an amount — it is not the amount itself. The label is only useful when you know what the box contains and how it was measured." },
      { name: "Shared ruler", description: "Two quantities can only be compared when measured with the same ruler. Unit and definition are the ruler; without them, comparison is meaningless." }
    ],
    analogies: [
      { analogy: "Comparing prices in different currencies without converting them first", strength: 5, whenToUse: "When a learner compares raw digits across mismatched units." },
      { analogy: "Two thermometers, one in Celsius and one in Fahrenheit, reading 30 and 40", strength: 4, whenToUse: "When showing that the bigger digit is not always the bigger quantity." }
    ],
    experiment: {
      id: "numbers-unit-compare",
      type: "unit-compare",
      title: "The bigger number that is actually smaller",
      instructions: "Two revenue figures from two tables. Compare them as raw digits, then press the button to convert both to the same unit — and watch the comparison flip.",
      config: {
        a: { label: "Table A revenue", value: 1.2, unit: "millions USD", factor: 1000000 },
        b: { label: "Table B revenue", value: 900, unit: "thousands USD", factor: 1000 }
      }
    },
    steps: {
      experiment: "Play the experiment above: compare the two revenue figures as raw digits first, then normalize the units. Which table actually earned more, and what changed your answer?",
      fail: "Now break it on purpose: imagine a report that averages Table A's millions with Table B's thousands without converting. Write down the nonsense figure it would produce and who would be misled by it.",
      discover: "State the rule you just discovered in your own words: what must two numbers share before comparing, adding, or averaging them is valid? This rule is why schemas and metadata exist."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "quantity", label: "Name the quantity being represented.", pattern: "(quantity|count|records?|tickets?|examples?|value)" },
        { id: "unit", label: "State the unit or measurement context.", pattern: "(unit|schema|years?|minutes?|usd|dollars?|km|calories|cups)" },
        { id: "comparison", label: "Make a valid comparison with shared meaning.", pattern: "(compare|larger|smaller|more|less|same|equal)" },
        { id: "risk", label: "Identify at least one misuse or failure mode.", pattern: "(risk|wrong|misuse|fail|invalid|confus|error|unsafe)" },
        { id: "decision", label: "Connect the result to a decision or guardrail.", pattern: "(decision|action|check|guardrail|validate|use|choose)" }
      ]
    }
  },

  "variables-algebra": {
    stability: "timeless",
    nextConcept: "functions-graphs",
    history: "Around 820 CE, al-Khwarizmi wrote the book that gave algebra its name — al-jabr, 'restoring balance'. His insight was that you can reason about an unknown amount by keeping an equation balanced, the same move every programmer makes when solving for an unknown in code.",
    mentalModels: [
      { name: "Named box", description: "A variable is a labeled container that can hold any value. The name lets you write one rule that works for every possible content of the box." },
      { name: "Balance scale", description: "An equation is a scale with two pans that must stay level. Whatever you do to one side you must do to the other, and solving means isolating the unknown while keeping balance." }
    ],
    analogies: [
      { analogy: "A recipe written 'per guest' instead of for exactly six guests", strength: 4, whenToUse: "When showing why naming an unknown makes a rule reusable." },
      { analogy: "A spreadsheet cell reference like =A1*2 that recalculates for any input", strength: 5, whenToUse: "When bridging from algebraic variables to variables in software." }
    ],
    experiment: {
      id: "balance-solve-x",
      type: "balance-solve",
      title: "Balance the scale to find x",
      instructions: "The left pan holds x + 3, the right pan holds 7. Slide x until the scale balances. That moment of balance is what 'solving an equation' means.",
      config: { coefficient: 1, offset: 3, target: 7, min: 0, max: 10 }
    },
    steps: {
      experiment: "Play the balance experiment above: slide x until the scale levels. Before it balances, describe what the tilt is telling you about your current guess.",
      fail: "Break it: set x to a value that clearly cannot balance and explain why no amount of wishing makes 9 + 3 equal 7. What does this say about equations having specific solutions?",
      discover: "Write the general rule you discovered: an equation states that two expressions are the same quantity, and solving means finding the values of the unknown that make the statement true."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "unknown", label: "Describe a variable as a named unknown or placeholder.", pattern: "(variable|unknown|placeholder|symbol|\\bx\\b)" },
        { id: "relationship", label: "Reference the equation or relationship between quantities.", pattern: "(equation|expression|relationship|formula|rule|balance)" },
        { id: "solve", label: "Explain solving as isolating or balancing.", pattern: "(solve|isolat|both sides|undo|balanc)" },
        { id: "generalize", label: "Note that variables make rules reusable for any value.", pattern: "(general|any value|reusab|pattern|abstract|every)" },
        { id: "application", label: "Connect variables to code, data, or a decision.", pattern: "(code|program|feature|model|decision|spreadsheet|use)" }
      ]
    }
  },

  "functions-graphs": {
    stability: "timeless",
    nextConcept: "coordinates-vectors",
    history: "Leibniz coined the word 'function' in the 1690s and Euler gave us f(x) in 1734 — notation for the idea that one quantity depends on another by a fixed rule. Every API, every spreadsheet formula, and every machine-learning model is still exactly this: input, rule, output.",
    mentalModels: [
      { name: "Machine with a slot", description: "A function is a machine: put an input in the slot, the machine applies its one rule, an output comes out. Nothing else goes in; nothing else comes out." },
      { name: "Faithful promise", description: "A function promises that the same input always produces the same output. That determinism is what makes functions testable, graphable, and safe to build on." }
    ],
    analogies: [
      { analogy: "A vending machine: code B4 always drops the same snack", strength: 5, whenToUse: "When introducing input→rule→output to a complete beginner." },
      { analogy: "A coffee grinder: beans in, grounds out — never the reverse", strength: 3, whenToUse: "When emphasizing the one-way direction of a mapping." }
    ],
    experiment: {
      id: "function-machine-line",
      type: "function-machine",
      title: "Drive the function machine",
      instructions: "Slide the input x and watch f(x) = 2x + 3 compute the output while the point rides along the line. The graph IS the machine's entire behavior, drawn at once.",
      config: { m: 2, b: 3, xMin: -5, xMax: 5 }
    },
    steps: {
      experiment: "Play the function machine above: slide x across its whole range. What stays the same on every slide, and what changes? Where do you see the '+3' and the '×2' in the picture?",
      fail: "Break it: try to find one input x that produces two different outputs on different tries. You cannot — explain why that impossibility is the defining property of a function.",
      discover: "State your discovery: the graph is not decoration; it is every input-output pair of the rule drawn simultaneously, which is why reading a graph is reading the function's full behavior."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "input-output", label: "Describe inputs and outputs explicitly.", pattern: "(input|output|argument|return)" },
        { id: "mapping", label: "Describe the fixed rule or mapping.", pattern: "(map|rule|machine|transform|assign|f\\(x\\))" },
        { id: "graph", label: "Connect the rule to its graph or slope.", pattern: "(graph|plot|axis|curve|line|slope)" },
        { id: "determinism", label: "Note that the same input always gives the same output.", pattern: "(same|every time|consistent|determin|predictable|always)" },
        { id: "application", label: "Connect functions to prediction, code, or models.", pattern: "(model|predict|code|api|formula|use)" }
      ]
    }
  },

  "coordinates-vectors": {
    stability: "timeless",
    nextConcept: "matrices-transformations",
    history: "Descartes fused algebra and geometry with coordinates in 1637; Hamilton and Grassmann built vectors in the 1840s so physics could speak of force and direction. Machine learning inherited the whole toolkit: every example becomes a point, every feature list a vector, and 'similar' becomes 'nearby'.",
    mentalModels: [
      { name: "Arrow with length and direction", description: "A vector is an arrow: it points somewhere with a certain strength. Two numbers (the components) fully describe the arrow, and the arrow fully describes the two numbers." },
      { name: "Address in space", description: "A list of coordinates is an address. With d numbers you can address any point in d-dimensional space — which is how a customer, an image, or a word becomes a point a model can work with." }
    ],
    analogies: [
      { analogy: "GPS displacement: 3 km east and 2 km north is one arrow", strength: 5, whenToUse: "When introducing components combining into a single direction and distance." },
      { analogy: "A shopping list of amounts (2 milk, 1 bread, 3 eggs) as a vector", strength: 4, whenToUse: "When bridging from geometric arrows to data feature vectors." }
    ],
    experiment: {
      id: "vector-drag-grid",
      type: "vector-drag",
      title: "Drag the arrow",
      instructions: "Drag anywhere on the grid to point the arrow. Watch the (x, y) components and the magnitude update live — the arrow and the numbers are the same object.",
      config: { range: 6 }
    },
    steps: {
      experiment: "Play the vector experiment above: drag the arrow to point in different directions. Find a position where both components are equal, then one where a component is negative. What does a negative component mean physically?",
      fail: "Break it: try to describe the arrow's direction and length using a single number. What information do you lose? Why does one number per axis fix the problem?",
      discover: "State your discovery: a vector packages direction and magnitude as an ordered list of components, and that packaging is exactly how datasets represent every example as a point in feature space."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "components", label: "Reference components or coordinates per axis.", pattern: "(component|coordinate|x and y|axis|dimension)" },
        { id: "magnitude", label: "Reference magnitude, length, or direction.", pattern: "(magnitude|length|direction|angle|distance)" },
        { id: "representation", label: "Describe vectors as representing positions or features.", pattern: "(represent|encode|position|point|feature)" },
        { id: "operations", label: "Mention combining, adding, or scaling vectors.", pattern: "(add|scale|dot|combine|subtract|sum)" },
        { id: "application", label: "Connect vectors to data, embeddings, or similarity.", pattern: "(embedding|model|data|similarity|dataset|use)" }
      ]
    }
  },

  "matrices-transformations": {
    stability: "timeless",
    nextConcept: "probability-uncertainty",
    history: "Arthur Cayley wrote down matrix algebra in 1858 as bookkeeping for systems of equations, and it turned out to be the mathematics of transformation itself. A century and a half later, a neural network layer is literally one matrix multiplying every input vector.",
    mentalModels: [
      { name: "A machine that moves every point at once", description: "A matrix does not transform one point; it transforms all of space in a single, consistent way. See what it does to the unit square and you know what it does to everything." },
      { name: "Table of per-axis instructions", description: "Each column of a matrix says where one axis lands. Reading the columns tells you the entire transformation before you multiply anything." }
    ],
    analogies: [
      { analogy: "A photo filter applied to every pixel at once", strength: 5, whenToUse: "When showing that a matrix acts on all of space uniformly." },
      { analogy: "A table of currency exchange rates converting whole portfolios in one shot", strength: 4, whenToUse: "When bridging matrices to batch data processing." }
    ],
    experiment: {
      id: "matrix-square-warp",
      type: "matrix-transform",
      title: "Warp the unit square",
      instructions: "Slide the four entries a, b, c, d of a 2×2 matrix and watch the grey unit square become the orange shape. The determinant readout is the area scale factor.",
      config: { start: { a: 1, b: 0, c: 0, d: 1 } }
    },
    steps: {
      experiment: "Play the matrix experiment above: make the square stretch, squash, rotate, and shear. Then find settings where the orange shape collapses flat. What is the determinant at that moment?",
      fail: "Break it: with the shape collapsed flat (determinant zero), explain why no matrix can un-collapse it. What information was destroyed, and why does that make some transformations irreversible?",
      discover: "State your discovery: a matrix is a reusable transformation of all of space, columns show where axes land, and the determinant measures how area scales — including the fatal case of zero."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "structure", label: "Reference rows, columns, or grid structure.", pattern: "(rows?|columns?|table|grid|entries|2.2)" },
        { id: "transformation", label: "Describe matrices as transforming space or data.", pattern: "(transform|rotate|scale|stretch|reshape|shear|map)" },
        { id: "order", label: "Note that order of application matters.", pattern: "(order|commut|matters|sequence|first|then)" },
        { id: "composition", label: "Mention multiplication or composing transformations.", pattern: "(multipl|combine|composition|chain)" },
        { id: "application", label: "Connect matrices to networks, images, or systems.", pattern: "(image|network|weights|layer|data|system|use)" }
      ]
    }
  },

  "probability-uncertainty": {
    stability: "timeless",
    nextConcept: "statistics-distributions",
    history: "In 1654 Pascal and Fermat exchanged letters about how to split the pot of an interrupted gambling game — and accidentally founded the mathematics of uncertainty. Every spam filter, weather forecast, and language-model token today is scored on their 0-to-1 scale.",
    mentalModels: [
      { name: "Long-run frequency", description: "A probability is what fraction of the time an outcome happens if you could repeat the situation endlessly. One trial proves nothing; the long run reveals the number." },
      { name: "Belief meter from 0 to 1", description: "Probability is a calibrated dial for confidence: 0 means impossible, 1 means certain, and everything interesting lives in between — with rules for updating the dial as evidence arrives." }
    ],
    analogies: [
      { analogy: "A weather forecast saying 30% rain — neither promise nor denial", strength: 5, whenToUse: "When explaining what a single probability actually claims." },
      { analogy: "A fair die versus a loaded die: same faces, different long-run behavior", strength: 4, whenToUse: "When separating outcomes from their likelihoods." }
    ],
    experiment: {
      id: "two-dice-histogram",
      type: "dice-histogram",
      title: "Roll two dice, watch order emerge",
      instructions: "Roll two dice once, then a hundred times. Chaos in single rolls becomes a predictable shape in bulk — sum 7 is the tallest bar for a countable reason.",
      config: {}
    },
    steps: {
      experiment: "Play the dice experiment above: roll once and note the sum, then roll 100 times repeatedly. When does the histogram start looking stable, and which sum dominates?",
      fail: "Break it: try to predict the exact sum of the next single roll from the histogram. You cannot — explain the difference between predicting one outcome and predicting the pattern of many.",
      discover: "State your discovery: randomness in single events coexists with stable structure in aggregates, and probability is the mathematics of that structure — six ways to make 7, one way to make 2."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "uncertainty", label: "Describe uncertainty, chance, or likelihood.", pattern: "(uncertain|chance|random|likel|probab)" },
        { id: "scale", label: "Use the 0-to-1 or percentage scale correctly.", pattern: "(zero|one|0|1|percent|%|fraction)" },
        { id: "evidence", label: "Ground probability in repeated trials or data.", pattern: "(frequen|trials?|repeat|long run|many|data)" },
        { id: "conditional", label: "Note that probabilities depend on conditions or context.", pattern: "(condition|given|depends|context|update)" },
        { id: "application", label: "Connect probability to risk, prediction, or model confidence.", pattern: "(risk|predict|model|decision|confidence|use)" }
      ]
    }
  },

  "statistics-distributions": {
    stability: "timeless",
    nextConcept: "derivatives-gradients",
    history: "Quetelet applied astronomy's error curves to people in the 1830s, Galton mapped variation, and Fisher built the machinery of sampling in the 1920s. Their central discovery — that honest summaries of messy data are possible — is the entire reason machine learning generalizes from a sample to the world.",
    mentalModels: [
      { name: "Summary as compression", description: "A mean or variance is lossy compression of many values into few. Compression is powerful and dangerous: it enables decisions and hides individuals, so you must know what was thrown away." },
      { name: "A spoonful of the soup", description: "A sample is one spoonful used to judge the whole pot. It works only if the pot is stirred — a biased sample is an unstirred pot, and no amount of mathematics fixes it." }
    ],
    analogies: [
      { analogy: "Tasting one stirred spoonful to season an entire pot of soup", strength: 5, whenToUse: "When introducing sampling and representativeness." },
      { analogy: "A class average of 75 hiding scores of 40 and 100", strength: 4, whenToUse: "When showing that centers without spread mislead." }
    ],
    experiment: {
      id: "sample-means-converge",
      type: "sampling-mean",
      title: "Watch sample means settle",
      instructions: "Draw samples of 10 from a messy, skewed population. Single samples wobble, but the average of the sample means homes in on the true mean — the law of large numbers, live.",
      config: { trueMean: 52, sampleSize: 10 }
    },
    steps: {
      experiment: "Play the sampling experiment above: draw one sample, then twenty. How far can a single sample mean stray from the green line, and what happens to the running average as samples accumulate?",
      fail: "Break it: suppose your sampling only ever reached the low values in the population (an unstirred pot). Explain why every summary computed from it would be confidently wrong.",
      discover: "State your discovery: statistics trades individuals for patterns — a fair sample plus center-and-spread summaries lets a small dataset speak for a large world, and a biased sample lies at scale."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "center", label: "Reference a center such as mean or median.", pattern: "(mean|average|median|center)" },
        { id: "spread", label: "Reference spread such as variance or deviation.", pattern: "(variance|spread|deviation|range|wobble|vary)" },
        { id: "sample", label: "Distinguish sample from population.", pattern: "(sample|population|subset|draw|represent)" },
        { id: "distribution", label: "Describe distribution shape or histogram.", pattern: "(distribution|histogram|shape|skew|normal|bell)" },
        { id: "application", label: "Connect statistics to estimation, bias, or decisions.", pattern: "(data|model|estimate|decision|bias|use)" }
      ]
    }
  },

  "derivatives-gradients": {
    stability: "timeless",
    nextConcept: "loss-optimization",
    history: "Newton and Leibniz independently invented calculus in the 1660s-80s to capture instantaneous change — the speed of a planet at a moment, not over an hour. That same 'slope right here, right now' is the gradient that tells a neural network which way to adjust every weight.",
    mentalModels: [
      { name: "Speedometer, not odometer", description: "The odometer tells you total distance; the speedometer tells you the rate right now. A derivative is the speedometer of any changing quantity." },
      { name: "Zoom until it looks straight", description: "Zoom far enough into any smooth curve and it becomes indistinguishable from a straight line. The slope of that line is the derivative at that point." }
    ],
    analogies: [
      { analogy: "A car speedometer reading at one instant of a journey", strength: 5, whenToUse: "When separating instantaneous rate from accumulated total." },
      { analogy: "Feeling the steepness of a hiking trail underfoot at each step", strength: 4, whenToUse: "When introducing slope as a local, position-dependent quantity." }
    ],
    experiment: {
      id: "tangent-slope-explorer",
      type: "slope-explorer",
      title: "Ride the tangent line",
      instructions: "Slide a point along the curve y = x² and watch the tangent line tilt. The slope readout is 2x — the derivative, changing from point to point.",
      config: { a: 1 }
    },
    steps: {
      experiment: "Play the slope experiment above: slide from x = -3 to x = 3. Where is the slope steepest, where is it zero, and what is special about the point where it is zero?",
      fail: "Break it: try to state 'the slope of the curve' as one single number for the whole curve. Why is that impossible, and what does that force the derivative to be?",
      discover: "State your discovery: the derivative is itself a function — a rule (2x) giving the instantaneous slope at every point — and the sign of that slope tells you which direction is downhill."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "rate", label: "Describe a rate of change or slope.", pattern: "(rate|change|slope|steep)" },
        { id: "instant", label: "Emphasize the instantaneous, local nature.", pattern: "(instant|point|moment|local|right now|at x)" },
        { id: "direction", label: "Use the sign or direction of the slope.", pattern: "(direction|increase|decrease|sign|downhill|uphill|negative|positive)" },
        { id: "gradient", label: "Reference the derivative or gradient explicitly.", pattern: "(gradient|derivative|2x|tangent)" },
        { id: "application", label: "Connect derivatives to optimization or learning.", pattern: "(optimi|learn|train|adjust|minimize|use)" }
      ]
    }
  },

  "loss-optimization": {
    stability: "timeless",
    nextConcept: "data-features-targets",
    history: "Legendre and Gauss invented least squares around 1805 to fit orbits to messy telescope data, and Cauchy described gradient descent in 1847. Together they defined the loop that trains every modern model: measure the error, follow the slope downhill, repeat.",
    mentalModels: [
      { name: "Error landscape", description: "Imagine a landscape where your position is the model's parameters and the altitude is the error. Training is hiking downhill in fog — you can only feel the local slope." },
      { name: "Ball rolling into a valley", description: "Gradient descent is a ball rolling downhill: big slope means big steps, and near the valley floor the slope — and therefore the steps — shrink toward zero." }
    ],
    analogies: [
      { analogy: "The hotter/colder searching game — feedback without the answer", strength: 4, whenToUse: "When explaining how loss guides search without revealing the optimum." },
      { analogy: "A ball released on a curved bowl finding the bottom", strength: 5, whenToUse: "When introducing gradient descent dynamics and learning rate." }
    ],
    experiment: {
      id: "gradient-descent-ball",
      type: "gradient-descent",
      title: "Roll the ball down the loss curve",
      instructions: "Take gradient steps with the update w ← w − learningRate × 2w and watch the ball descend the loss curve. Then crank the learning rate past 1.0 and watch it diverge.",
      config: { start: 4, learningRate: 0.2 }
    },
    steps: {
      experiment: "Play the gradient descent experiment above with a small learning rate: watch the steps shrink as the ball nears the bottom. Why do the steps shrink even though the rule never changes?",
      fail: "Break it: set the learning rate above 1.0 and take steps. Describe exactly what goes wrong and why each step overshoots to a point with an even bigger slope.",
      discover: "State your discovery: optimization needs only a loss to measure badness, a gradient to point downhill, and a step size small enough to not overshoot — that triple is the engine of all training."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "error", label: "Describe loss as measured error or difference.", pattern: "(error|loss|mistake|difference|residual)" },
        { id: "objective", label: "State the goal of minimizing the loss.", pattern: "(minimi|objective|goal|lower|reduce|smallest)" },
        { id: "gradient-step", label: "Describe stepping along the gradient.", pattern: "(gradient|step|descent|update|adjust|downhill)" },
        { id: "learning-rate", label: "Reason about step size, overshoot, or divergence.", pattern: "(learning rate|step size|too big|too small|overshoot|diverge)" },
        { id: "application", label: "Connect optimization to training models.", pattern: "(train|model|weights|converge|tune|use)" }
      ]
    }
  },

  "data-features-targets": {
    stability: "mostly-timeless",
    nextConcept: "linear-regression",
    history: "Statisticians spent a century learning that conclusions inherit the flaws of their data, and early computing coined 'garbage in, garbage out' in the 1950s. Machine learning made the lesson existential: a model is compressed data, so corrupted or biased data becomes a corrupted or biased model.",
    mentalModels: [
      { name: "Fuel of learning", description: "Data is the fuel and the model is the engine. No engine design compensates for contaminated fuel, and the most reliable way to improve a model is to improve its data." },
      { name: "Features are questions", description: "Each feature column is a question asked of every example. Choosing features is choosing which questions get asked — leave out the important question and no model can answer it." }
    ],
    analogies: [
      { analogy: "Ingredients decide the dish more than the recipe does", strength: 5, whenToUse: "When arguing that data quality dominates model choice." },
      { analogy: "A job application form: the fields are features, the hiring decision is the target", strength: 4, whenToUse: "When defining features versus targets on a familiar object." }
    ],
    experiment: {
      id: "corrupted-point-fit",
      type: "outlier-fit",
      title: "One bad row bends the model",
      instructions: "A clean dataset with a clear trend — and one corrupted point where a value was logged in the wrong unit. Toggle it in and out and watch the fitted line lurch.",
      config: {}
    },
    steps: {
      experiment: "Play the corrupted-point experiment above: toggle the bad row in and out several times. How much does the slope move, and would you have noticed the corruption in a table of ten thousand rows?",
      fail: "Break it: imagine the corrupted value passed silently into training. Trace the damage: wrong slope, wrong predictions, wrong decisions. Name the check that would have caught it at ingestion.",
      discover: "State your discovery: a model is only a summary of its training rows, so one undetected corrupt row — or a systematically biased sample — is transmitted straight into every prediction."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "features", label: "Identify features as model inputs.", pattern: "(feature|input|column|attribute|signal)" },
        { id: "target", label: "Identify the target or label being predicted.", pattern: "(target|label|output|answer|supervis|predict)" },
        { id: "quality", label: "Name a data-quality failure mode.", pattern: "(quality|clean|missing|outlier|corrupt|garbage|wrong unit)" },
        { id: "representative", label: "Reason about representativeness or bias.", pattern: "(representative|bias|sample|coverage|distribution)" },
        { id: "application", label: "Connect data quality to a check or pipeline guardrail.", pattern: "(model|train|pipeline|check|validate|guardrail|use)" }
      ]
    }
  },

  "linear-regression": {
    stability: "timeless",
    nextConcept: "neural-networks",
    history: "Galton noticed 'regression to the mean' in heredity data in 1886, using the least-squares machinery Legendre and Gauss built for astronomy. Linear regression became the first supervised learning algorithm — and its predict → measure loss → gradient step loop is, unchanged, the loop that trains GPT.",
    mentalModels: [
      { name: "Best straight line through experience", description: "The model is one line summarizing every (input, outcome) pair seen so far. Prediction is reading the line; training is choosing the line that disagrees least with experience." },
      { name: "The learning loop", description: "Predict with current parameters, measure the error, nudge the parameters downhill, repeat. Every learning system from this lesson to a frontier LLM runs this exact loop at different scale." }
    ],
    analogies: [
      { analogy: "A pricing rule of thumb refined after every sale", strength: 5, whenToUse: "When framing training as experience gradually adjusting a simple rule." },
      { analogy: "Tuning a shower knob toward comfortable by feel", strength: 4, whenToUse: "When connecting gradient steps to small corrective adjustments." }
    ],
    experiment: {
      id: "fit-line-by-hand",
      type: "fit-line",
      title: "Train a model with your own hands",
      instructions: "Slide w and b to lower the MSE yourself, then press the gradient-step button and watch the exact update rule dw = mean(2x(ŷ−y)), db = mean(2(ŷ−y)) do your job automatically.",
      config: { learningRate: 0.01, startW: 0, startB: 0 }
    },
    steps: {
      experiment: "Play the fit-line experiment above: first minimize the MSE by hand with the sliders, then reset and let gradient steps do it. Which approach found a lower error, and which scales to a million parameters?",
      fail: "Break it: set w and b as badly as possible and note the MSE. Then take gradient steps from there. Why does the same update rule recover from any starting point on this loss surface?",
      discover: "State your discovery: training is not magic — it is measuring squared error and repeatedly applying dw = mean(2x(ŷ−y)), db = mean(2(ŷ−y)). You have now trained a model from scratch."
    },
    masteryRubric: {
      threshold: 3,
      checks: [
        { id: "model", label: "Describe the linear model with slope and intercept.", pattern: "(line|linear|slope|weight|intercept|\\bw\\b|\\bb\\b)" },
        { id: "loss", label: "Reference the loss such as mean squared error.", pattern: "(loss|mse|error|squared)" },
        { id: "training", label: "Describe training as iterative gradient updates.", pattern: "(gradient|descent|train|update|iterate|step)" },
        { id: "evaluation", label: "Reason about evaluation on unseen data.", pattern: "(evaluat|test|unseen|generaliz|validate|metric)" },
        { id: "application", label: "Connect regression to prediction or a baseline in production.", pattern: "(predict|deploy|baseline|production|decision|use)" }
      ]
    }
  }
};

for (const node of graph.nodes) {
  const v1 = JSON.parse(await readFile(resolve(objectDir, `${node.id}.v1.json`), "utf8"));
  const aug = AUGMENTATIONS[node.id];
  if (!aug) throw new Error(`missing augmentation for ${node.id}`);

  const steps = [...v1.learning.steps];
  const firstPredict = steps.findIndex((step) => step.kind === "predict");
  steps.splice(firstPredict + 1, 0,
    { kind: "experiment", experimentId: aug.experiment.id, prompt: aug.steps.experiment },
    { kind: "fail", prompt: aug.steps.fail },
    { kind: "discover", prompt: aug.steps.discover }
  );

  const v2 = {
    id: v1.id,
    version: "2.0.0",
    title: v1.title,
    scope: v1.scope,
    stability: aug.stability,
    beginnerEntry: v1.beginnerEntry,
    nextConcept: aug.nextConcept,
    knowledge: {
      conceptId: v1.knowledge.conceptId,
      prerequisites: v1.knowledge.prerequisites,
      relatedConcepts: v1.knowledge.relatedConcepts,
      history: aug.history,
      mentalModels: aug.mentalModels,
      analogies: aug.analogies
    },
    learning: {
      objectives: v1.learning.objectives,
      estimatedMinutes: v1.learning.estimatedMinutes + 15,
      steps,
      experiments: [aug.experiment]
    },
    measurement: {
      prePrompt: v1.measurement.prePrompt,
      postPrompt: v1.measurement.postPrompt,
      successCriteria: v1.measurement.successCriteria,
      masteryRubric: aug.masteryRubric
    },
    reasoning: v1.reasoning,
    provenance: {
      source: `${v1.provenance.source} Migrated to LOS v2.0 under ADR-0003/0004/0005.`,
      status: "validated"
    }
  };

  await writeFile(resolve(objectDir, `${node.id}.v2.json`), `${JSON.stringify(v2, null, 2)}\n`);
  console.log(`migrated: ${node.id}.v2.json`);
}
