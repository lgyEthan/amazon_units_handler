const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BOX_TYPES,
  INPUT_TYPES,
  calculate,
  convertUnitsToInput,
  getQuickSteps,
  getResultMetrics,
  parseInputToUnits,
  resolveBoxType,
} = require("../calculator.js");

function legacyCalculate(units) {
  return {
    units,
    boxes: Math.floor(units / 12),
    excessUnits: units % 12,
    dozens: units * 0.5,
    pairs: units * 6,
  };
}

function expectedCalculate(units, boxUnitCount) {
  return {
    units,
    boxes: Math.floor(units / boxUnitCount),
    excessUnits: units % boxUnitCount,
    dozens: units * 0.5,
    pairs: units * 6,
  };
}

test("Unit mode is identical to the legacy calculator for 0 through 1,000,000", () => {
  for (let units = 0; units <= 1_000_000; units += 1) {
    const parsed = parseInputToUnits(String(units), "units");
    assert.equal(parsed.isValid, true);
    assert.deepEqual(calculate(parsed.units), legacyCalculate(units));
  }
});

test("all six input and box combinations match the independent formula for 0 through 1,000,000 units", () => {
  for (let units = 0; units <= 1_000_000; units += 1) {
    for (const inputType of Object.keys(INPUT_TYPES)) {
      const input = convertUnitsToInput(units, inputType);
      const parsed = parseInputToUnits(String(input), inputType);
      assert.equal(parsed.isValid, true, `${input} ${inputType} should be valid`);
      assert.equal(parsed.units, units);

      for (const [boxType, boxConfig] of Object.entries(BOX_TYPES)) {
        const actual = calculate(parsed.units, boxType);
        assert.deepEqual(actual, expectedCalculate(units, boxConfig.unitCount));
        assert.equal(actual.boxes * boxConfig.unitCount + actual.excessUnits, units);
        assert.ok(actual.excessUnits >= 0 && actual.excessUnits < boxConfig.unitCount);
      }
    }
  }
});

test("legacy Unit normalization remains unchanged", () => {
  assert.deepEqual(parseInputToUnits("", "units"), {
    isValid: true,
    units: 0,
    normalizedInput: 0,
    message: "",
  });
  assert.equal(parseInputToUnits("-3", "units").units, 0);
  assert.equal(parseInputToUnits("13.9", "units").units, 13);
  assert.equal(parseInputToUnits("not-a-number", "units").units, 0);
});

test("equivalent Units, Pairs, and Dozen inputs return identical results", () => {
  const fixtures = [0, 1, 11, 12, 13, 23, 24, 25, 47, 48, 12_345];

  for (const units of fixtures) {
    const expected = legacyCalculate(units);

    for (const inputType of Object.keys(INPUT_TYPES)) {
      const input = convertUnitsToInput(units, inputType);
      const parsed = parseInputToUnits(String(input), inputType);
      assert.equal(parsed.isValid, true, `${input} ${inputType} should be valid`);
      assert.deepEqual(calculate(parsed.units, "hybrid"), expected);
    }
  }
});

test("Hybrid and large box boundaries use 12 and 18 units without changing conversions", () => {
  const fixtures = [0, 1, 11, 12, 13, 17, 18, 19, 23, 24, 25, 35, 36, 37, 1_000_000];

  for (const units of fixtures) {
    assert.deepEqual(calculate(units, "hybrid"), expectedCalculate(units, 12));
    assert.deepEqual(calculate(units, "large"), expectedCalculate(units, 18));
  }
});

test("quick adjustments follow both box capacities for every input type", () => {
  for (const config of Object.values(INPUT_TYPES)) {
    assert.equal(Object.hasOwn(config, "quickSteps"), false);
  }

  assert.deepEqual(getQuickSteps("units", "hybrid"), [-12, -1, 1, 12]);
  assert.deepEqual(getQuickSteps("pairs", "hybrid"), [-72, -6, 6, 72]);
  assert.deepEqual(getQuickSteps("dozen", "hybrid"), [-6, -0.5, 0.5, 6]);
  assert.deepEqual(getQuickSteps("units", "large"), [-18, -1, 1, 18]);
  assert.deepEqual(getQuickSteps("pairs", "large"), [-108, -6, 6, 108]);
  assert.deepEqual(getQuickSteps("dozen", "large"), [-9, -0.5, 0.5, 9]);
});

test("Pairs and Dozen reject quantities that would silently discard partial Units", () => {
  const pairs = parseInputToUnits("7", "pairs");
  const dozen = parseInputToUnits("1.25", "dozen");

  assert.equal(pairs.isValid, false);
  assert.match(pairs.message, /6개 단위/);
  assert.equal(dozen.isValid, false);
  assert.match(dozen.message, /0\.5 단위/);
});

test("Pairs and Dozen reject negative quantities instead of displaying a stale zero result", () => {
  const pairs = parseInputToUnits("-6", "pairs");
  const dozen = parseInputToUnits("-0.5", "dozen");

  assert.equal(pairs.isValid, false);
  assert.match(pairs.message, /0 이상의 수량/);
  assert.equal(dozen.isValid, false);
  assert.match(dozen.message, /0 이상의 수량/);
});

test("unknown input types safely fall back to Units", () => {
  assert.deepEqual(parseInputToUnits("13", "unknown"), parseInputToUnits("13", "units"));
});

test("unknown box types safely fall back to Hybrid Box", () => {
  assert.equal(resolveBoxType("unknown"), "hybrid");
  assert.deepEqual(calculate(37, "unknown"), calculate(37, "hybrid"));
  assert.deepEqual(getQuickSteps("pairs", "unknown"), getQuickSteps("pairs", "hybrid"));
});

test("result cards omit the selected input type", () => {
  const result = calculate(24);

  assert.deepEqual(getResultMetrics(result, "units"), [
    { key: "dozens", label: "# Dozen", value: 12 },
    { key: "pairs", label: "# Pair", value: 144 },
  ]);
  assert.deepEqual(getResultMetrics(result, "pairs"), [
    { key: "units", label: "# Units", value: 24 },
    { key: "dozens", label: "# Dozen", value: 12 },
  ]);
  assert.deepEqual(getResultMetrics(result, "dozen"), [
    { key: "units", label: "# Units", value: 24 },
    { key: "pairs", label: "# Pair", value: 144 },
  ]);
});
