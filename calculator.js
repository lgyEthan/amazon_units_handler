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
      label: "대박스",
      unitCount: LARGE_BOX_UNIT_COUNT,
    }),
  });

  const INPUT_TYPES = Object.freeze({
    units: Object.freeze({
      label: "Units",
      inputPerUnit: 1,
      step: 1,
      inputMode: "numeric",
    }),
    pairs: Object.freeze({
      label: "Pairs",
      inputPerUnit: PAIR_PER_UNIT,
      step: PAIR_PER_UNIT,
      inputMode: "numeric",
    }),
    dozen: Object.freeze({
      label: "Dozen",
      inputPerUnit: DOZEN_PER_UNIT,
      step: DOZEN_PER_UNIT,
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
  const FLOAT_TOLERANCE = 1e-9;

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
    const inputPerUnit = INPUT_TYPES[resolvedInputType].inputPerUnit;
    const boxInputCount = BOX_TYPES[resolvedBoxType].unitCount * inputPerUnit;

    return [-boxInputCount, -inputPerUnit, inputPerUnit, boxInputCount];
  }

  function parseInputToUnits(value, inputType) {
    const resolvedType = resolveInputType(inputType);
    const rawNumeric = Number(value);
    const numeric = Number.isFinite(rawNumeric) && rawNumeric >= 0 ? rawNumeric : 0;

    if (resolvedType === "units") {
      const units = Math.trunc(numeric);
      return {
        isValid: true,
        units,
        normalizedInput: units,
        message: "",
      };
    }

    if (!Number.isFinite(rawNumeric) || rawNumeric < 0) {
      return {
        isValid: false,
        units: null,
        normalizedInput: numeric,
        message: `${INPUT_TYPES[resolvedType].label}는 0 이상의 수량을 입력해 주세요.`,
      };
    }

    const rawUnits = numeric / INPUT_TYPES[resolvedType].inputPerUnit;
    const roundedUnits = Math.round(rawUnits);
    const isWholeUnit = Math.abs(rawUnits - roundedUnits) <= FLOAT_TOLERANCE;

    if (!isWholeUnit) {
      return {
        isValid: false,
        units: null,
        normalizedInput: numeric,
        message:
          resolvedType === "pairs"
            ? "Pairs는 6개 단위로 입력해 주세요. (6 pairs = 1 unit)"
            : "Dozen은 0.5 단위로 입력해 주세요. (0.5 dozen = 1 unit)",
      };
    }

    return {
      isValid: true,
      units: roundedUnits,
      normalizedInput: convertUnitsToInput(roundedUnits, resolvedType),
      message: "",
    };
  }

  function calculate(units, boxType = DEFAULT_BOX_TYPE) {
    const resolvedBoxType = resolveBoxType(boxType);
    const boxUnitCount = BOX_TYPES[resolvedBoxType].unitCount;

    return {
      units,
      boxes: Math.floor(units / boxUnitCount),
      excessUnits: units % boxUnitCount,
      dozens: units * DOZEN_PER_UNIT,
      pairs: units * PAIR_PER_UNIT,
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
    PAIR_PER_UNIT,
    RESULT_METRICS,
    calculate,
    convertUnitsToInput,
    getQuickSteps,
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
