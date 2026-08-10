const {
  BOX_TYPES,
  DEFAULT_BOX_TYPE,
  DEFAULT_INPUT_TYPE,
  DEFAULT_UNITS,
  INPUT_TYPES,
  calculate,
  convertUnitsToInput,
  getQuickSteps,
  getResultMetrics,
  parseInputToUnits,
} = window.InventoryCalculator;

const calculatorForm = document.querySelector("#calculator-form");
const quantityInput = document.querySelector("#quantity-input");
const quantityLabel = document.querySelector("#quantity-label");
const quantityError = document.querySelector("#quantity-error");
const inputTypeControls = [...document.querySelectorAll('[name="input-type"]')];
const boxTypeControls = [...document.querySelectorAll('[name="box-type"]')];
const quickActions = document.querySelector("#quick-actions");
const quickActionButtons = [...document.querySelectorAll("[data-step-index]")];
const activeBoxTypeBadge = document.querySelector("#active-box-type");
const boxOverview = document.querySelector("#box-overview");
const boxRule = document.querySelector("#box-rule");
const boxResult = document.querySelector("#box-result");
const excessResult = document.querySelector("#excess-result");
const excessCapacity = document.querySelector("#excess-capacity");
const excessUnitLabel = document.querySelector("#excess-unit-label");
const metricOneLabel = document.querySelector("#metric-one-label");
const metricOneResult = document.querySelector("#metric-one-result");
const metricTwoLabel = document.querySelector("#metric-two-label");
const metricTwoResult = document.querySelector("#metric-two-result");
const fullBoxRow = document.querySelector("#full-box-row");
const excessUnitGrid = document.querySelector("#excess-unit-grid");
const summaryOutput = document.querySelector("#summary-output");
const copyButton = document.querySelector("#copy-button");
const resetButton = document.querySelector("#reset-button");
const copyStatus = document.querySelector("#copy-status");
const copyBuffer = document.querySelector("#copy-buffer");

let activeBoxType = DEFAULT_BOX_TYPE;
let activeInputType = DEFAULT_INPUT_TYPE;
let currentUnits = DEFAULT_UNITS;
let lastSummary = "";
let copyStatusTimer;

function formatNumber(value) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue > 0 && absoluteValue < 0.0001) {
    return value
      .toExponential(4)
      .replace(/\.0+e/, "e")
      .replace(/(\.\d*?[1-9])0+e/, "$1e")
      .replace("e+", "e");
  }

  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 4,
  }).format(value);
}

function formatInputValue(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
}

function formatSignedNumber(value) {
  const formatted = formatInputValue(Math.abs(value));
  return `${value > 0 ? "+" : "-"}${formatted}`;
}

function renderFullBoxes(boxes) {
  fullBoxRow.replaceChildren();

  const visibleBoxes = Math.min(boxes, 3);

  for (let index = 0; index < visibleBoxes; index += 1) {
    const box = document.createElement("span");
    box.className = "mini-box is-filled";
    fullBoxRow.append(box);
  }

  if (boxes > visibleBoxes) {
    const badge = document.createElement("span");
    badge.className = "box-count-badge";
    badge.textContent = `+${formatNumber(boxes - visibleBoxes)}`;
    fullBoxRow.append(badge);
  }

  if (boxes === 0) {
    const emptyBox = document.createElement("span");
    emptyBox.className = "mini-box is-empty";
    fullBoxRow.append(emptyBox);
  }
}

function renderExcessBox(excessUnits, boxUnitCount) {
  excessUnitGrid.replaceChildren();
  const fullUnits = Math.floor(excessUnits);
  const partialUnit = excessUnits - fullUnits;

  for (let index = 0; index < boxUnitCount; index += 1) {
    const unit = document.createElement("span");

    if (index < fullUnits) {
      unit.className = "unit-token is-filled";
    } else if (index === fullUnits && partialUnit > 0) {
      unit.className = "unit-token is-partial";
      unit.style.setProperty("--fill-percent", `${partialUnit * 100}%`);
      unit.dataset.fillFraction = formatInputValue(partialUnit);
    } else {
      unit.className = "unit-token";
    }

    excessUnitGrid.append(unit);
  }
}

function getActiveBoxMeasure(excessUnits = 0) {
  const inputConfig = INPUT_TYPES[activeInputType];
  const boxConfig = BOX_TYPES[activeBoxType];

  return {
    capacity: boxConfig.unitCount * inputConfig.inputPerUnit,
    excess: convertUnitsToInput(excessUnits, activeInputType),
    unitLabel: inputConfig.label.toLowerCase(),
  };
}

function renderExcessMeasure(excessUnits) {
  const measure = getActiveBoxMeasure(excessUnits);
  excessResult.textContent = formatNumber(measure.excess);
  excessCapacity.textContent = formatNumber(measure.capacity);
  excessUnitLabel.textContent = measure.unitLabel;
  return measure;
}

function renderResultMetrics(result) {
  const [firstMetric, secondMetric] = getResultMetrics(result, activeInputType);

  metricOneLabel.textContent = firstMetric.label;
  metricOneResult.textContent = formatNumber(firstMetric.value);
  metricTwoLabel.textContent = secondMetric.label;
  metricTwoResult.textContent = formatNumber(secondMetric.value);
}

function buildVisibleSummary(result) {
  const boxConfig = BOX_TYPES[activeBoxType];
  const measure = getActiveBoxMeasure(result.excessUnits);
  const boxSummary = `${boxConfig.label}(${formatNumber(measure.capacity)} ${measure.unitLabel})`;
  const excessSummary =
    `Excess ${formatNumber(measure.excess)}/${formatNumber(measure.capacity)} ${measure.unitLabel}`;

  if (activeInputType === "pairs") {
    return (
      `Pairs ${formatNumber(result.pairs)} = Units ${formatNumber(result.units)} / ` +
      `${boxSummary} ${formatNumber(result.boxes)} / ${excessSummary} / ` +
      `Dozen ${formatNumber(result.dozens)}`
    );
  }

  if (activeInputType === "dozen") {
    return (
      `Dozen ${formatNumber(result.dozens)} = Units ${formatNumber(result.units)} / ` +
      `${boxSummary} ${formatNumber(result.boxes)} / ${excessSummary} / ` +
      `Pair ${formatNumber(result.pairs)}`
    );
  }

  return (
    `Units ${formatNumber(result.units)} = ${boxSummary} ${formatNumber(result.boxes)} / ` +
    `${excessSummary} / Dozen ${formatNumber(result.dozens)} / ` +
    `Pair ${formatNumber(result.pairs)}`
  );
}

function renderResults() {
  const boxConfig = BOX_TYPES[activeBoxType];
  const result = calculate(currentUnits, activeBoxType);

  summaryOutput.classList.remove("is-invalid");
  copyButton.disabled = false;
  boxResult.textContent = formatNumber(result.boxes);
  renderExcessMeasure(result.excessUnits);
  renderResultMetrics(result);
  renderFullBoxes(result.boxes);
  renderExcessBox(result.excessUnits, boxConfig.unitCount);

  lastSummary = [
    `Units\t${formatNumber(result.units)}`,
    `Box\t${formatNumber(result.boxes)}`,
    `Excess units\t${formatNumber(result.excessUnits)}`,
    `Dozen\t${formatNumber(result.dozens)}`,
    `Pair\t${formatNumber(result.pairs)}`,
  ].join("\n");

  summaryOutput.textContent = buildVisibleSummary(result);
  copyBuffer.value = lastSummary;
}

function renderInvalidResults(message) {
  const boxConfig = BOX_TYPES[activeBoxType];
  const [firstMetric, secondMetric] = getResultMetrics(calculate(0), activeInputType);

  boxResult.textContent = "—";
  excessResult.textContent = "—";
  const measure = getActiveBoxMeasure();
  excessCapacity.textContent = formatNumber(measure.capacity);
  excessUnitLabel.textContent = measure.unitLabel;
  metricOneLabel.textContent = firstMetric.label;
  metricOneResult.textContent = "—";
  metricTwoLabel.textContent = secondMetric.label;
  metricTwoResult.textContent = "—";
  renderFullBoxes(0);
  renderExcessBox(0, boxConfig.unitCount);
  summaryOutput.classList.add("is-invalid");
  summaryOutput.textContent = message;
  lastSummary = "";
  copyBuffer.value = "";
  copyBuffer.hidden = true;
  copyButton.disabled = true;
}

function clearInputError() {
  quantityInput.removeAttribute("aria-invalid");
  quantityInput.setCustomValidity("");
  quantityError.textContent = "";
}

function showInputError(message) {
  quantityInput.setAttribute("aria-invalid", "true");
  quantityInput.setCustomValidity(message);
  quantityError.textContent = message;
}

function processQuantityInput() {
  const parsed = parseInputToUnits(quantityInput.value, activeInputType);

  if (!parsed.isValid) {
    showInputError(parsed.message);
    renderInvalidResults(parsed.message);
    return false;
  }

  clearInputError();
  currentUnits = parsed.units;

  renderResults();
  return true;
}

function updateInputControls() {
  const config = INPUT_TYPES[activeInputType];
  const quickSteps = getQuickSteps(activeInputType, activeBoxType);
  quantityLabel.textContent = config.label;
  quantityInput.name = activeInputType;
  quantityInput.step = String(config.step);
  quantityInput.inputMode = config.inputMode;
  quickActions.setAttribute("aria-label", `${config.label} 빠른 조정`);

  quickActionButtons.forEach((button, index) => {
    const step = quickSteps[index];
    button.dataset.step = String(step);
    button.textContent = formatSignedNumber(step);
    button.setAttribute("aria-label", `${config.label} ${formatSignedNumber(step)}`);
  });
}

function updateBoxControls() {
  const config = BOX_TYPES[activeBoxType];

  activeBoxTypeBadge.textContent = `${config.label} · ${config.unitCount} units`;
  boxOverview.setAttribute("aria-label", `${config.label} ${config.unitCount} units 기준 Box 요약`);
  boxRule.textContent =
    `1 ${config.label} = ${config.unitCount} units = ` +
    `${config.unitCount * INPUT_TYPES.pairs.inputPerUnit} pairs = ` +
    `${config.unitCount * INPUT_TYPES.dozen.inputPerUnit} dozen`;
}

function copyTextWithTextArea(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "1px";
  textArea.style.height = "1px";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";
  document.body.append(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);
  const didCopy = document.execCommand("copy");
  textArea.remove();

  return didCopy;
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy copy command for older or restricted browsers.
    }
  }

  if (copyTextWithTextArea(text)) {
    return;
  }

  throw new Error("Copy command was not available.");
}

function showCopyStatus(message) {
  copyStatus.textContent = message;
  window.clearTimeout(copyStatusTimer);
  copyStatusTimer = window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
}

calculatorForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

quickActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const rawInputValue = Number(quantityInput.value);
    const currentInputValue = Number.isFinite(rawInputValue) ? rawInputValue : 0;
    const nextValue = Math.max(0, currentInputValue + Number(button.dataset.step));
    quantityInput.value = formatInputValue(nextValue);
    processQuantityInput();
    quantityInput.focus();
  });
});

inputTypeControls.forEach((control) => {
  control.addEventListener("change", () => {
    if (!control.checked) {
      return;
    }

    activeInputType = control.value;
    updateInputControls();
    processQuantityInput();
  });
});

boxTypeControls.forEach((control) => {
  control.addEventListener("change", () => {
    if (!control.checked) {
      return;
    }

    activeBoxType = control.value;
    updateBoxControls();
    updateInputControls();
    processQuantityInput();
  });
});

quantityInput.addEventListener("input", () => processQuantityInput());
quantityInput.addEventListener("blur", () => processQuantityInput());

resetButton.addEventListener("click", () => {
  currentUnits = DEFAULT_UNITS;
  quantityInput.value = formatInputValue(convertUnitsToInput(currentUnits, activeInputType));
  copyBuffer.hidden = true;
  clearInputError();
  renderResults();
  quantityInput.focus();
});

copyButton.addEventListener("click", async () => {
  try {
    await copyText(lastSummary);
    copyBuffer.hidden = true;
    showCopyStatus("복사 완료");
  } catch {
    copyBuffer.hidden = false;
    copyBuffer.focus();
    copyBuffer.select();
    copyBuffer.setSelectionRange(0, copyBuffer.value.length);
    showCopyStatus("복사할 결과가 선택되었습니다");
  }
});

updateBoxControls();
updateInputControls();
renderResults();
