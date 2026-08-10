const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BOX_TYPES,
  INPUT_TYPES,
  MAX_CANONICAL_UNITS,
  calculate,
  calculatePairInput,
  convertUnitsToInput,
  getPairBreakdown,
  getQuickSteps,
  getResultMetrics,
  parseInputToUnits,
  resolveBoxType,
} = require("../calculator.js");

function assertClose(actual, expected, message) {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(actual), Math.abs(expected)) * 64;
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message || "values differ"}: expected ${expected}, received ${actual}`,
  );
}

function assertResult(actual, expected, context) {
  assertClose(actual.units, expected.units, `${context} units`);
  assert.equal(actual.boxes, expected.boxes, `${context} boxes`);
  assertClose(actual.excessUnits, expected.excessUnits, `${context} excess`);
  assertClose(actual.dozens, expected.dozens, `${context} dozen`);
  assertClose(actual.pairs, expected.pairs, `${context} pairs`);
}

test("the literal 1 is reinterpreted independently as Units, Pairs, and Dozen", () => {
  const cases = [
    {
      inputType: "units",
      expected: { units: 1, boxes: 0, excessUnits: 1, dozens: 0.5, pairs: 6 },
    },
    {
      inputType: "pairs",
      expected: {
        units: 1 / 6,
        boxes: 0,
        excessUnits: 1 / 6,
        dozens: 1 / 12,
        pairs: 1,
      },
    },
    {
      inputType: "dozen",
      expected: { units: 2, boxes: 0, excessUnits: 2, dozens: 1, pairs: 12 },
    },
  ];

  for (const { inputType, expected } of cases) {
    const parsed = parseInputToUnits("1", inputType);
    assert.equal(parsed.isValid, true, `1 ${inputType} should be valid`);

    for (const boxType of ["hybrid", "large"]) {
      assertResult(calculate(parsed.units, boxType), expected, `1 ${inputType} ${boxType}`);
    }
  }
});

test("literal 12 produces six distinct, hand-authored input and box results", () => {
  const cases = [
    ["units", "hybrid", { units: 12, boxes: 1, excessUnits: 0, dozens: 6, pairs: 72 }],
    ["units", "large", { units: 12, boxes: 0, excessUnits: 12, dozens: 6, pairs: 72 }],
    ["pairs", "hybrid", { units: 2, boxes: 0, excessUnits: 2, dozens: 1, pairs: 12 }],
    ["pairs", "large", { units: 2, boxes: 0, excessUnits: 2, dozens: 1, pairs: 12 }],
    ["dozen", "hybrid", { units: 24, boxes: 2, excessUnits: 0, dozens: 12, pairs: 144 }],
    ["dozen", "large", { units: 24, boxes: 1, excessUnits: 6, dozens: 12, pairs: 144 }],
  ];

  for (const [inputType, boxType, expected] of cases) {
    const parsed = parseInputToUnits("12", inputType);
    assert.equal(parsed.isValid, true);
    assertResult(calculate(parsed.units, boxType), expected, `12 ${inputType} ${boxType}`);
  }
});

test("integer Pair quantities preserve remainders instead of requiring multiples of six", () => {
  const onePair = parseInputToUnits("1", "pairs");
  const seventyThreePairs = parseInputToUnits("73", "pairs");

  assert.equal(onePair.isValid, true);
  assertClose(onePair.units, 1 / 6, "1 pair in units");

  assertResult(
    calculate(seventyThreePairs.units, "hybrid"),
    {
      units: 73 / 6,
      boxes: 1,
      excessUnits: 1 / 6,
      dozens: 73 / 12,
      pairs: 73,
    },
    "73 pairs hybrid",
  );

  assertResult(
    calculate(seventyThreePairs.units, "large"),
    {
      units: 73 / 6,
      boxes: 0,
      excessUnits: 73 / 6,
      dozens: 73 / 12,
      pairs: 73,
    },
    "73 pairs large",
  );
});

test("Pair quotient and remainder use hand-authored six-Pair bundles", () => {
  const cases = [
    [0, 0, 0, 0],
    [1, 0, 0, 1],
    [5, 0, 0, 5],
    [6, 1, 0.5, 0],
    [7, 1, 0.5, 1],
    [11, 1, 0.5, 5],
    [12, 2, 1, 0],
    [13, 2, 1, 1],
    [71, 11, 5.5, 5],
    [72, 12, 6, 0],
    [73, 12, 6, 1],
    [107, 17, 8.5, 5],
    [108, 18, 9, 0],
    [109, 18, 9, 1],
  ];

  for (const [pairs, units, dozens, remainderPairs] of cases) {
    assert.deepEqual(getPairBreakdown(pairs), { units, dozens, remainderPairs });
  }

  for (const invalid of [-1, 0.1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => getPairBreakdown(invalid), /safe integer/);
  }
});

test("Pair-mode box arithmetic keeps integer remainders at large supported values", () => {
  const cases = [
    ["hybrid", 125_099_989_648_902, 46],
    ["large", 83_399_993_099_268, 46],
  ];

  for (const [boxType, boxes, remainderPairs] of cases) {
    const result = calculatePairInput(9_007_199_254_720_990, boxType);
    assert.equal(result.boxes, boxes);
    assertClose(result.excessUnits, remainderPairs / 6, `${boxType} exact Pair remainder`);
    assert.equal(result.pairs, 9_007_199_254_720_990);
  }
});

test("box thresholds are correct in each independently entered unit type", () => {
  const cases = [
    ["12", "units", "hybrid", 1, 0],
    ["18", "units", "large", 1, 0],
    ["72", "pairs", "hybrid", 1, 0],
    ["108", "pairs", "large", 1, 0],
    ["6", "dozen", "hybrid", 1, 0],
    ["9", "dozen", "large", 1, 0],
    ["73", "pairs", "hybrid", 1, 1 / 6],
    ["109", "pairs", "large", 1, 1 / 6],
    ["6.5", "dozen", "hybrid", 1, 1],
    ["9.5", "dozen", "large", 1, 1],
  ];

  for (const [literal, inputType, boxType, boxes, excessUnits] of cases) {
    const parsed = parseInputToUnits(literal, inputType);
    const result = calculate(parsed.units, boxType);
    assert.equal(result.boxes, boxes, `${literal} ${inputType} ${boxType} boxes`);
    assertClose(result.excessUnits, excessUnits, `${literal} ${inputType} ${boxType} excess`);
  }
});

test("supported Unit and Dozen decimals remain unchanged and valid", () => {
  for (const literal of ["0", "0.0000000001", "0.1", "1.25", "13.9"]) {
    for (const inputType of ["units", "dozen"]) {
      const config = INPUT_TYPES[inputType];
      const parsed = parseInputToUnits(literal, inputType);
      assert.equal(parsed.isValid, true, `${literal} ${inputType}`);
      assert.equal(parsed.normalizedInput, Number(literal));
      assertClose(parsed.units, Number(literal) / config.inputPerUnit, `${literal} ${inputType}`);
    }
  }
});

test("Pair input accepts whole counts and rejects fractional counts", () => {
  for (const literal of ["0", "1", "7", "72", "109", "1.0", "1e2"]) {
    const parsed = parseInputToUnits(literal, "pairs");
    assert.equal(parsed.isValid, true, `${literal} Pairs should be valid`);
    assert.equal(parsed.normalizedInput, Number(literal));
    assertClose(parsed.units, Number(literal) / 6, `${literal} Pair units`);
  }

  for (const literal of ["0.1", "1.5", "5.99999", "71.99999", "72.00001", "107.99999", "108.00001", "13.9"]) {
    const parsed = parseInputToUnits(literal, "pairs");
    assert.equal(parsed.isValid, false, `${literal} Pairs should be invalid`);
    assert.equal(parsed.units, null);
    assert.match(parsed.message, /정수/);
  }
});

test("values just below each box threshold never become a full box", () => {
  const cases = [
    ["11.99999", "units", "hybrid", 11.99999],
    ["17.99999", "units", "large", 17.99999],
    ["71", "pairs", "hybrid", 71 / 6],
    ["107", "pairs", "large", 107 / 6],
    ["5.99999", "dozen", "hybrid", 11.99998],
    ["8.99999", "dozen", "large", 17.99998],
  ];

  for (const [literal, inputType, boxType, expectedExcessUnits] of cases) {
    const parsed = parseInputToUnits(literal, inputType);
    assert.equal(parsed.isValid, true, `${literal} ${inputType} should be valid`);
    const result = calculate(parsed.units, boxType);
    assert.equal(result.boxes, 0, `${literal} ${inputType} ${boxType} boxes`);
    assertClose(
      result.excessUnits,
      expectedExcessUnits,
      `${literal} ${inputType} ${boxType} excess`,
    );
  }
});

test("values just above each box threshold retain a nonzero excess", () => {
  const cases = [
    ["12.00001", "units", "hybrid", 0.00001],
    ["18.00001", "units", "large", 0.00001],
    ["73", "pairs", "hybrid", 1 / 6],
    ["109", "pairs", "large", 1 / 6],
    ["6.00001", "dozen", "hybrid", 0.00002],
    ["9.00001", "dozen", "large", 0.00002],
  ];

  for (const [literal, inputType, boxType, expectedExcessUnits] of cases) {
    const parsed = parseInputToUnits(literal, inputType);
    assert.equal(parsed.isValid, true, `${literal} ${inputType} should be valid`);
    const result = calculate(parsed.units, boxType);
    assert.equal(result.boxes, 1, `${literal} ${inputType} ${boxType} boxes`);
    assertClose(
      result.excessUnits,
      expectedExcessUnits,
      `${literal} ${inputType} ${boxType} excess`,
    );
    assert.ok(result.excessUnits > 0);
  }
});

test("very small supported Unit and Dozen quantities are never rounded down to zero", () => {
  const tinyUnits = parseInputToUnits("0.0000000001", "units");
  const tinyDozen = parseInputToUnits("0.0000000001", "dozen");
  const unitsResult = calculate(tinyUnits.units, "hybrid");
  const dozenResult = calculate(tinyDozen.units, "large");

  assert.ok(unitsResult.excessUnits > 0);
  assert.ok(unitsResult.dozens > 0);
  assert.ok(unitsResult.pairs > 0);
  assert.ok(dozenResult.excessUnits > 0);
  assert.ok(dozenResult.dozens > 0);
  assert.ok(dozenResult.pairs > 0);
  assertClose(unitsResult.excessUnits, 1e-10, "tiny Unit excess");
  assertClose(unitsResult.dozens, 5e-11, "tiny Unit dozen");
  assertClose(unitsResult.pairs, 6e-10, "tiny Unit pairs");
  assertClose(dozenResult.excessUnits, 2e-10, "tiny Dozen excess Units");
  assertClose(dozenResult.dozens, 1e-10, "tiny Dozen total");
  assertClose(dozenResult.pairs, 1.2e-9, "tiny Dozen pairs");
});

test("negative and nonnumeric input is invalid in every input type", () => {
  for (const inputType of Object.keys(INPUT_TYPES)) {
    for (const literal of ["-0.1", "not-a-number", "Infinity"]) {
      const parsed = parseInputToUnits(literal, inputType);
      assert.equal(parsed.isValid, false, `${literal} ${inputType}`);
      assert.equal(parsed.units, null);
      assert.match(parsed.message, /0 이상의 수량/);
    }
  }
});

test("underflow, overflow, and unsafe quantities are rejected before calculation", () => {
  for (const literal of ["5e-324", "1e-323", "2e-323"]) {
    for (const inputType of Object.keys(INPUT_TYPES)) {
      assert.equal(parseInputToUnits(literal, inputType).isValid, false, `${literal} ${inputType}`);
    }
  }

  for (const inputType of Object.keys(INPUT_TYPES)) {
    const overflow = parseInputToUnits("1e308", inputType);
    assert.equal(overflow.isValid, false, `1e308 ${inputType}`);
    assert.match(overflow.message, /계산 가능한 범위/);
  }

  assert.equal(MAX_CANONICAL_UNITS, 1_501_199_875_790_165);

  const maxUnits = parseInputToUnits("1501199875790165", "units");
  const maxPairs = parseInputToUnits("9007199254740990", "pairs");
  const maxDozen = parseInputToUnits("750599937895082.5", "dozen");

  assert.equal(maxUnits.isValid, true);
  assert.equal(maxPairs.isValid, true);
  assert.equal(maxDozen.isValid, true);
  assert.equal(calculate(maxUnits.units).pairs, 9_007_199_254_740_990);
  assert.equal(calculate(maxPairs.units).pairs, 9_007_199_254_740_990);
  assert.equal(calculate(maxDozen.units).pairs, 9_007_199_254_740_990);
  assert.equal(calculate(maxPairs.units).pairs, Number("9007199254740990"));

  assert.equal(
    parseInputToUnits(String(MAX_CANONICAL_UNITS * 2), "units").isValid,
    false,
  );
  assert.equal(
    parseInputToUnits("9007199254740991", "pairs").isValid,
    false,
  );
  assert.equal(
    parseInputToUnits("9007199254740989", "pairs").isValid,
    false,
  );
  const adjacentSafePairs = parseInputToUnits("9007199254740988", "pairs");
  assert.equal(adjacentSafePairs.isValid, true);
  assert.equal(calculate(adjacentSafePairs.units).pairs, 9_007_199_254_740_988);
  assert.equal(parseInputToUnits("750599937895083", "dozen").isValid, false);
  assert.throws(() => calculate(1e308), /calculable range/);
  assert.throws(() => calculate(Number.MIN_VALUE), /calculable range/);
});

test("quick adjustments use the selected literal unit and selected box capacity", () => {
  assert.deepEqual(getQuickSteps("units", "hybrid"), [-12, -1, 1, 12]);
  assert.deepEqual(getQuickSteps("pairs", "hybrid"), [-72, -1, 1, 72]);
  assert.deepEqual(getQuickSteps("dozen", "hybrid"), [-6, -0.5, 0.5, 6]);
  assert.deepEqual(getQuickSteps("units", "large"), [-18, -1, 1, 18]);
  assert.deepEqual(getQuickSteps("pairs", "large"), [-108, -1, 1, 108]);
  assert.deepEqual(getQuickSteps("dozen", "large"), [-9, -0.5, 0.5, 9]);
});

test("integer Unit calculations retain the original 12-unit Hybrid behavior", () => {
  const cases = [
    [0, 0, 0, 0, 0],
    [1, 0, 1, 0.5, 6],
    [11, 0, 11, 5.5, 66],
    [12, 1, 0, 6, 72],
    [13, 1, 1, 6.5, 78],
    [24, 2, 0, 12, 144],
    [37, 3, 1, 18.5, 222],
  ];

  for (const [units, boxes, excessUnits, dozens, pairs] of cases) {
    assert.deepEqual(calculate(units), { units, boxes, excessUnits, dozens, pairs });
  }
});

test("conversion helper remains mathematically inverse to input parsing", () => {
  for (const units of [0, 1 / 6, 1, 12, 18.5]) {
    for (const inputType of Object.keys(INPUT_TYPES)) {
      const literal = convertUnitsToInput(units, inputType);
      const parsed = parseInputToUnits(String(literal), inputType);
      assertClose(parsed.units, units, `${units} through ${inputType}`);
    }
  }
});

test("unknown modes safely retain the documented defaults", () => {
  assert.deepEqual(parseInputToUnits("13", "unknown"), parseInputToUnits("13", "units"));
  assert.equal(resolveBoxType("unknown"), "hybrid");
  assert.deepEqual(calculate(37, "unknown"), calculate(37, "hybrid"));
  assert.deepEqual(getQuickSteps("pairs", "unknown"), getQuickSteps("pairs", "hybrid"));
  assert.equal(BOX_TYPES.hybrid.unitCount, 12);
  assert.equal(BOX_TYPES.large.unitCount, 18);
  assert.equal(BOX_TYPES.large.label, "Large box");
});

test("result metric API keeps canonical values while presentation handles Pair remainders", () => {
  const result = calculate(1 / 6);

  const pairMetrics = getResultMetrics(result, "pairs");
  assert.deepEqual(pairMetrics.map(({ key, label }) => ({ key, label })), [
    { key: "units", label: "# Units" },
    { key: "dozens", label: "# Dozen" },
  ]);
  assertClose(pairMetrics[0].value, 1 / 6, "Pair card Units value");
  assertClose(pairMetrics[1].value, 1 / 12, "Pair card Dozen value");

  assert.deepEqual(getResultMetrics(calculate(24), "units"), [
    { key: "dozens", label: "# Dozen", value: 12 },
    { key: "pairs", label: "# Pair", value: 144 },
  ]);
  assert.deepEqual(getResultMetrics(calculate(24), "dozen"), [
    { key: "units", label: "# Units", value: 24 },
    { key: "pairs", label: "# Pair", value: 144 },
  ]);
});
