const test = require("node:test");
const assert = require("node:assert/strict");

const {
  INPUT_TYPES,
  calculate,
  convertUnitsToInput,
  getResultMetrics,
  parseInputToUnits,
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

test("Unit mode is identical to the legacy calculator for 0 through 1,000,000", () => {
  for (let units = 0; units <= 1_000_000; units += 1) {
    const parsed = parseInputToUnits(String(units), "units");
    assert.equal(parsed.isValid, true);
    assert.deepEqual(calculate(parsed.units), legacyCalculate(units));
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
      assert.deepEqual(calculate(parsed.units), expected);
    }
  }
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
