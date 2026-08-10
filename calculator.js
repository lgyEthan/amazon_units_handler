(function initializeInventoryCalculator(globalScope) {
  "use strict";

  const BOX_UNIT_COUNT = 12;
  const LARGE_BOX_UNIT_COUNT = 18;
  const DOZEN_PER_UNIT = 0.5;
  const PAIR_PER_UNIT = 6;

  const BOX_TYPES = Object.freeze({
    hybrid: Object.freeze({
      label: "Hybrid Box",
      unitCount: BOX_UNIT_COUNT,
    }),
    large: Object.freeze({
      label: "Large box",
      unitCount: LARGE_BOX_UNIT_COUNT,
    }),
  });

  const INPUT_TYPES = Object.freeze({
    units: Object.freeze({
      label: "Units",
      inputPerUnit: 1,
      step: "any",
      quickStep: 1,
      inputMode: "decimal",
    }),
    pairs: Object.freeze({
      label: "Pairs",
      inputPerUnit: PAIR_PER_UNIT,
      step: 1,
      quickStep: 1,
      inputMode: "numeric",
    }),
    dozen: Object.freeze({
      label: "Dozen",
      inputPerUnit: DOZEN_PER_UNIT,
      step: "any",
      quickStep: DOZEN_PER_UNIT,
      inputMode: "decimal",
    }),
  });

  const RESULT_METRICS = Object.freeze({
    units: Object.freeze([
      Object.freeze({ key: "dozens", label: "# Dozen" }),
      Object.freeze({ key: "pairs", label: "# Pair" }),
    ]),
    pairs: Object.freeze([
      Object.freeze({ key: "units", label: "# Units" }),
      Object.freeze({ key: "dozens", label: "# Dozen" }),
    ]),
    dozen: Object.freeze([
      Object.freeze({ key: "units", label: "# Units" }),
      Object.freeze({ key: "pairs", label: "# Pair" }),
    ]),
  });

  const DEFAULT_BOX_TYPE = "hybrid";
  const DEFAULT_INPUT_TYPE = "units";
  const DEFAULT_UNITS = 0;
  const MIN_CANONICAL_UNITS = 1e-12;
  const MAX_CANONICAL_UNITS = Math.floor(Number.MAX_SAFE_INTEGER / PAIR_PER_UNIT);

  function resolveBoxType(boxType) {
    return Object.hasOwn(BOX_TYPES, boxType) ? boxType : DEFAULT_BOX_TYPE;
  }

  function resolveInputType(inputType) {
    return Object.hasOwn(INPUT_TYPES, inputType) ? inputType : DEFAULT_INPUT_TYPE;
  }

  function convertUnitsToInput(units, inputType) {
    const resolvedType = resolveInputType(inputType);
    return units * INPUT_TYPES[resolvedType].inputPerUnit;
  }

  function getQuickSteps(inputType, boxType) {
    const resolvedInputType = resolveInputType(inputType);
    const resolvedBoxType = resolveBoxType(boxType);
    const inputConfig = INPUT_TYPES[resolvedInputType];
    const inputPerUnit = inputConfig.inputPerUnit;
    const boxInputCount = BOX_TYPES[resolvedBoxType].unitCount * inputPerUnit;

    return [-boxInputCount, -inputConfig.quickStep, inputConfig.quickStep, boxInputCount];
  }

  function getPairBreakdown(pairs) {
    if (!Number.isSafeInteger(pairs) || pairs < 0) {
      throw new RangeError("Pairs quantity must be a nonnegative safe integer.");
    }

    const units = Math.floor(pairs / PAIR_PER_UNIT);

    return {
      units,
      dozens: units * DOZEN_PER_UNIT,
      remainderPairs: pairs % PAIR_PER_UNIT,
    };
  }

  function isCalculableUnits(units) {
    if (!Number.isFinite(units) || units < 0 || units > MAX_CANONICAL_UNITS) {
      return false;
    }

    if (units === 0) {
      return true;
    }

    return (
      units >= MIN_CANONICAL_UNITS &&
      units * DOZEN_PER_UNIT > 0 &&
      Number.isFinite(units * DOZEN_PER_UNIT) &&
      Number.isFinite(units * PAIR_PER_UNIT)
    );
  }

  function parseInputToUnits(value, inputType) {
    const resolvedType = resolveInputType(inputType);
    const rawNumeric = Number(value);

    if (!Number.isFinite(rawNumeric) || rawNumeric < 0) {
      return {
        isValid: false,
        units: null,
        normalizedInput: 0,
        message: `${INPUT_TYPES[resolvedType].label}는 0 이상의 수량을 입력해 주세요.`,
      };
    }

    if (resolvedType === "pairs" && !Number.isInteger(rawNumeric)) {
      return {
        isValid: false,
        units: null,
        normalizedInput: rawNumeric,
        message: "Pairs는 0 이상의 정수로 입력해 주세요.",
      };
    }

    const maxInputQuantity = {
      units: MAX_CANONICAL_UNITS,
      pairs: MAX_CANONICAL_UNITS * PAIR_PER_UNIT,
      dozen: MAX_CANONICAL_UNITS * DOZEN_PER_UNIT,
    }[resolvedType];

    if (rawNumeric > maxInputQuantity) {
      return {
        isValid: false,
        units: null,
        normalizedInput: rawNumeric,
        message: `${INPUT_TYPES[resolvedType].label} 수량이 계산 가능한 범위를 벗어났습니다.`,
      };
    }

    const units = rawNumeric / INPUT_TYPES[resolvedType].inputPerUnit;
    const roundTrippedInput = convertUnitsToInput(units, resolvedType);
    const losesDiscreteInput =
      Number.isInteger(rawNumeric) && roundTrippedInput !== rawNumeric;

    if (
      !isCalculableUnits(units) ||
      (rawNumeric > 0 && units === 0) ||
      losesDiscreteInput
    ) {
      return {
        isValid: false,
        units: null,
        normalizedInput: rawNumeric,
        message: `${INPUT_TYPES[resolvedType].label} 수량이 계산 가능한 범위를 벗어났습니다.`,
      };
    }

    return {
      isValid: true,
      units,
      normalizedInput: rawNumeric,
      message: "",
    };
  }

  function calculate(units, boxType = DEFAULT_BOX_TYPE) {
    if (!isCalculableUnits(units)) {
      throw new RangeError("Units quantity is outside the calculable range.");
    }

    const resolvedBoxType = resolveBoxType(boxType);
    const boxUnitCount = BOX_TYPES[resolvedBoxType].unitCount;
    const boxes = Math.floor(units / boxUnitCount);

    return {
      units,
      boxes,
      excessUnits: units - boxes * boxUnitCount,
      dozens: units * DOZEN_PER_UNIT,
      pairs: units * PAIR_PER_UNIT,
    };
  }

  function calculatePairInput(pairs, boxType = DEFAULT_BOX_TYPE) {
    const parsed = parseInputToUnits(pairs, "pairs");

    if (!parsed.isValid) {
      throw new RangeError("Pairs quantity is outside the calculable range.");
    }

    const numericPairs = parsed.normalizedInput;
    const resolvedBoxType = resolveBoxType(boxType);
    const boxPairCount = BOX_TYPES[resolvedBoxType].unitCount * PAIR_PER_UNIT;
    const boxes = Math.floor(numericPairs / boxPairCount);
    const excessPairs = numericPairs - boxes * boxPairCount;

    return {
      units: numericPairs / PAIR_PER_UNIT,
      boxes,
      excessUnits: excessPairs / PAIR_PER_UNIT,
      dozens: numericPairs / (PAIR_PER_UNIT / DOZEN_PER_UNIT),
      pairs: numericPairs,
    };
  }

  function getResultMetrics(result, inputType) {
    const resolvedType = resolveInputType(inputType);

    return RESULT_METRICS[resolvedType].map(({ key, label }) => ({
      key,
      label,
      value: result[key],
    }));
  }

  const api = Object.freeze({
    BOX_TYPES,
    BOX_UNIT_COUNT,
    DEFAULT_BOX_TYPE,
    DEFAULT_INPUT_TYPE,
    DEFAULT_UNITS,
    DOZEN_PER_UNIT,
    INPUT_TYPES,
    LARGE_BOX_UNIT_COUNT,
    MAX_CANONICAL_UNITS,
    MIN_CANONICAL_UNITS,
    PAIR_PER_UNIT,
    RESULT_METRICS,
    calculate,
    calculatePairInput,
    convertUnitsToInput,
    getQuickSteps,
    getPairBreakdown,
    getResultMetrics,
    parseInputToUnits,
    resolveBoxType,
    resolveInputType,
  });

  globalScope.InventoryCalculator = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "undefined" ? this : globalThis);
