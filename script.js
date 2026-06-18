const unitInput = document.querySelector("#unit-input");
const boxResult = document.querySelector("#box-result");
const excessResult = document.querySelector("#excess-result");
const dozenResult = document.querySelector("#dozen-result");
const pairResult = document.querySelector("#pair-result");
const fullBoxRow = document.querySelector("#full-box-row");
const excessUnitGrid = document.querySelector("#excess-unit-grid");
const summaryOutput = document.querySelector("#summary-output");
const copyButton = document.querySelector("#copy-button");
const resetButton = document.querySelector("#reset-button");
const copyStatus = document.querySelector("#copy-status");
const copyBuffer = document.querySelector("#copy-buffer");

const BOX_UNIT_COUNT = 12;
const DOZEN_PER_UNIT = 0.5;
const PAIR_PER_UNIT = 6;
const DEFAULT_UNITS = 0;

let lastSummary = "";
let copyStatusTimer;

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function parseUnits(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.trunc(numeric);
}

function calculate(units) {
  return {
    units,
    boxes: Math.floor(units / BOX_UNIT_COUNT),
    excessUnits: units % BOX_UNIT_COUNT,
    dozens: units * DOZEN_PER_UNIT,
    pairs: units * PAIR_PER_UNIT,
  };
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

function renderExcessBox(excessUnits) {
  excessUnitGrid.replaceChildren();

  for (let index = 0; index < BOX_UNIT_COUNT; index += 1) {
    const unit = document.createElement("span");
    unit.className = `unit-token${index < excessUnits ? " is-filled" : ""}`;
    excessUnitGrid.append(unit);
  }
}

function renderResults() {
  const normalizedUnits = parseUnits(unitInput.value);

  if (unitInput.value !== "" && String(normalizedUnits) !== unitInput.value) {
    unitInput.value = normalizedUnits;
  }

  const result = calculate(normalizedUnits);

  boxResult.textContent = formatNumber(result.boxes);
  excessResult.textContent = formatNumber(result.excessUnits);
  dozenResult.textContent = formatNumber(result.dozens);
  pairResult.textContent = formatNumber(result.pairs);
  renderFullBoxes(result.boxes);
  renderExcessBox(result.excessUnits);

  lastSummary = [
    `Units\t${formatNumber(result.units)}`,
    `Box\t${formatNumber(result.boxes)}`,
    `Excess units\t${formatNumber(result.excessUnits)}`,
    `Dozen\t${formatNumber(result.dozens)}`,
    `Pair\t${formatNumber(result.pairs)}`,
  ].join("\n");

  summaryOutput.textContent =
    `Units ${formatNumber(result.units)} = Box ${formatNumber(result.boxes)} / ` +
    `Excess ${formatNumber(result.excessUnits)} / Dozen ${formatNumber(result.dozens)} / ` +
    `Pair ${formatNumber(result.pairs)}`;
  copyBuffer.value = lastSummary;
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
  if (copyTextWithTextArea(text)) {
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
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

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextValue = parseUnits(unitInput.value) + Number(button.dataset.step);
    unitInput.value = Math.max(0, nextValue);
    renderResults();
    unitInput.focus();
  });
});

unitInput.addEventListener("input", renderResults);

resetButton.addEventListener("click", () => {
  unitInput.value = DEFAULT_UNITS;
  renderResults();
  unitInput.focus();
});

copyButton.addEventListener("click", async () => {
  try {
    await copyText(lastSummary);
    showCopyStatus("복사 완료");
  } catch {
    copyBuffer.hidden = false;
    copyBuffer.focus();
    copyBuffer.select();
    copyBuffer.setSelectionRange(0, copyBuffer.value.length);
    showCopyStatus("복사할 결과가 선택되었습니다");
  }
});

renderResults();
